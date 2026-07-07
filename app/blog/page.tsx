import Link from "next/link";

const posts = [
  {
    slug: "natural-japanese",
    title: "AIっぽくない自然な日本語に整えるコツ",
    tag: "文章術",
    excerpt: "意味を変えずに読みやすさを上げるための基本を紹介します。"
  },
  {
    slug: "email-tone",
    title: "失礼に見えないメール文の整え方",
    tag: "メール",
    excerpt: "敬語、結論、依頼文の温度感を整えるポイント。"
  }
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">TSUMUGU</Link>
          <Link href="/app" className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">アプリを開く</Link>
        </header>
        <section className="py-20">
          <h1 className="text-5xl font-semibold tracking-normal">Blog</h1>
          <input className="mt-8 min-h-11 w-full rounded-full border border-zinc-200 bg-white px-4 text-sm dark:border-zinc-800 dark:bg-white/10" placeholder="記事を検索" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <article key={post.slug} className="rounded-[8px] border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-white/5">
                <p className="text-xs font-semibold text-sky-600 dark:text-sky-300">{post.tag}</p>
                <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{post.excerpt}</p>
                <p className="mt-4 text-xs text-zinc-500">Markdown、タグ、関連記事、目次、シンタックスハイライト対応の土台です。</p>
              </article>
            ))}
          </div>
        </section>
        <footer className="pb-8 text-xs text-zinc-500">
          <p>TSUMUGU is a 0→1 Lab product.</p>
          <p className="mt-1">© 2026 0→1 Lab. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
