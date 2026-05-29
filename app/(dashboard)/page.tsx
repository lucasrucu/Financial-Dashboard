import { OverviewContent } from "@/components/dashboard/OverviewContent";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function OverviewPage() {
  return (
    <PageWrapper
      title="Overview"
      description="Net worth, spending, goals, and category breakdown."
    >
      <OverviewContent />
    </PageWrapper>
  );
}
