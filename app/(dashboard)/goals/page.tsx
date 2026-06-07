import { PageWrapper } from "@/components/layout/PageWrapper";
import { GoalForm, GoalList } from "@/components/dashboard/GoalList";

export default function GoalsPage() {
  return (
    <PageWrapper
      title="Goals"
      description="Manage savings goals tracked on your overview dashboard."
    >
      <div className="space-y-6">
        <GoalForm />
        <GoalList />
      </div>
    </PageWrapper>
  );
}
