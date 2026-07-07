import { SimplePage } from "../components/SimplePage";

export default function AboutPage() {
  return (
    <SimplePage
      title="About"
      description="Renote AIは、あなたの言葉をそのまま残しながら、もっと伝わる文章へ整えるAIライティングアシスタントです。"
    >
      <p>
        Renote AIは、AIに文章を書かせるためのサービスではありません。文章を書く主体はユーザーであり、AIはその言葉を自然に届く形へ整えるためのサポート役です。
      </p>
      <p>
        整える、書き直す、作成する。3つのモードを分けることで、意味を変えない編集と、メモから文章を作る作業を混同しない体験を目指しています。
      </p>
    </SimplePage>
  );
}
