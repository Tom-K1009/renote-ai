import Link from "next/link";

const freeBenefits = ["整える", "書き直す", "履歴保存", "コピー・Markdown・Word・PDF出力"];
const proBenefits = ["作成する", "文字数指定", "AI相談", "Renote Score", "高品質モード", "利用回数無制限"];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">
            Renote AI
          </Link>
          <Link href="/app" className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950">
            アプリを開く
          </Link>
        </header>

        <section className="py-16 sm:py-20">
          <p className="text-sm font-medium text-sky-600 dark:text-sky-300">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            まずは無料で。毎日使うならProへ。
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-9 text-zinc-600 dark:text-zinc-300">
            Renote AIは、文章を書く人が気軽に使い始められるよう無料プランを用意しています。
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-[10px] border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-white/5">
              <h2 className="text-xl font-semibold">Free</h2>
              <p className="mt-2 text-4xl font-semibold">0円</p>
              <p className="mt-3 text-sm text-zinc-500">整える・書き直すを試せます。</p>
              <div className="mt-5 grid gap-2">
                {freeBenefits.map((benefit) => (
                  <p key={benefit} className="rounded-[8px] bg-zinc-50 px-3 py-2 text-sm font-medium dark:bg-white/10">
                    {benefit}
                  </p>
                ))}
              </div>
              <Link href="/app" className="mt-6 inline-flex rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-white/10">
                無料ではじめる
              </Link>
            </article>

            <article className="rounded-[10px] border border-sky-100 bg-sky-50 p-6 shadow-sm dark:border-sky-400/20 dark:bg-sky-400/10">
              <h2 className="text-xl font-semibold">Pro</h2>
              <p className="mt-2 text-4xl font-semibold">500円/月</p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                文章作成まで使いたい人向けのプランです。
              </p>
              <div className="mt-5 grid gap-2">
                {proBenefits.map((benefit) => (
                  <p key={benefit} className="rounded-[8px] bg-white/70 px-3 py-2 text-sm font-medium dark:bg-white/10">
                    {benefit}
                  </p>
                ))}
              </div>
              <Link href="/app" className="mt-6 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950">
                Proを見る
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
