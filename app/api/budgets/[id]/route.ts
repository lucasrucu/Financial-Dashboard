import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { BudgetUpdatePayload } from "@/types/budget";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { id } = await context.params;
    const body = (await request.json()) as BudgetUpdatePayload;
    const updates: BudgetUpdatePayload = {};

    if (body.category !== undefined) {
      updates.category = body.category.trim();
    }

    if (body.amount !== undefined) {
      if (body.amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than zero" },
          { status: 400 }
        );
      }
      updates.amount = body.amount;
    }

    if (body.period !== undefined) {
      updates.period = body.period;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("budgets")
      .update(updates)
      .eq("user_id", auth.user.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A budget already exists for this category" },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({
      budget: {
        id: data.id,
        category: data.category,
        amount: Number(data.amount),
        period: data.period,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { id } = await context.params;

    const { data: budget, error: fetchError } = await auth.supabase
      .from("budgets")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const { error: deleteError } = await auth.supabase
      .from("budgets")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ deleted: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
