import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient
} from "../../lib/supabase/server";
import { normalizePlan } from "../../lib/plans";

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  const body = (await request.json().catch(() => ({}))) as {
    eventName?: unknown;
    properties?: unknown;
  };
  const eventName =
    typeof body.eventName === "string" ? body.eventName.trim().slice(0, 80) : "";

  if (!eventName) {
    return NextResponse.json({ error: "eventName is required." }, { status: 400 });
  }

  const accessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  let userId: string | null = null;
  let plan = "guest";

  if (accessToken) {
    const userClient = createSupabaseUserClient(accessToken);
    const { data } = userClient
      ? await userClient.auth.getUser()
      : { data: { user: null } };
    userId = data.user?.id ?? null;

    if (userId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .maybeSingle();
      plan = normalizePlan(profile?.plan);
    }
  }

  await admin.from("tsumugu_analytics_events").insert({
    user_id: userId,
    event_name: eventName,
    plan,
    properties:
      typeof body.properties === "object" && body.properties !== null
        ? body.properties
        : {}
  });

  return NextResponse.json({ ok: true });
}
