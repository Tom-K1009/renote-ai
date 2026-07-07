import { SimplePage } from "../components/SimplePage";

export default function PrivacyPage() {
  return (
    <SimplePage
      title="Privacy Policy"
      description="Renote AIのプライバシーポリシーです。"
    >
      <p>
        入力された文章、履歴、設定情報は、サービス提供、クラウド同期、利用回数管理、品質改善のために必要な範囲で扱います。
      </p>
      <p>
        Googleログイン、Supabase、Stripeを利用する場合、それぞれのサービスで認証や決済に必要な情報が処理されます。
      </p>
      <p>
        個人情報や機密情報を入力する場合は、内容を確認したうえでご利用ください。
      </p>
    </SimplePage>
  );
}
