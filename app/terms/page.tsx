import { SimplePage } from "../components/SimplePage";

export default function TermsPage() {
  return (
    <SimplePage
      title="Terms"
      description="TSUMUGUの利用規約です。"
    >
      <p>
        TSUMUGUは0→1 Labが提供する、文章作成と文章編集を支援するAIライティングアシスタントです。出力内容はユーザー自身で確認し、必要に応じて修正してください。
      </p>
      <p>
        第三者の権利侵害、法令に反する利用、不正アクセス、過度な負荷をかける利用は禁止します。
      </p>
      <p>
        サービス内容、料金、提供条件は、必要に応じて変更される場合があります。
      </p>
    </SimplePage>
  );
}
