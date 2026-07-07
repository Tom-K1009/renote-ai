import { NextResponse } from "next/server";
import { createStripeClient } from "../../../lib/stripe";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient
} from "../../../lib/supabase/server";
import {
  billingPlans,
  getPriceIdForPlan,
  planConfigs,
  type BillingPlan
} from "../../../lib/plans";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const admin = createSupabaseAdminClient();
  const body = (await request.json().catch(() => ({}))) as { plan?: unknown };
  const requestedPlan: BillingPlan = billingPlans.includes(body.plan as BillingPlan)
    ? (body.plan as BillingPlan)
    : "pro";
  const priceId = getPriceIdForPlan(requestedPlan);

  if (!stripe || !admin || !priceId) {
    return NextResponse.json(
      { error: "StripeまたはSupabaseの環境変数が未設定です。" },
      { status: 500 }
    );
  }

  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const userClient = accessToken ? createSupabaseUserClient(accessToken) : null;

  if (!userClient) {
    return NextResponse.json(
      { error: "ログインが必要です。" },
      { status: 401 }
    );
  }

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { error: "ログインが必要です。" },
      { status: 401 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | null | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        supabaseUserId: user.id
      }
    });
    customerId = customer.id;

    await admin.from("profiles").upsert({
      id: user.id,
      email: user.email,
      stripe_customer_id: customerId
    });
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata: {
      supabaseUserId: user.id,
      plan: requestedPlan
    },
    subscription_data: {
      metadata: {
        supabaseUserId: user.id,
        plan: requestedPlan
      }
    }
  });

  return NextResponse.json({
    url: session.url,
    plan: requestedPlan,
    planName: planConfigs[requestedPlan].name
  });
}
