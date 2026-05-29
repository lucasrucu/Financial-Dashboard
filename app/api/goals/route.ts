import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { GoalUpdatePayload } from "@/types/goal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("goals").select("*").order("name");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      goals: (data ?? []).map((goal) => ({
        ...goal,
        target_usd: Number(goal.target_usd),
        saved_usd: Number(goal.saved_usd),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as GoalUpdatePayload & { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: "Missing goal id" }, { status: 400 });
    }

    const updates: GoalUpdatePayload = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }

    if (body.target_usd !== undefined) {
      updates.target_usd = body.target_usd;
    }

    if (body.saved_usd !== undefined) {
      updates.saved_usd = body.saved_usd;
    }

    if (body.deadline !== undefined) {
      updates.deadline = body.deadline;
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("goals")
      .update(updates)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      goal: {
        ...data,
        target_usd: Number(data.target_usd),
        saved_usd: Number(data.saved_usd),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
