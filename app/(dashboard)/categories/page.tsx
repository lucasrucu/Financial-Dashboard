import { PageWrapper } from "@/components/layout/PageWrapper";
import { CategoryForm, CategoryList } from "@/components/dashboard/CategoryList";

export default function CategoriesPage() {
  return (
    <PageWrapper
      title="Categories"
      description="Manage spending categories used across transactions and charts."
    >
      <div className="space-y-6">
        <CategoryForm />
        <CategoryList />
      </div>
    </PageWrapper>
  );
}
