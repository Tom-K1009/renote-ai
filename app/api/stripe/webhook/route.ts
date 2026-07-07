import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeClient } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/server";
import { resolvePlanByPriceId, type BillingPlan } from "../../../lib/plans";

function getCustomerId(object: Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice) {
  const customer = object.customer;
  return typeof customer === "string" ? customer : customer?.id ?? null;
}

function getSubscriptionId(object: Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice) {
  if ("subscription" in object) {
    const subscription = object.subscription;
    return typeof subscription === "string" ? subscription : subscription?.id ?? null;
  }

  return object.id;
}

function getPlanFromSubscription(subscription: Stripe.Subscription): BillingPlan {
  const metadataPlan = subscription.metadata?.plan as BillingPlan | undefined;
  if (metadataPlan) return metadataPlan;

  return resolvePlanByPriceId(subscription.items.data[0]?.price.id);
}

async function updateSubscriptionState(params: {
  customerId: string | null;
  subscriptionId: string | null;
  plan: BillingPlan;
  status: string;
  active: boolean;
  currentPeriodEnd?: number | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin || !params.customerId) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", params.customerId)
    .maybeSingle();

  if (!profile?.id) return;

  await admin
    .from("profiles")
    .update({
      plan: params.active ? params.plan : "free",
      is_suspended: false,
      suspended_reason: null
    })
    .eq("id", profile.id);

  await admin.from("tsumugu_subscriptions").upsert({
    user_id: profile.id,
    stripe_customer_id: params.customerId,
    stripe_subscription_id: params.subscriptionId,
    plan: params.active ? params.plan : "free",
    status: params.status,
    current_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null
  });
}

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const plan = (session.metadata?.plan as BillingPlan | undefined) ?? "pro";
    await updateSubscriptionState({
      customerId: getCustomerId(session),
      subscriptionId: getSubscriptionId(session),
      plan,
      status: "active",
      active: true
    });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const status = subscription.status;
    const active = status === "active" || status === "trialing";
    await updateSubscriptionState({
      customerId: getCustomerId(subscription),
      subscriptionId: subscription.id,
      plan: getPlanFromSubscription(subscription),
      status: active ? status : "inactive",
      active,
      currentPeriodEnd: subscription.current_period_end
    });
  }

  if (
    event.type === "invoice.payment_succeeded" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getSubscriptionId(invoice);
    let plan: BillingPlan = "free";
    let currentPeriodEnd: number | null = null;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      plan = getPlanFromSubscription(subscription);
      currentPeriodEnd = subscription.current_period_end;
    }

    await updateSubscriptionState({
      customerId: getCustomerId(invoice),
      subscriptionId,
      plan,
      status: event.type === "invoice.payment_succeeded" ? "active" : "payment_failed",
      active: event.type === "invoice.payment_succeeded",
      currentPeriodEnd
    });
  }

  return NextResponse.json({ received: true });
}
