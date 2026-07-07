import { SimplePage } from "../components/SimplePage";

export default function HelpPage() {
  return (
    <SimplePage
      title="Help / FAQ"
      description="Renote AIを迷わず使うためのヘルプとよくある質問です。"
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
        無料プランでは整える・書き直すを利用できます。作成する、文字数指定、AI相談、Renote Score、高品質モードはProプラン向けです。
      </p>
    </SimplePage>
  );
}
