import { SimplePage } from "../components/SimplePage";

export default function HelpPage() {
  return (
    <SimplePage
      title="Help / FAQ"
      description="TSUMUGUを迷わず使うためのヘルプとよくある質問です。"
    >
      <h2 className="text-xl font-semibold">整える・書き直す・作成するの違いは？</h2>
      <p>
        整えるは意味や情報量を変えずに読みやすくします。書き直すは同じ内容を別の伝え方へ変えます。作成するはメモや箇条書きから文章を作ります。
      </p>
      <h2 className="text-xl font-semibold">情報は勝手に追加されますか？</h2>
      <p>
        整えるモードでは追加しません。書き直すモードでは必要最低限の補足だけ許可し、作成するモードではメモを文章化するための自然な補足を許可します。
      </p>
      <h2 className="text-xl font-semibold">無料で使えますか？</h2>
      <p>
        無料プランでは整える・書き直すを利用できます。作成する、文字数指定、AI相談、TSUMUGU Score、高品質モードはProプラン向けです。
      </p>
      <h2 className="text-xl font-semibold">TSUMUGUは文章を勝手に作るサービスですか？</h2>
      <p>
        いいえ。TSUMUGUは、あなた自身の言葉を主役にするためのサービスです。AIは代筆者ではなく、自然さ、読みやすさ、伝わりやすさを整えるサポート役です。
      </p>
      <h2 className="text-xl font-semibold">AI利用に関する注意</h2>
      <p>
        TSUMUGUはAIを使用して文章を整えます。出力内容には誤りや不自然な表現が含まれる場合があります。重要な文章、課題、業務文書、契約文書などに利用する場合は、必ずご自身で内容を確認してください。
      </p>
    </SimplePage>
  );
}
