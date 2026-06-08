"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { CategoryLabel } from "@/components/dashboard/CategoryLabel";
import { ColumnFilterPopover } from "@/components/dashboard/ColumnFilterPopover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts } from "@/hooks/useAccounts";
import { getCategoryById, useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/hooks/useCurrency";
import {
  batchUpdateTransactionCategories,
  patchTransactionsCache,
  updateTransactionCategory,
  useTransactions,
} from "@/hooks/useTransactions";
import { cn, formatDate } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { TransactionListResponse } from "@/types/transaction";
import type { TransactionSortBy, TransactionSortOrder } from "@/types/transaction";

const PAGE_SIZE = 25;
const DEFAULT_SORT_BY: TransactionSortBy = "date";
const DEFAULT_SORT_ORDER: TransactionSortOrder = "desc";

type FilterColumn = "date" | "name" | "category" | "account" | "amount_usd";

function CategorySelectItems({ categories }: { categories: Category[] }) {
  return (
    <>
      {categories.map((category) => (
        <SelectItem key={category.id} value={category.id}>
          <CategoryLabel category={category} />
        </SelectItem>
      ))}
    </>
  );
}

function CategorySelectTrigger({
  categoryId,
  categories,
  className,
}: {
  categoryId: string;
  categories: Category[] | undefined;
  className?: string;
}) {
  const category = getCategoryById(categories, categoryId);

  return (
    <SelectTrigger className={className}>
      {category ? <CategoryLabel category={category} /> : <SelectValue />}
    </SelectTrigger>
  );
}

function SortControls({
  column,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  column: TransactionSortBy;
  sortBy: TransactionSortBy;
  sortOrder: TransactionSortOrder;
  onSortChange: (column: TransactionSortBy, order: TransactionSortOrder) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Sort</p>
      <div className="flex gap-1">
        <Button
          type="button"
          size="xs"
          variant={sortBy === column && sortOrder === "asc" ? "default" : "outline"}
          className="flex-1"
          onClick={() => onSortChange(column, "asc")}
        >
          Ascending
        </Button>
        <Button
          type="button"
          size="xs"
          variant={sortBy === column && sortOrder === "desc" ? "default" : "outline"}
          className="flex-1"
          onClick={() => onSortChange(column, "desc")}
        >
          Descending
        </Button>
      </div>
    </div>
  );
}

function ColumnHeader({
  label,
  columnId,
  openColumn,
  onOpenColumn,
  isActive,
  align,
  className,
  children,
}: {
  label: string;
  columnId: FilterColumn;
  openColumn: FilterColumn | null;
  onOpenColumn: (column: FilterColumn | null) => void;
  isActive: boolean;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <TableHead className={className}>
      <div
        className={cn(
          "flex items-center gap-1",
          className?.includes("text-right") && "justify-end"
        )}
      >
        <span>{label}</span>
        <ColumnFilterPopover
          open={openColumn === columnId}
          onOpenChange={(open) => onOpenColumn(open ? columnId : null)}
          isActive={isActive}
          align={align}
        >
          {children}
        </ColumnFilterPopover>
      </div>
    </TableHead>
  );
}

export function TransactionTable() {
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [accountId, setAccountId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<TransactionSortBy>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] =
    useState<TransactionSortOrder>(DEFAULT_SORT_ORDER);
  const [page, setPage] = useState(1);
  const [openColumn, setOpenColumn] = useState<FilterColumn | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      categoryId: categoryId === "all" ? undefined : categoryId,
      accountId: accountId === "all" ? undefined : accountId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, categoryId, accountId, startDate, endDate, sortBy, sortOrder, page]
  );

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, accountId, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, search, categoryId, accountId, startDate, endDate, sortBy, sortOrder]);

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data, isLoading, error, isFetching } = useTransactions(filters);

  const pageTransactionIds = useMemo(
    () => data?.transactions.map((transaction) => transaction.id) ?? [],
    [data?.transactions]
  );

  const allPageSelected =
    pageTransactionIds.length > 0 &&
    pageTransactionIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    pageTransactionIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const categoryMutation = useMutation({
    mutationFn: async ({
      ids,
      category_id,
    }: {
      ids: string[];
      category_id: string;
    }) => {
      if (ids.length === 1) {
        return updateTransactionCategory(ids[0], category_id);
      }

      return batchUpdateTransactionCategories(ids, category_id);
    },
    onMutate: async ({ ids, category_id }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previous = queryClient.getQueryData<TransactionListResponse>([
        "transactions",
        filters,
      ]);
      patchTransactionsCache(queryClient, filters, ids, category_id);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", filters], context.previous);
      }

      toast.error("Failed to update category");
    },
    onSuccess: (_data, { ids }) => {
      if (ids.length > 1) {
        setSelectedIds(new Set());
        setBulkCategoryId("");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const hasClearableFilters =
    search !== "" ||
    categoryId !== "all" ||
    accountId !== "all" ||
    startDate !== "" ||
    endDate !== "";

  const isDateFilterActive =
    startDate !== "" ||
    endDate !== "" ||
    (sortBy === "date" && sortOrder !== DEFAULT_SORT_ORDER);
  const isCategoryFilterActive = categoryId !== "all";
  const isAccountFilterActive = accountId !== "all";
  const isDescriptionSortActive = sortBy === "name";
  const isAmountSortActive = sortBy === "amount_usd";

  function handleSortChange(column: TransactionSortBy, order: TransactionSortOrder) {
    setSortBy(column);
    setSortOrder(order);
  }

  function clearFilters() {
    setSearch("");
    setCategoryId("all");
    setAccountId("all");
    setStartDate("");
    setEndDate("");
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
  }

  function toggleRowSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(pageTransactionIds));
  }

  function applyBulkCategory() {
    if (!bulkCategoryId || selectedIds.size === 0) {
      return;
    }

    categoryMutation.mutate({
      ids: Array.from(selectedIds),
      category_id: bulkCategoryId,
    });
  }

  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const pageSize = data?.pageSize ?? PAGE_SIZE;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage * pageSize < total;
  const categoryList = categories ?? [];

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          className={cn("pl-9", hasClearableFilters && "pr-9")}
          placeholder="Search description, category, or account..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {hasClearableFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search and filters"
            className="absolute top-1/2 right-1 -translate-y-1/2 text-negative hover:bg-muted/50 hover:text-negative/80"
            onClick={clearFilters}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {selectedIds.size > 0 ? (
        <div className="hidden flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 md:flex">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Select
            value={bulkCategoryId}
            onValueChange={(value) => setBulkCategoryId(value ?? "")}
          >
            <SelectTrigger className="h-8 w-[200px]">
              {bulkCategoryId ? (
                (() => {
                  const category = getCategoryById(categories, bulkCategoryId);
                  return category ? (
                    <CategoryLabel category={category} />
                  ) : (
                    <SelectValue placeholder="Choose category" />
                  );
                })()
              ) : (
                <SelectValue placeholder="Choose category" />
              )}
            </SelectTrigger>
            <SelectContent>
              <CategorySelectItems categories={categoryList} />
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={!bulkCategoryId || categoryMutation.isPending}
            onClick={applyBulkCategory}
          >
            {categoryMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Apply category"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={categoryMutation.isPending}
            onClick={() => {
              setSelectedIds(new Set());
              setBulkCategoryId("");
            }}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="hidden w-10 px-2 md:table-cell">
                <Checkbox
                  aria-label="Select all transactions on this page"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  disabled={!pageTransactionIds.length || isLoading}
                  onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                />
              </TableHead>

              <ColumnHeader
                label="Date"
                columnId="date"
                openColumn={openColumn}
                onOpenColumn={setOpenColumn}
                isActive={isDateFilterActive}
                className="w-[100px]"
              >
                <div className="space-y-3">
                  <SortControls
                    column="date"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={handleSortChange}
                  />
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Date range</p>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      aria-label="Start date"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      aria-label="End date"
                    />
                  </div>
                </div>
              </ColumnHeader>

              <ColumnHeader
                label="Description"
                columnId="name"
                openColumn={openColumn}
                onOpenColumn={setOpenColumn}
                isActive={isDescriptionSortActive}
                className="w-[40%]"
              >
                <SortControls
                  column="name"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                />
              </ColumnHeader>

              <ColumnHeader
                label="Category"
                columnId="category"
                openColumn={openColumn}
                onOpenColumn={setOpenColumn}
                isActive={isCategoryFilterActive}
                className="hidden w-[180px] md:table-cell"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <Select
                    value={categoryId}
                    onValueChange={(value) => setCategoryId(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      {categoryId === "all" ? (
                        <SelectValue placeholder="All categories" />
                      ) : (
                        (() => {
                          const category = getCategoryById(categories, categoryId);
                          return category ? (
                            <CategoryLabel category={category} />
                          ) : (
                            <SelectValue placeholder="All categories" />
                          );
                        })()
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <CategorySelectItems categories={categoryList} />
                    </SelectContent>
                  </Select>
                </div>
              </ColumnHeader>

              <ColumnHeader
                label="Account"
                columnId="account"
                openColumn={openColumn}
                onOpenColumn={setOpenColumn}
                isActive={isAccountFilterActive}
                className="hidden w-[140px] md:table-cell"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Account</p>
                  <Select
                    value={accountId}
                    onValueChange={(value) => setAccountId(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {(accounts ?? []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                          {account.mask ? ` ·•••${account.mask}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </ColumnHeader>

              <ColumnHeader
                label="Amount"
                columnId="amount_usd"
                openColumn={openColumn}
                onOpenColumn={setOpenColumn}
                isActive={isAmountSortActive}
                align="end"
                className="w-[100px] text-right"
              >
                <SortControls
                  column="amount_usd"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                />
              </ColumnHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="hidden md:table-cell"><Skeleton className="size-4 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full max-w-[240px]" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-[170px] rounded-md" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-negative">
                  Failed to load transactions.
                </TableCell>
              </TableRow>
            ) : !data?.transactions.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No transactions found. Connect a bank and sync to see data.
                </TableCell>
              </TableRow>
            ) : (
              data.transactions.map((transaction) => {
                const isExpense = transaction.amount_usd > 0;
                const accountLabel = `${transaction.account_name}${
                  transaction.account_mask ? ` ·•••${transaction.account_mask}` : ""
                }`;
                const isSelected = selectedIds.has(transaction.id);
                const category = getCategoryById(categories, transaction.category_id);

                return (
                  <TableRow
                    key={transaction.id}
                    className={cn("border-border", isSelected && "bg-muted/40")}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell className="hidden w-10 px-2 md:table-cell">
                      <Checkbox
                        aria-label={`Select ${transaction.name}`}
                        checked={isSelected}
                        onChange={(event) =>
                          toggleRowSelection(transaction.id, event.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="w-[100px]">{formatDate(transaction.date)}</TableCell>
                    <TableCell className="max-w-0 whitespace-normal">
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          {category?.icon ? (
                            <span
                              className="mt-0.5 shrink-0 text-sm leading-none md:hidden"
                              title={category.label}
                            >
                              {category.icon}
                            </span>
                          ) : null}
                          <p className="line-clamp-2 md:line-clamp-1" title={transaction.name}>
                            {transaction.name}
                          </p>
                        </div>
                        {transaction.is_recurring ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Recurring
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden w-[180px] md:table-cell">
                      <Select
                        value={transaction.category_id}
                        onValueChange={(value) => {
                          if (!value) {
                            return;
                          }

                          categoryMutation.mutate({
                            ids: [transaction.id],
                            category_id: value,
                          });
                        }}
                      >
                        <CategorySelectTrigger
                          categoryId={transaction.category_id}
                          categories={categories}
                          className="h-8 w-full max-w-[170px]"
                        />
                        <SelectContent>
                          <CategorySelectItems categories={categoryList} />
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell
                      className="hidden max-w-[140px] truncate text-muted-foreground md:table-cell"
                      title={accountLabel}
                    >
                      {accountLabel}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "w-[100px] text-right font-medium",
                        isExpense ? "text-negative" : "text-positive"
                      )}
                    >
                      {isExpense ? "-" : "+"}
                      {formatAmount(Math.abs(transaction.amount_usd))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex}–{endIndex} of {total}
            {isFetching && !isLoading ? (
              <Loader2 className="ml-2 inline size-3.5 animate-spin" />
            ) : null}
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasPreviousPage || isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
}
