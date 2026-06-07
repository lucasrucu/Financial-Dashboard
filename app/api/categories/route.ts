import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  backfillIncomeCategories,
  ensureDefaultCategories,
  seedCategoriesIfEmpty,
  suggestCategoryColor,
} from "@/lib/categories";
import type { CategoryCreatePayload } from "@/types/category";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const categories = await ensureDefaultCategories(auth.supabase, auth.user.id);
    await backfillIncomeCategories(auth.supabase, auth.user.id);

    return NextResponse.json({
      categories: categories.map((category) => ({
        id: category.id,
        label: category.label,
        icon: category.icon,
        color: category.color,
        is_system: category.is_system,
        created_at: category.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const body = (await request.json()) as CategoryCreatePayload;

    if (!body.label?.trim()) {
      return NextResponse.json({ error: "Missing category label" }, { status: 400 });
    }

    const existing = await seedCategoriesIfEmpty(auth.supabase, auth.user.id);
    const usedColors = existing.map((category) => category.color);
    const color =
      body.color?.trim() ||
      (await suggestCategoryColor(body.label.trim(), usedColors));

    const id = `cat_${randomUUID()}`;

    const { data, error } = await auth.supabase
      .from("categories")
      .insert({
        id,
        user_id: auth.user.id,
        label: body.label.trim(),
        icon: body.icon?.trim() || "📦",
        color,
        is_system: false,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
