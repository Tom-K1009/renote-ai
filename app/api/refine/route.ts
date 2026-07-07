import OpenAI from "openai";
import { NextResponse } from "next/server";
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
  type RenoteScore,
  type RewriteDirection,
  type UsageStatus,
  type WritingStyle
} from "../../lib/options";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient
} from "../../lib/supabase/server";

const maxInputLength = 12000;
const freeDailyLimit = 10;

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

function normalizeScore(score: Partial<RenoteScore> | null | undefined): RenoteScore {
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
      score?: Partial<RenoteScore>;
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
    "あなたはRenote AIの日本語ライティングアシスタントです。",
    "Renote AIのブランドコンセプトは「あなたの言葉を、そのまま、もっと伝わる文章へ。」です。",
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
  usage: UsageStatus;
  blocked: boolean;
}> {
  if (!accessToken) {
    return {
      userId: null,
      usage: { plan: "guest", usedToday: 0, dailyLimit: null, remaining: null },
      blocked: false
    };
  }

  const userClient = createSupabaseUserClient(accessToken);
  const adminClient = createSupabaseAdminClient();

  if (!userClient || !adminClient) {
    return {
      userId: null,
      usage: { plan: "guest", usedToday: 0, dailyLimit: null, remaining: null },
      blocked: false
    };
  }

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user) {
    return {
      userId: null,
      usage: { plan: "guest", usedToday: 0, dailyLimit: null, remaining: null },
      blocked: false
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
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan === "pro" ? "pro" : "free";
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await adminClient
    .from("renote_usage")
    .select("count")
    .eq("user_id", user.id)
    .eq("used_on", today)
    .maybeSingle();

  const usedToday = usageRow?.count ?? 0;
  const dailyLimit = plan === "pro" ? null : freeDailyLimit;
  const remaining = dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);

  return {
    userId: user.id,
    usage: { plan, usedToday, dailyLimit, remaining },
    blocked: plan === "free" && usedToday >= freeDailyLimit
  };
}

async function persistResult(params: {
  userId: string | null;
  text: string;
  payload: RefineRequest;
  result: string;
  improvements: ImprovementReport[];
  score: RenoteScore | null;
}) {
  if (!params.userId) return;

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return;

  const today = new Date().toISOString().slice(0, 10);

  await adminClient.rpc("increment_renote_usage", {
    target_user_id: params.userId,
    target_day: today
  });

  await adminClient.from("renote_histories").insert({
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
    const usageState = await getUsageStatus(accessToken);
    const isPro = usageState.usage.plan === "pro";

    if (usageState.blocked) {
      return NextResponse.json(
        {
          error: "無料プランの本日分10回を使い切りました。Proプランでは無制限に利用できます。",
          usage: usageState.usage
        },
        { status: 402 }
      );
    }

    if (mode === "作成する" && !isPro) {
      return NextResponse.json(
        {
          error: "「作成する」と文字数指定はProプランで利用できます。",
          usage: usageState.usage
        },
        { status: 403 }
      );
    }

    const includeScore = isPro;
    const payload: RefineRequest = {
      mode,
      text,
      purpose,
      writingStyle,
      rewriteDirection,
      polishAdjustments: selectedAdjustments,
      targetLength: resolveTargetLength(mode, body.targetLength),
      reduceAiTone,
      highQuality: highQuality && isPro,
      model: resolveModel(body.model)
    };

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
    await persistResult({
      userId: usageState.userId,
      text,
      payload,
      result: parsed.result,
      improvements: parsed.improvements,
      score: parsed.score
    });

    const nextUsage: UsageStatus =
      usageState.usage.plan === "free"
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
    return NextResponse.json(
      { error: "エラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
