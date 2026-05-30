export interface Transaction {
  id: string;
  plaid_transaction_id: string;
  date: string;
  name: string;
  amount_usd: number;
  category_id: string;
  account_id: string;
  plaid_category: string[] | null;
  is_recurring: boolean;
}

export interface TransactionRow extends Transaction {
  account_name: string;
  account_mask: string | null;
}

export type TransactionSortBy = "date" | "name" | "amount_usd";
export type TransactionSortOrder = "asc" | "desc";

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  accountId?: string;
  sortBy?: TransactionSortBy;
  sortOrder?: TransactionSortOrder;
  page?: number;
  pageSize?: number;
}

export interface TransactionListResponse {
  transactions: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
}
