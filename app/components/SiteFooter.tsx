import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/commercial-disclosure", label: "特定商取引法に基づく表記" }
];

export function BetaBadge() {
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-40 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm backdrop-blur-xl dark:border-sky-400/20 dark:bg-zinc-950/80 dark:text-sky-200">
      β版
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <p>© 2026 0→1 Lab. All rights reserved.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="フッター">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
