import Link from "next/link";
import type { ReactNode } from "react";
import { createSupabaseAdminClient } from "../lib/supabase/server";
import { createSupabaseServerSessionClient } from "../lib/supabase/server-session";
import { planConfigs, type BillingPlan } from "../lib/plans";

export const dynamic = "force-dynamic";

type ApiEvent = {
  user_id: string | null;
  plan: string;
  mode: string | null;
  purpose: string | null;
  writing_style: string | null;
  estimated_cost_jpy: number | string | null;
  response_ms: number | null;
  status: string;
  error_code: string | null;
  created_at: string;
};

function startOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dayOfMonth() {
  return Math.max(1, new Date().getDate());
}

function yen(value: number) {
  return `約${value.toFixed(2)}円`;
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function topEntries(map: Record<string, number>, limit = 5) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function StatCard({
  label,
  value,
  note
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <article className="rounded-[10px] border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-white/5">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
      {note ? <p className="mt-2 text-xs text-zinc-500">{note}</p> : null}
    </article>
  );
}

export default async function AdminPage() {
  const sessionClient = await createSupabaseServerSessionClient();
  const admin = createSupabaseAdminClient();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!sessionClient || !admin) {
    return <AdminShell title="Admin">Supabaseの環境変数が未設定です。</AdminShell>;
  }

  const {
    data: { user }
  } = await sessionClient.auth.getUser();

  if (!user) {
    return (
      <AdminShell title="Admin">
        <p>管理画面を見るにはログインしてください。</p>
        <Link className="mt-5 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950" href="/app">
          アプリでログイン
        </Link>
      </AdminShell>
    );
  }

  if (!adminEmails.includes((user.email ?? "").toLowerCase())) {
    return <AdminShell title="Admin">このアカウントには管理画面の権限がありません。</AdminShell>;
  }

  const today = todayIso();
  const monthStart = startOfMonthIso();

  const [
    profiles,
    todayEvents,
    monthEvents,
    feedback,
    pricingViews,
    planClicks
  ] = await Promise.all([
    admin.from("profiles").select("id, plan, created_at, is_suspended"),
    admin
      .from("tsumugu_api_events")
      .select("*")
      .gte("created_at", `${today}T00:00:00.000Z`),
    admin.from("tsumugu_api_events").select("*").gte("created_at", monthStart),
    admin.from("tsumugu_feedback").select("id, status, created_at"),
    admin
      .from("tsumugu_analytics_events")
      .select("id")
      .eq("event_name", "pricing_view"),
    admin
      .from("tsumugu_analytics_events")
      .select("event_name, properties")
      .in("event_name", ["student_click", "pro_click", "supporter_click"])
  ]);

  const profileRows = profiles.data ?? [];
  const todayRows = (todayEvents.data ?? []) as ApiEvent[];
  const monthRows = (monthEvents.data ?? []) as ApiEvent[];
  const totalCost = monthRows.reduce(
    (sum, item) => sum + Number(item.estimated_cost_jpy ?? 0),
    0
  );
  const todayCost = todayRows.reduce(
    (sum, item) => sum + Number(item.estimated_cost_jpy ?? 0),
    0
  );
  const avgResponse =
    todayRows.length > 0
      ? Math.round(
          todayRows.reduce((sum, item) => sum + (item.response_ms ?? 0), 0) /
            todayRows.length
        )
      : 0;
  const activeUsers = new Set(todayRows.map((item) => item.user_id).filter(Boolean)).size;
  const todayNewUsers = profileRows.filter((profile) =>
    String(profile.created_at).startsWith(today)
  ).length;
  const planCounts = countBy(
    profileRows.map((profile) => String(profile.plan) as BillingPlan)
  );
  const modeCounts = countBy(monthRows.map((item) => item.mode ?? "unknown"));
  const purposeCounts = countBy(monthRows.map((item) => item.purpose ?? "unknown"));
  const styleCounts = countBy(monthRows.map((item) => item.writing_style ?? "unknown"));
  const errors = monthRows.filter((item) => item.status === "error");
  const abnormal = profileRows.filter((profile) => profile.is_suspended).length;
  const supporterCount = planCounts.supporter ?? 0;
  const revenueProjection =
    (planCounts.student ?? 0) * 300 +
    (planCounts.pro ?? 0) * 500 +
    supporterCount * 980;
  const apiCostProjection = (totalCost / dayOfMonth()) * 30;
  const userUsage = monthRows.reduce<Record<string, number>>((acc, item) => {
    const key = item.user_id ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-xl font-semibold">TSUMUGU</Link>
            <p className="mt-2 text-sm text-zinc-500">0→1 Lab 運営ダッシュボード</p>
          </div>
          <Link href="/app" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold dark:border-zinc-800 dark:bg-white/10">
            アプリへ
          </Link>
        </header>

        <section className="py-10">
          <h1 className="text-4xl font-semibold tracking-normal">Admin</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            API利用量、推定コスト、プラン構成、異常利用をひと目で確認できます。推定コストはTSUMUGU内の概算で、実際のOpenAI請求額とは差が出る場合があります。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="総ユーザー数" value={profileRows.length} />
          <StatCard label="今日の新規登録" value={todayNewUsers} />
          <StatCard label="今日のAPI利用回数" value={todayRows.length} />
          <StatCard label="今月のAPI利用回数" value={monthRows.length} />
          <StatCard label="今日の推定コスト" value={yen(todayCost)} />
          <StatCard label="今月の推定コスト" value={yen(totalCost)} />
          <StatCard label="平均レスポンス時間" value={`${avgResponse}ms`} />
          <StatCard label="アクティブユーザー" value={activeUsers} />
          <StatCard label="APIエラー件数" value={errors.length} />
          <StatCard label="異常アクセス検知" value={abnormal} />
          <StatCard label="問い合わせ件数" value={feedback.data?.length ?? 0} />
          <StatCard label="Pricing閲覧数" value={pricingViews.data?.length ?? 0} />
          <StatCard label="Supporter数" value={supporterCount} />
          <StatCard label="売上見込み" value={`${revenueProjection.toLocaleString()}円/月`} />
          <StatCard label="APIコスト見込み" value={yen(apiCostProjection)} />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <AdminList
            title="プラン比率"
            items={Object.entries(planConfigs).map(([key, config]) => [
              config.name,
              planCounts[key] ?? 0
            ] as [string, number])}
          />
          <AdminList title="人気モード" items={topEntries(modeCounts)} />
          <AdminList title="人気用途" items={topEntries(purposeCounts)} />
          <AdminList title="人気文体" items={topEntries(styleCounts)} />
          <AdminList title="上位利用ユーザー" items={topEntries(userUsage)} />
          <AdminList title="プランクリック" items={topEntries(countBy((planClicks.data ?? []).map((item) => item.event_name)))} />
        </section>
      </div>
    </main>
  );
}

function AdminShell({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-xl font-semibold">TSUMUGU</Link>
        <section className="mt-12 rounded-[10px] border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-white/5">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <div className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminList({
  title,
  items
}: {
  title: string;
  items: [string, number][];
}) {
  return (
    <section className="rounded-[10px] border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-white/5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 grid gap-2">
        {items.length > 0 ? (
          items.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-[8px] bg-zinc-50 px-3 py-2 text-sm dark:bg-white/10">
              <span className="truncate">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">まだデータがありません。</p>
        )}
      </div>
    </section>
  );
}
