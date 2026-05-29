import { NextResponse } from "next/server";

import {
  enrichAccountsWithEffectiveBalance,
  getEffectiveBalanceForAccount,
} from "@/lib/accountBalance";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      balance_anchor_usd?: number;
      balance_anchor_date?: string;
      clear_anchor?: boolean;
    };

    const supabase = getSupabaseAdmin();

    const { data: existing, error: existingError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (body.clear_anchor) {
      const { data, error } = await supabase
        .from("accounts")
        .update({
          balance_anchor_usd: null,
          balance_anchor_date: null,
          balance_anchor_set_at: null,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const [account] = await enrichAccountsWithEffectiveBalance([
        {
          ...data,
          balance_usd: Number(data.balance_usd),
          balance_anchor_usd: null,
          balance_anchor_date: null,
        },
      ]);

      return NextResponse.json({ account });
    }

    if (body.balance_anchor_usd === undefined || !Number.isFinite(body.balance_anchor_usd)) {
      return NextResponse.json(
        { error: "Missing or invalid balance_anchor_usd" },
        { status: 400 }
      );
    }

    const anchorDate = body.balance_anchor_date ?? formatLocalDate(new Date());

    const { data, error } = await supabase
      .from("accounts")
      .update({
        balance_anchor_usd: body.balance_anchor_usd,
        balance_anchor_date: anchorDate,
        balance_anchor_set_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const effectiveBalanceUsd = await getEffectiveBalanceForAccount(id);

    return NextResponse.json({
      account: {
        ...data,
        balance_usd: Number(data.balance_usd),
        balance_anchor_usd: Number(data.balance_anchor_usd),
        effective_balance_usd: effectiveBalanceUsd,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
