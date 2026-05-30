import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function TransactionsPage() {
  return (
    <PageWrapper
      title="Transactions"
      description="Browse, filter, and categorize your transactions."
    >
      <TransactionTable />
    </PageWrapper>
  );
}
