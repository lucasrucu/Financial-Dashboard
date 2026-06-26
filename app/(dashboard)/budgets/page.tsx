import { PageWrapper } from "@/components/layout/PageWrapper";
import { BudgetForm, BudgetList } from "@/components/dashboard/BudgetList";

export default function BudgetsPage() {
  return (
    <PageWrapper
      title="Budgets"
      description="Set monthly spending limits per category and track progress."
    >
      <div className="space-y-6">
        <BudgetForm />
        <BudgetList />
      </div>
    </PageWrapper>
  );
}
