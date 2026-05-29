import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { BcpStatementUpload } from "@/components/dashboard/BcpStatementUpload";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function TransactionsPage() {
  return (
    <PageWrapper
      title="Transactions"
      description="Browse, filter, and categorize your transactions."
    >
      <div className="space-y-6">
        <BcpStatementUpload />
        <TransactionTable />
      </div>
    </PageWrapper>
  );
}
