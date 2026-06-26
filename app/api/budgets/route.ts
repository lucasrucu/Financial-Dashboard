import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { BudgetCreatePayload } from "@/types/budget";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      budgets: (data ?? []).map((budget) => ({
        id: budget.id,
        category: budget.category,
        amount: Number(budget.amount),
        period: budget.period,
        created_at: budget.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch budgets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const body = (await request.json()) as BudgetCreatePayload;

    if (!body.category?.trim()) {
      return NextResponse.json({ error: "Missing budget category" }, { status: 400 });
    }

    if (body.amount === undefined || body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from("budgets")
      .insert({
        user_id: auth.user.id,
        category: body.category.trim(),
        amount: body.amount,
        period: body.period ?? "monthly",
      })
      .select("*")
      .single();

    if (error) {
      // A unique-violation means a budget already exists for this category.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A budget already exists for this category" },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        budget: {
          id: data.id,
          category: data.category,
          amount: Number(data.amount),
          period: data.period,
          created_at: data.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
