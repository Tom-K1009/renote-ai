import Link from "next/link";
import type { ReactNode } from "react";

export function SimplePage({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="text-xl font-semibold">
          Renote AI
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300 sm:flex">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/help">Help</Link>
        </nav>
        <Link
          href="/app"
          className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
        >
          アプリを開く
        </Link>
      </header>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="mb-4 text-sm font-medium text-sky-600 dark:text-sky-300">
          Renote AI
        </p>
        <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-9 text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
        <div className="mt-10 max-w-3xl space-y-5 rounded-[10px] border border-zinc-200 bg-white/80 p-6 text-base leading-8 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-200">
          {children}
        </div>
      </section>
    </main>
  );
}
