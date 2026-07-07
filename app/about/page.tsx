import { SimplePage } from "../components/SimplePage";

export default function AboutPage() {
  return (
    <SimplePage
      title="About"
      description="TSUMUGUは、あなたの言葉を、そのまま、もっと伝わる文章へ整えるAIライティングアシスタントです。"
    >
      <p>
        TSUMUGUは、AIが文章を代わりに書くサービスではありません。ユーザー自身の言葉を大切にしながら、自然で伝わりやすい文章へ整え、文章を書く力を育てるAIライティングアシスタントです。
      </p>
      <p>
        整える、書き直す、作成する。3つのモードを分けることで、意味を変えない編集と、メモから文章を作る作業を混同しない体験を目指しています。
      </p>
      <p>
        0→1 Labのプロダクトとして、毎日使いやすく、長く続けられる文章支援サービスを育てていきます。
      </p>
    </SimplePage>
  );
}
