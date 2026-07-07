import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  assistantModes,
  modelOptions,
  polishAdjustments,
  purposeOptions,
  rewriteDirections,
  writingStyles,
  type AssistantMode,
  type ImprovementReport,
  type PolishAdjustment,
  type Purpose,
  type RefineRequest,
  type TsumuguScore,
  type RewriteDirection,
  type UsageStatus,
  type WritingStyle
} from "../../lib/options";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient
} from "../../lib/supabase/server";
import { getPlanConfig, normalizePlan, type BillingPlan } from "../../lib/plans";

const maxInputLength = 12000;
const burstWindowMinutes = 1;
const burstRequestLimit = 12;
const ipBurstRequestLimit = 30;

function isOneOf<T extends readonly string[]>(
  options: T,
  value: unknown
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function resolveModel(value: unknown) {
  if (isOneOf(modelOptions, value)) return value;
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

function resolveTargetLength(mode: AssistantMode, value: unknown) {
  if (mode !== "作成する") return null;
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(4000, Math.max(40, Math.round(value)));
}

function normalizeScore(score: Partial<TsumuguScore> | null | undefined): TsumuguScore {
  const safe = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, Math.round(value)))
      : fallback;

  const normalized = {
    naturalness: safe(score?.naturalness, 82),
    readability: safe(score?.readability, 82),
    logic: safe(score?.logic, 78),
    politeness: safe(score?.politeness, 80),
    clarity: safe(score?.clarity, 82),
    aiLikeness: safe(score?.aiLikeness, 22)
  };

  return {
    ...normalized,
    total: safe(
      score?.total,
      Math.round(
        (normalized.naturalness +
          normalized.readability +
          normalized.logic +
          normalized.politeness +
          normalized.clarity +
          (100 - normalized.aiLikeness)) /
          6
      )
    )
  };
}

function parseModelOutput(raw: string, includeScore: boolean) {
  try {
    const parsed = JSON.parse(raw) as {
      result?: unknown;
      improvements?: unknown;
      score?: Partial<TsumuguScore>;
    };

    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements
          .filter((item): item is ImprovementReport => {
            return (
              typeof item === "object" &&
              item !== null &&
              "title" in item &&
              "description" in item &&
              typeof item.title === "string" &&
              typeof item.description === "string"
            );
          })
          .slice(0, 5)
      : [];

    return {
      result: typeof parsed.result === "string" ? parsed.result.trim() : raw.trim(),
      improvements,
      score: includeScore ? normalizeScore(parsed.score) : null
    };
  } catch {
    return {
      result: raw.trim(),
      improvements: [
        {
          title: "読みやすさを調整",
          description: "文章の意味を保ちながら、自然に読める流れへ整えました。"
        }
      ],
      score: includeScore ? normalizeScore(null) : null
    };
  }
}

function buildPrompt(payload: RefineRequest, includeScore: boolean) {
  const common = [
    "あなたはTSUMUGUの日本語ライティングアシスタントです。",
    "TSUMUGUのブランドコンセプトは「あなたの言葉を、そのまま、もっと伝わる文章へ。」です。",
    "AIが主役ではなく、ユーザーの言葉が主役になるように支援してください。",
    "",
    `用途: ${payload.purpose}`,
    `文体: ${payload.writingStyle}`,
    `AIっぽさ除去: ${payload.reduceAiTone ? "有効" : "通常"}`
  ];

  const modeRules: string[] = [];

  if (payload.mode === "整える") {
    modeRules.push(
      "モード: 整える",
      "目的: 自分の文章を自然で読みやすくする。",
      "厳守ルール:",
      "- 意味を変えない",
      "- 情報を追加しない",
      "- 情報を削除しない",
      "- AIっぽさをなくす",
      "- 文体だけ調整する",
      "- 文字数を指定して調整しない",
      `調整項目: ${(payload.polishAdjustments ?? []).join("、") || "読みやすさ改善"}`
    );
  }

  if (payload.mode === "書き直す") {
    modeRules.push(
      "モード: 書き直す",
      "目的: 同じ内容を別の伝え方へ変更する。",
      "ルール:",
      "- 情報は基本的に維持する",
      "- 伝え方、順序、文体は変更してよい",
      "- 必要最低限の補足だけ許可する",
      "- 元の意図と主張は変えない",
      `書き直し方向: ${payload.rewriteDirection ?? "もっと自然"}`
    );
  }

  if (payload.mode === "作成する") {
    const lengthRule = payload.targetLength
      ? `指定文字数: ${payload.targetLength}文字。できるだけ${Math.round(
          payload.targetLength * 0.95
        )}文字から${Math.round(payload.targetLength * 1.05)}文字に収める。`
      : "文字数指定なし。用途に対して自然な長さにする。";

    modeRules.push(
      "モード: 作成する",
      "目的: メモや箇条書きから文章を作る。",
      "ルール:",
      "- 入力されたメモ、箇条書き、キーワードをもとに文章化する",
      "- AIによる自然な補足を許可する",
      "- ただし根拠のない断定や事実の捏造はしない",
      "- ユーザーの意図を中心に文章を構成する",
      lengthRule
    );
  }

  return [
    ...common,
    "",
    ...modeRules,
    "",
    "必ず次のJSONだけを返してください。",
    `{
  "result": "出力文章",
  "improvements": [
    { "title": "改善タイトル", "description": "何を改善したか" }
  ]${includeScore ? `,
  "score": {
    "total": 0,
    "naturalness": 0,
    "readability": 0,
    "logic": 0,
    "politeness": 0,
    "clarity": 0,
    "aiLikeness": 0
  }` : ""}
}`
  ].join("\n");
}

async function getUsageStatus(accessToken: string | null): Promise<{
  userId: string | null;
  email: string | null;
  plan: BillingPlan;
  usage: UsageStatus;
  blocked: boolean;
  blockedReason?: string;
}> {
  if (!accessToken) {
    return {
      userId: null,
      email: null,
      plan: "free",
      usage: { plan: "guest", usedToday: 0, dailyLimit: null, remaining: null },
      blocked: true,
      blockedReason: "ログインが必要です。Googleログイン後に利用できます。"
    };
  }

  const userClient = createSupabaseUserClient(accessToken);
  const adminClient = createSupabaseAdminClient();

  if (!userClient || !adminClient) {
    return {
      userId: null,
      email: null,
      plan: "free",
      usage: { plan: "guest", usedToday: 0, dailyLimit: null, remaining: null },
      blocked: true,
      blockedReason: "Supabaseのサーバー設定が未完了です。"
    };
  }

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user) {
    return {
      userId: null,
      email: null,
      plan: "free",
      usage: { plan: "guest", usedToday: 0, dailyLimit: null, remaining: null },
      blocked: true,
      blockedReason: "ログインが必要です。Googleログイン後に利用できます。"
    };
  }

  await adminClient.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null
  });

  const { data: profile } = await adminClient
    .from("profiles")
    .select("plan, is_suspended, suspended_reason")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(profile?.plan);
  const config = getPlanConfig(plan);
  if (profile?.is_suspended) {
    return {
      userId: user.id,
      email: user.email ?? null,
      plan,
      usage: {
        plan,
        usedToday: 0,
        dailyLimit: config.dailyLimit,
        remaining: 0,
        softLimit: config.softLimit
      },
      blocked: true,
      blockedReason:
        profile.suspended_reason ??
        "異常利用を検知したため、一時的に利用を停止しています。"
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await adminClient
    .from("tsumugu_usage")
    .select("count")
    .eq("user_id", user.id)
    .eq("used_on", today)
    .maybeSingle();

  const usedToday = usageRow?.count ?? 0;
  const dailyLimit = config.dailyLimit;
  const remaining = dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);
  const burstSince = new Date(Date.now() - burstWindowMinutes * 60 * 1000).toISOString();
  const { count: burstCount } = await adminClient
    .from("tsumugu_api_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", burstSince);

  if ((burstCount ?? 0) >= burstRequestLimit) {
    return {
      userId: user.id,
      email: user.email ?? null,
      plan,
      usage: { plan, usedToday, dailyLimit, remaining, softLimit: config.softLimit },
      blocked: true,
      blockedReason:
        "短時間にアクセスが集中しています。少し時間をおいて再度お試しください。"
    };
  }

  if (usedToday >= dailyLimit * 2) {
    await adminClient
      .from("profiles")
      .update({
        is_suspended: true,
        suspended_reason: "利用回数が通常範囲を大きく超えたため自動停止しました。"
      })
      .eq("id", user.id);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    plan,
    usage: { plan, usedToday, dailyLimit, remaining, softLimit: config.softLimit },
    blocked: !config.softLimit && usedToday >= dailyLimit
  };
}

function hashIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const realIp = request.headers.get("x-real-ip") ?? "";
  const source = forwardedFor.split(",")[0]?.trim() || realIp || "unknown";
  return createHash("sha256").update(source).digest("hex").slice(0, 32);
}

function estimateTokens(input: string, output: string) {
  return Math.ceil((input.length + output.length) / 2);
}

function estimateCostJpy(tokens: number, highQuality: boolean) {
  const yenPerThousandTokens = highQuality ? 1.8 : 0.35;
  return Number(((tokens / 1000) * yenPerThousandTokens).toFixed(4));
}

async function logApiEvent(params: {
  request: Request;
  userId: string | null;
  plan: BillingPlan;
  payload?: Partial<RefineRequest>;
  inputChars?: number;
  outputChars?: number;
  estimatedTokens?: number;
  estimatedCostJpy?: number;
  responseMs?: number;
  status: "success" | "blocked" | "error";
  errorCode?: string;
}) {
  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return;

  await adminClient.from("tsumugu_api_events").insert({
    user_id: params.userId,
    plan: params.plan,
    endpoint: "/api/refine",
    mode: params.payload?.mode,
    purpose: params.payload?.purpose,
    writing_style: params.payload?.writingStyle,
    target_length: params.payload?.targetLength ?? null,
    input_chars: params.inputChars ?? 0,
    output_chars: params.outputChars ?? 0,
    estimated_tokens: params.estimatedTokens ?? 0,
    estimated_cost_jpy: params.estimatedCostJpy ?? 0,
    response_ms: params.responseMs,
    status: params.status,
    error_code: params.errorCode,
    ip_hash: hashIp(params.request),
    user_agent: params.request.headers.get("user-agent")
  });
}

async function persistResult(params: {
  userId: string | null;
  text: string;
  payload: RefineRequest;
  result: string;
  improvements: ImprovementReport[];
  score: TsumuguScore | null;
  plan: BillingPlan;
}) {
  if (!params.userId) return;

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return;

  const today = new Date().toISOString().slice(0, 10);

  await adminClient.rpc("increment_tsumugu_usage", {
    target_user_id: params.userId,
    target_day: today,
    target_plan: params.plan
  });

  await adminClient.from("tsumugu_histories").insert({
    user_id: params.userId,
    mode: params.payload.mode,
    source: params.text,
    result: params.result,
    purpose: params.payload.purpose,
    tone: params.payload.rewriteDirection ?? params.payload.mode,
    writing_style: params.payload.writingStyle,
    target_length: params.payload.targetLength,
    reduce_ai_tone: params.payload.reduceAiTone,
    improvements: params.improvements,
    score: params.score
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let usageState: Awaited<ReturnType<typeof getUsageStatus>> | null = null;
  let payloadForLog: Partial<RefineRequest> | undefined;
  let inputCharsForLog = 0;
  try {
    const body = (await request.json()) as Partial<RefineRequest>;
    const mode = isOneOf(assistantModes, body.mode) ? body.mode : null;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const purpose = isOneOf(purposeOptions, body.purpose) ? body.purpose : null;
    const writingStyle = isOneOf(writingStyles, body.writingStyle)
      ? body.writingStyle
      : null;
    const rewriteDirection = isOneOf(rewriteDirections, body.rewriteDirection)
      ? body.rewriteDirection
      : undefined;
    const selectedAdjustments = Array.isArray(body.polishAdjustments)
      ? body.polishAdjustments.filter((item): item is PolishAdjustment =>
          isOneOf(polishAdjustments, item)
        )
      : [];
    const reduceAiTone = Boolean(body.reduceAiTone);
    const highQuality = Boolean(body.highQuality);

    if (!mode) {
      return NextResponse.json(
        { error: "モードを選択してください。" },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "入力文を入力してください。" },
        { status: 400 }
      );
    }

    if (text.length > maxInputLength) {
      return NextResponse.json(
        { error: "入力文が長すぎます。12,000文字以内にしてください。" },
        { status: 400 }
      );
    }

    if (!purpose || !writingStyle) {
      return NextResponse.json(
        { error: "用途と文体を選択してください。" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が設定されていません。" },
        { status: 500 }
      );
    }

    const accessToken =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
    usageState = await getUsageStatus(accessToken);
    const adminClient = createSupabaseAdminClient();
    const currentIpHash = hashIp(request);

    if (adminClient) {
      const ipBurstSince = new Date(
        Date.now() - burstWindowMinutes * 60 * 1000
      ).toISOString();
      const { count: ipBurstCount } = await adminClient
        .from("tsumugu_api_events")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", currentIpHash)
        .gte("created_at", ipBurstSince);

      if ((ipBurstCount ?? 0) >= ipBurstRequestLimit) {
        await logApiEvent({
          request,
          userId: usageState.userId,
          plan: usageState.plan,
          payload: { mode, purpose, writingStyle },
          inputChars: text.length,
          responseMs: Date.now() - startedAt,
          status: "blocked",
          errorCode: "ip_rate_limited"
        });
        return NextResponse.json(
          {
            error:
              "短時間にアクセスが集中しています。時間をおいて再度お試しください。",
            usage: usageState.usage
          },
          { status: 429 }
        );
      }
    }

    const config = getPlanConfig(usageState.plan);
    const isPaid = usageState.plan !== "free";
    const canUseHighQuality = config.canUseHighQuality;

    if (usageState.blocked) {
      await logApiEvent({
        request,
        userId: usageState.userId,
        plan: usageState.plan,
        payload: { mode, purpose, writingStyle },
        inputChars: text.length,
        responseMs: Date.now() - startedAt,
        status: "blocked",
        errorCode: "usage_blocked"
      });
      return NextResponse.json(
        {
          error:
            usageState.blockedReason ??
            "本日の利用回数に達しました。StudentまたはProでさらに利用できます。",
          usage: usageState.usage
        },
        { status: usageState.userId ? 402 : 401 }
      );
    }

    if (mode === "作成する" && !config.canCreate) {
      return NextResponse.json(
        {
          error: "「作成する」と文字数指定はStudent以上のプランで利用できます。",
          usage: usageState.usage
        },
        { status: 403 }
      );
    }

    const includeScore = config.canUseScore;
    const payload: RefineRequest = {
      mode,
      text,
      purpose,
      writingStyle,
      rewriteDirection,
      polishAdjustments: selectedAdjustments,
      targetLength: resolveTargetLength(mode, body.targetLength),
      reduceAiTone,
      highQuality: highQuality && canUseHighQuality,
      model: resolveModel(body.model)
    };
    payloadForLog = payload;
    inputCharsForLog = text.length;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: payload.model ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: buildPrompt(payload, includeScore) },
        { role: "user", content: `入力文:\n${payload.text}` }
      ],
      temperature: mode === "作成する" ? 0.55 : 0.35
    });

    const raw = response.output_text?.trim();

    if (!raw) {
      return NextResponse.json(
        { error: "文章を生成できませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    const parsed = parseModelOutput(raw, includeScore);
    const outputChars = parsed.result.length;
    const estimatedTokens = estimateTokens(text, parsed.result);
    const estimatedCostJpy = estimateCostJpy(
      estimatedTokens,
      Boolean(payload.highQuality)
    );

    await persistResult({
      userId: usageState.userId,
      text,
      payload,
      result: parsed.result,
      improvements: parsed.improvements,
      score: parsed.score,
      plan: usageState.plan
    });

    await logApiEvent({
      request,
      userId: usageState.userId,
      plan: usageState.plan,
      payload,
      inputChars: text.length,
      outputChars,
      estimatedTokens,
      estimatedCostJpy,
      responseMs: Date.now() - startedAt,
      status: "success"
    });

    const nextUsage: UsageStatus =
      usageState.usage.dailyLimit !== null
        ? {
            ...usageState.usage,
            usedToday: usageState.usage.usedToday + 1,
            remaining:
              usageState.usage.dailyLimit === null
                ? null
                : Math.max(0, usageState.usage.dailyLimit - usageState.usage.usedToday - 1)
          }
        : usageState.usage;

    return NextResponse.json({
      result: parsed.result,
      improvements: parsed.improvements,
      score: parsed.score,
      usage: nextUsage
    });
  } catch (error) {
    console.error(error);
    await logApiEvent({
      request,
      userId: usageState?.userId ?? null,
      plan: usageState?.plan ?? "free",
      payload: payloadForLog,
      inputChars: inputCharsForLog,
      responseMs: Date.now() - startedAt,
      status: "error",
      errorCode:
        error instanceof Error ? error.name || "openai_error" : "unknown_error"
    });
    return NextResponse.json(
      { error: "現在AIが混み合っています。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
