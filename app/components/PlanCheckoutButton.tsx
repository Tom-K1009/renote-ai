"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import type { BillingPlan } from "../lib/plans";

export function PlanCheckoutButton({
  plan,
  children,
  variant = "dark"
}: {
  plan: Exclude<BillingPlan, "free">;
  children: React.ReactNode;
  variant?: "dark" | "light";
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "login" | "error">("idle");
  const supabase = createSupabaseBrowserClient();

  async function handleClick() {
    setStatus("loading");

    const eventName =
      plan === "student"
        ? "student_click"
        : plan === "supporter"
          ? "supporter_click"
          : "pro_click";

    const session = supabase ? (await supabase.auth.getSession()).data.session : null;

    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {})
      },
      body: JSON.stringify({ eventName, properties: { plan } })
    }).catch(() => undefined);

    if (!session?.access_token) {
      setStatus("login");
      window.location.href = `/app?plan=${plan}`;
      return;
    }

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ plan })
    });
    const data = (await response.json()) as { url?: string };

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    setStatus("error");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={status === "loading"}
        className={
          variant === "dark"
            ? "mt-6 inline-flex min-h-11 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
            : "mt-6 inline-flex min-h-11 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-white/10"
        }
      >
        {status === "loading" ? "準備中" : children}
      </button>
      {status === "login" ? (
        <p className="mt-2 text-xs text-zinc-500">アプリでログイン後に続行できます。</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-xs text-red-600">決済ページを開けませんでした。</p>
      ) : null}
    </div>
  );
}
