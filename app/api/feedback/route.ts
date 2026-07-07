import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: unknown;
    email?: unknown;
    message?: unknown;
  };

  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "内容を入力してください。" },
      { status: 400 }
    );
  }

  console.info("TSUMUGU feedback", {
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    message
  });

  return NextResponse.json({ ok: true });
}
