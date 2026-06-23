import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { TransferSuggestions } from "@/components/dashboard/TransferSuggestions";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function TransactionsPage() {
  return (
    <PageWrapper
      title="Transactions"
      description="Browse, filter, and categorize your transactions."
    >
      <div className="space-y-4">
        <TransferSuggestions />
        <TransactionTable />
      </div>
    </PageWrapper>
  );
}
