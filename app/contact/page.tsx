import { FeedbackForm } from "../components/FeedbackForm";
import { SimplePage } from "../components/SimplePage";

export default function ContactPage() {
  return (
    <SimplePage
      title="Contact"
      description="TSUMUGUへのご意見、不具合報告、0→1 Labへのご相談はこちらからお送りください。"
    >
      <FeedbackForm />
    </SimplePage>
  );
}
