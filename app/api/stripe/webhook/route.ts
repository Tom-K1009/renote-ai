import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeClient } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const admin = createSupabaseAdminClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !admin || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhookの環境変数が未設定です。" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "署名がありません。" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "署名検証に失敗しました。" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const customerId =
      typeof object.customer === "string" ? object.customer : object.customer?.id;
    const subscriptionId =
      "subscription" in object && typeof object.subscription === "string"
        ? object.subscription
        : "id" in object
          ? object.id
          : null;

    if (customerId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (profile?.id) {
        const status = "status" in object ? object.status : null;
        const isActive =
          event.type === "checkout.session.completed" ||
          status === "active" ||
          status === "trialing";

        await admin.from("profiles").update({
          plan: isActive ? "pro" : "free"
        }).eq("id", profile.id);

        await admin.from("tsumugu_subscriptions").upsert({
          user_id: profile.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: isActive ? "active" : "inactive"
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
