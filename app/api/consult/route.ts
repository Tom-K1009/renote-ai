import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient
} from "../../lib/supabase/server";
import { getPlanConfig, normalizePlan } from "../../lib/plans";

async function canUseConsult(request: Request) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!token) return { ok: false, userId: null, plan: "guest" };

  const userClient = createSupabaseUserClient(token);
  const adminClient = createSupabaseAdminClient();
  if (!userClient || !adminClient) return { ok: false, userId: null, plan: "guest" };

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user) return { ok: false, userId: null, plan: "guest" };

  const { data } = await adminClient
    .from("profiles")
    .select("plan, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  const plan = normalizePlan(data?.plan);
  return {
    ok: Boolean(!data?.is_suspended && getPlanConfig(plan).canConsult),
    userId: user.id,
    plan
  };
}

export async function POST(request: Request) {
  try {
    const access = await canUseConsult(request);
    if (!access.ok) {
      return NextResponse.json(
        { error: "AI相談はStudent以上のプランで利用できます。" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      text?: unknown;
      question?: unknown;
    };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!text || !question) {
      return NextResponse.json(
        { error: "相談したい文章と質問を入力してください。" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が設定されていません。" },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "あなたは日本語文章の相談役です。文章を勝手に書き換えず、ユーザーの質問に対して具体的で短い助言を返してください。失礼さ、読みやすさ、説得力、短縮余地などを自然な日本語で評価します。"
        },
        {
          role: "user",
          content: `文章:\n${text}\n\n質問:\n${question}`
        }
      ],
      temperature: 0.35
    });

    return NextResponse.json({
      answer: response.output_text?.trim() ?? "回答を生成できませんでした。"
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "相談中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
