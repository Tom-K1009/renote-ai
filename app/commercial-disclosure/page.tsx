import { SimplePage } from "../components/SimplePage";

const rows = [
  ["販売事業者", "0→1 Lab"],
  ["運営責任者", "久田雅也"],
  ["所在地", "正式課金開始前に記載"],
  ["お問い合わせ先", "正式課金開始前に記載"],
  ["販売価格", "各プランページに表示"],
  ["商品代金以外の必要料金", "インターネット接続料金等は利用者負担"],
  ["支払方法", "クレジットカード等、Stripeが提供する決済方法"],
  ["支払時期", "購入時または各更新日に決済"],
  ["役務の提供時期", "決済完了後、直ちに利用可能"],
  ["解約方法", "アカウント設定または問い合わせから解約可能"],
  [
    "返金について",
    "サービスの性質上、原則として返金不可。ただし法令上必要な場合を除く"
  ],
  ["動作環境", "最新版の主要ブラウザ"],
  [
    "表現および商品に関する注意書き",
    "AI出力の正確性・完全性を保証しない"
  ]
];

export default function CommercialDisclosurePage() {
  return (
    <SimplePage
      title="特定商取引法に基づく表記"
      description="TSUMUGU β版の有料プラン提供に向けた表記です。未入力項目は正式課金開始前に記載します。"
    >
      <div className="grid gap-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-2 rounded-[8px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:grid-cols-[180px_1fr]"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {label}
            </p>
            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-500">
        このページは公開前の仮文言を含みます。正式課金開始前に、所在地・連絡先・解約導線を運営者が確認してください。
      </p>
    </SimplePage>
  );
}
