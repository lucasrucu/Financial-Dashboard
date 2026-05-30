import { BcpStatementUpload } from "@/components/dashboard/BcpStatementUpload";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function ImportPage() {
  return (
    <PageWrapper
      title="Import"
      description="Import BCP bank statements from PDF files."
    >
      <BcpStatementUpload />
    </PageWrapper>
  );
}
