import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { CategoryUpdatePayload } from "@/types/category";

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
    const body = (await request.json()) as CategoryUpdatePayload;
    const updates: CategoryUpdatePayload = {};

    if (body.label !== undefined) {
      updates.label = body.label.trim();
    }

    if (body.icon !== undefined) {
      updates.icon = body.icon.trim();
    }

    if (body.color !== undefined) {
      updates.color = body.color.trim();
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("categories")
      .update(updates)
      .eq("user_id", auth.user.id)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ category: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update category";
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

    const { data: category, error: fetchError } = await auth.supabase
      .from("categories")
      .select("id, is_system")
      .eq("user_id", auth.user.id)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.is_system) {
      return NextResponse.json(
        { error: "System categories cannot be deleted" },
        { status: 403 }
      );
    }

    const { error: reassignError } = await auth.supabase
      .from("transactions")
      .update({ category_id: "other" })
      .eq("category_id", id);

    if (reassignError) {
      throw new Error(reassignError.message);
    }

    const { error: deleteError } = await auth.supabase
      .from("categories")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ deleted: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
