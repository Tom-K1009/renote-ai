import { FeedbackForm } from "../components/FeedbackForm";
import { SimplePage } from "../components/SimplePage";

export default function ContactPage() {
  return (
    <SimplePage
      title="Contact"
      description="Renote AIへのご意見、不具合報告、導入相談はこちらからお送りください。"
    >
      <FeedbackForm />
    </SimplePage>
  );
}
