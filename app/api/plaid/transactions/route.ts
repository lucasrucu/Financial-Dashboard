import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { TransactionSortBy } from "@/types/transaction";

const SORT_COLUMNS: TransactionSortBy[] = ["date", "name", "amount_usd"];

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/,/g, "\\,");
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const search = searchParams.get("search")?.trim() ?? undefined;
    const accountId = searchParams.get("accountId") ?? undefined;
    const sortByParam = searchParams.get("sortBy") ?? "date";
    const sortOrderParam = searchParams.get("sortOrder") ?? "desc";
    const sortBy = SORT_COLUMNS.includes(sortByParam as TransactionSortBy)
      ? (sortByParam as TransactionSortBy)
      : "date";
    const sortOrder = sortOrderParam === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") ?? 25))
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("transactions")
      .select("*, accounts(name, mask)", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === "asc", nullsFirst: false });

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    if (search) {
      const pattern = `%${escapeIlikePattern(search)}%`;
      const orParts = [`name.ilike.${pattern}`];

      const [{ data: matchingCategories }, { data: matchingAccounts }] =
        await Promise.all([
          supabase
            .from("categories")
            .select("id")
            .eq("user_id", user.id)
            .ilike("label", pattern),
          supabase
            .from("accounts")
            .select("id")
            .eq("user_id", user.id)
            .or(`name.ilike.${pattern},mask.ilike.${pattern}`),
        ]);

      const categoryIds = matchingCategories?.map((row) => row.id) ?? [];
      const accountIds = matchingAccounts?.map((row) => row.id) ?? [];

      if (categoryIds.length) {
        orParts.push(`category_id.in.(${categoryIds.join(",")})`);
      }

      if (accountIds.length) {
        orParts.push(`account_id.in.(${accountIds.join(",")})`);
      }

      query = query.or(orParts.join(","));
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const transactions = (data ?? []).map((row) => ({
      id: row.id,
      plaid_transaction_id: row.plaid_transaction_id,
      date: row.date,
      name: row.name,
      amount_usd: Number(row.amount_usd),
      category_id: row.category_id,
      account_id: row.account_id,
      plaid_category: row.plaid_category,
      is_recurring: row.is_recurring,
      account_name: row.accounts?.name ?? "Unknown",
      account_mask: row.accounts?.mask ?? null,
    }));

    return NextResponse.json({
      transactions,
      total: count ?? transactions.length,
      page,
      pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase } = auth;
    const body = (await request.json()) as {
      id?: string;
      category_id?: string;
    };

    if (!body.id || !body.category_id) {
      return NextResponse.json(
        { error: "Missing id or category_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({ category_id: body.category_id, category_source: "manual" })
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ transaction: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
