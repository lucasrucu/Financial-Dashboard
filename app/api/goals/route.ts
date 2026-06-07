import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { GoalCreatePayload } from "@/types/goal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

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

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const body = (await request.json()) as GoalCreatePayload;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Missing goal name" }, { status: 400 });
    }

    if (body.target_usd === undefined || body.target_usd <= 0) {
      return NextResponse.json({ error: "Target must be greater than zero" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("goals")
      .insert({
        user_id: auth.user.id,
        name: body.name.trim(),
        target_usd: body.target_usd,
        saved_usd: body.saved_usd ?? 0,
        deadline: body.deadline ?? null,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        goal: {
          ...data,
          target_usd: Number(data.target_usd),
          saved_usd: Number(data.saved_usd),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
