import { SimplePage } from "../components/SimplePage";

const sections = [
  {
    title: "取得する情報",
    items: [
      "メールアドレス",
      "ログイン情報",
      "入力文章",
      "出力文章",
      "利用履歴",
      "お問い合わせ内容",
      "決済関連情報",
      "Cookie",
      "アクセス解析情報"
    ]
  },
  {
    title: "利用目的",
    items: [
      "TSUMUGUの文章整形・文章作成支援機能を提供するため",
      "本人確認、ログイン状態の管理、アカウント管理を行うため",
      "Free、Student β、Pro β、Supporter βの利用回数を管理するため",
      "短時間大量アクセス、Bot利用、不正利用を検知・防止するため",
      "Stripeを通じた課金処理、契約状態の確認、支払い状況の管理を行うため",
      "お問い合わせ、不具合報告、解約依頼、法務関連連絡に対応するため",
      "出力品質、UI、機能、エラー表示、レスポンス速度を改善するため",
      "利用状況を分析し、料金設計、機能改善、運営継続性の判断に役立てるため"
    ]
  },
  {
    title: "外部サービス",
    items: [
      "OpenAI API: 文章整形・文章作成支援のため",
      "Supabase: 認証、データベース、履歴、設定、利用回数管理のため",
      "Stripe: 決済、サブスクリプション管理のため",
      "Vercel: アプリケーションのホスティング、配信のため",
      "Analytics: 導入する場合は利用サービス名を正式課金開始前に記載"
    ]
  },
  {
    title: "第三者提供",
    items: [
      "法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。",
      "ただし、サービス提供に必要な範囲で上記外部サービスに情報が処理される場合があります。"
    ]
  },
  {
    title: "安全管理",
    items: [
      "APIキーはサーバー側のみで管理し、クライアントへ公開しません。",
      "認証、アクセス制御、利用回数管理、異常利用検知により安全管理に努めます。"
    ]
  },
  {
    title: "Cookie",
    items: [
      "ログイン状態の維持、設定保存、アクセス解析、不正利用防止のためCookieを利用する場合があります。"
    ]
  },
  {
    title: "開示、訂正、削除依頼",
    items: [
      "利用者は、自身の情報について開示、訂正、削除を希望する場合、Contactページから問い合わせできます。",
      "法令または運営上必要な保存期間がある場合、対応できないことがあります。"
    ]
  },
  {
    title: "お問い合わせ先",
    items: ["正式課金開始前に記載。現時点ではContactページからお問い合わせください。"]
  }
];

export default function PrivacyPage() {
  return (
    <SimplePage title="プライバシーポリシー" description="TSUMUGUにおける情報の取り扱いと利用目的を説明します。">
      <p>
        TSUMUGUは0→1 Labのプロダクトです。ユーザー自身の言葉を大切に扱い、サービス提供に必要な範囲で情報を取得・利用します。
      </p>
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </SimplePage>
  );
}
