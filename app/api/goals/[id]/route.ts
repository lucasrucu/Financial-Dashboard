import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { GoalUpdatePayload } from "@/types/goal";

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
    const body = (await request.json()) as GoalUpdatePayload;
    const updates: GoalUpdatePayload = {};

    if (body.name !== undefined) {
      updates.name = body.name.trim();
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

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("goals")
      .update(updates)
      .eq("user_id", auth.user.id)
      .eq("id", id)
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

    const { data: goal, error: fetchError } = await auth.supabase
      .from("goals")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const { error: deleteError } = await auth.supabase
      .from("goals")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ deleted: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
