import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: unknown;
    email?: unknown;
    category?: unknown;
    message?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "その他";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "内容を入力してください。" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    await admin.from("tsumugu_feedback").insert({ name, email, category, message });
  } else {
    console.info("TSUMUGU feedback", { name, email, category, message });
  }

  return NextResponse.json({ ok: true });
}
