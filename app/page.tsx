import Link from "next/link";

const modes = [
  {
    title: "📄 整える",
    description: "意味も情報量も変えず、文体、敬語、読みやすさだけを整えます。"
  },
  {
    title: "✍️ 書き直す",
    description: "同じ内容を、もっと短く、丁寧に、自然に、説得力ある表現へ。"
  },
  {
    title: "✨ 作成する",
    description: "メモや箇条書きから文章を作成。文字数指定はこのモードだけです。"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-semibold">
          TSUMUGU
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300 md:flex">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <Link
          href="/app"
          className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
        >
          開く
        </Link>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <p className="mb-5 inline-flex rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-white/10 dark:text-zinc-300">
          AIに書かせるのではなく、自分の文章を育てるサービス
        </p>
        <h1 className="max-w-5xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl lg:text-7xl">
          あなたの言葉を、そのまま、
          <br />
          もっと伝わる文章へ。
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-9 text-zinc-600 dark:text-zinc-300">
          TSUMUGUは、AIが文章を代わりに書くサービスではありません。ユーザー自身の言葉を大切にしながら、自然で伝わりやすい文章へ整え、文章を書く力を育てるAIライティングアシスタントです。
        </p>
        <p className="mt-4 max-w-2xl rounded-[10px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
          TSUMUGUは現在β版です。いただいたフィードバックをもとに改善を続けています。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
          >
            今日は何をしたいですか？
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-zinc-200 bg-white/70 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-white dark:border-zinc-800 dark:bg-white/10 dark:text-zinc-100"
          >
            プランを見る
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:px-6 md:grid-cols-3 lg:px-8">
        {modes.map((mode) => (
          <article
            key={mode.title}
            className="rounded-[8px] border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-white/5"
          >
            <h2 className="text-xl font-semibold">{mode.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {mode.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
