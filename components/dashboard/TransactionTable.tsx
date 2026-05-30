"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/hooks/useCurrency";
import {
  updateTransactionCategory,
  useTransactions,
} from "@/hooks/useTransactions";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export function TransactionTable() {
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      categoryId: categoryId === "all" ? undefined : categoryId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, categoryId, startDate, endDate, page]
  );

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, startDate, endDate]);

  const { data: categories } = useCategories();
  const { data, isLoading, error, isFetching } = useTransactions(filters);

  const categoryMutation = useMutation({
    mutationFn: ({ id, category_id }: { id: string; category_id: string }) =>
      updateTransactionCategory(id, category_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const pageSize = data?.pageSize ?? PAGE_SIZE;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage * pageSize < total;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search transactions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={categoryId}
          onValueChange={(value) => setCategoryId(value ?? "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
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

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-slate-800">
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[170px] rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-negative">
                  Failed to load transactions.
                </TableCell>
              </TableRow>
            ) : !data?.transactions.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No transactions found. Connect a bank and sync to see data.
                </TableCell>
              </TableRow>
            ) : (
              data.transactions.map((transaction) => {
                const isExpense = transaction.amount_usd > 0;

                return (
                  <TableRow key={transaction.id} className="border-slate-800">
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{transaction.name}</p>
                        {transaction.is_recurring ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Recurring
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={transaction.category_id}
                        onValueChange={(value) => {
                          if (!value) {
                            return;
                          }

                          categoryMutation.mutate({
                            id: transaction.id,
                            category_id: value,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(categories ?? []).map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.icon} {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.account_name}
                      {transaction.account_mask ? ` ·•••${transaction.account_mask}` : ""}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        isExpense ? "text-negative" : "text-positive"
                      }`}
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
