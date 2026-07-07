import Link from "next/link";
import { AnalyticsBeacon } from "../components/AnalyticsBeacon";
import { PlanCheckoutButton } from "../components/PlanCheckoutButton";

const plans = [
  {
    id: "free" as const,
    name: "Free",
    price: "0円",
    limit: "1日10回まで",
    note: "まずは無料でTSUMUGUを試せます。",
    benefits: ["整える", "書き直す", "AIっぽさ除去", "履歴10件", "お気に入り10件"]
  },
  {
    id: "student" as const,
    name: "Student β",
    price: "300円 / 月",
    limit: "1日100回まで",
    note: "学生でも使いやすいβ版限定価格です。学生認証は将来実装予定です。",
    benefits: [
      "作成する",
      "AI相談",
      "TSUMUGU Score",
      "履歴無制限",
      "お気に入り無制限",
      "クラウド同期"
    ]
  },
  {
    id: "pro" as const,
    name: "Pro β",
    price: "500円 / 月",
    limit: "実質無制限",
    note: "毎日文章を書く人のためのプランです。異常利用防止のためフェアユース制限があります。",
    benefits: [
      "高品質モード",
      "文章力カルテ",
      "週間レポート",
      "新機能先行利用",
      "優先レスポンス",
      "履歴無制限"
    ]
  },
  {
    id: "supporter" as const,
    name: "Supporter β",
    price: "980円 / 月",
    limit: "TSUMUGUを育てる応援プラン",
    note: "Supporter βは、機能を買うプランではなく、TSUMUGUと0→1 Labを一緒に育てるための応援プランです。",
    benefits: [
      "Pro βの内容",
      "Supporterバッジ",
      "β機能の優先利用",
      "開発ロードマップ閲覧",
      "機能投票",
      "月1回の開発レポート",
      "Special Thanks掲載（希望者のみ）"
    ]
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <AnalyticsBeacon eventName="pricing_view" />
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">
            TSUMUGU
          </Link>
          <Link href="/app" className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950">
            アプリを開く
          </Link>
        </header>

        <section className="py-16 sm:py-20">
          <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-400/15 dark:text-sky-200">
            β版 / 正式リリース前価格
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
            続けられる価格で、文章を書く毎日を支える。
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-9 text-zinc-600 dark:text-zinc-300">
            TSUMUGUは利益最大化ではなく、個人開発サービスとして安定して続けられる料金設計を大切にしています。
          </p>
          <div className="mt-6 max-w-3xl rounded-[10px] border border-sky-100 bg-sky-50 p-4 text-sm leading-7 text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
            <p>現在はβ版限定価格です。正式リリース時に料金や提供内容が変更される場合があります。</p>
            <p className="mt-2">既存ユーザーへの価格維持・変更については、正式リリース時にあらためてご案内します。</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-[10px] border p-6 shadow-sm ${
                  plan.id === "supporter"
                    ? "border-sky-200 bg-sky-50 dark:border-sky-400/20 dark:bg-sky-400/10"
                    : "border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-white/5"
                }`}
              >
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
                <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {plan.limit}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{plan.note}</p>
                <div className="mt-5 grid gap-2">
                  {plan.benefits.map((benefit) => (
                    <p key={benefit} className="rounded-[8px] bg-zinc-50 px-3 py-2 text-sm font-medium dark:bg-white/10">
                      {benefit}
                    </p>
                  ))}
                </div>
                {plan.id === "free" ? (
                  <Link href="/app" className="mt-6 inline-flex min-h-11 rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-white/10">
                    無料ではじめる
                  </Link>
                ) : (
                  <PlanCheckoutButton
                    plan={plan.id}
                    variant={plan.id === "supporter" ? "dark" : "light"}
                  >
                    {plan.name}を選ぶ
                  </PlanCheckoutButton>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mb-12 rounded-[10px] border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-white/5">
          <h2 className="text-2xl font-semibold">Supporter βについて</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            TSUMUGUはまだ発展途中です。あなたの応援が、新しい機能や改善につながります。Supporterは機能を買うプランではなく、TSUMUGUを一緒に育てる仲間になるプランです。
          </p>
        </section>
      </div>
    </main>
  );
}
