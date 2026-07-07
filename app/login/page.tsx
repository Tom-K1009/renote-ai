import Link from "next/link";
import { SimplePage } from "../components/SimplePage";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasAuthError = params?.error === "auth";

  return (
    <SimplePage
      title="ログイン"
      description="GoogleログインでTSUMUGUを利用できます。"
    >
      {hasAuthError ? (
        <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
          Googleログインに失敗しました。時間をおいてもう一度お試しください。
        </div>
      ) : null}
      <p>
        ログイン後はアプリ画面に戻り、履歴や設定を同期できるようになります。
      </p>
      <Link
        href="/app"
        className="inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
      >
        アプリでログインする
      </Link>
    </SimplePage>
  );
}
