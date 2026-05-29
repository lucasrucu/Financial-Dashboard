import { AiInsightPanel } from "@/components/dashboard/AiInsightPanel";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function InsightsPage() {
  return (
    <PageWrapper
      title="Insights"
      description="AI-powered financial commentary on demand."
    >
      <AiInsightPanel />
    </PageWrapper>
  );
}
