import Link from "next/link";
import { PlanCheckoutButton } from "../components/PlanCheckoutButton";

export default function SupporterPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">TSUMUGU</Link>
          <Link href="/pricing" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold dark:border-zinc-800 dark:bg-white/10">
            Pricing
          </Link>
        </header>
        <section className="py-20">
          <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-400/15 dark:text-sky-200">
            Supporter β
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-normal">
            TSUMUGUを一緒に育てる。
          </h1>
          <div className="mt-8 space-y-5 text-lg leading-9 text-zinc-600 dark:text-zinc-300">
            <p>TSUMUGUはまだ発展途中です。</p>
            <p>あなたの応援が、新しい機能や改善につながります。</p>
            <p>
              Supporterは機能を買うプランではなく、TSUMUGUを一緒に育てる仲間になるプランです。
            </p>
          </div>
          <PlanCheckoutButton plan="supporter">Supporterになる</PlanCheckoutButton>
        </section>
      </div>
    </main>
  );
}
