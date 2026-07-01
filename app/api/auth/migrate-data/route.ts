import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const TABLES = [
  "plaid_items",
  "accounts",
  "transactions",
  "goals",
  "statement_imports",
  "ai_cache",
] as const;

export async function POST() {
  const auth = await requireUser();

  if (auth.unauthorized) {
    return auth.unauthorized;
  }

  const ownerId = process.env.MIGRATE_DATA_OWNER_USER_ID;

  if (!ownerId || auth.user.id !== ownerId) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const userId = auth.user.id;
  const admin = getSupabaseAdmin();
  let migrated = 0;

  for (const table of TABLES) {
    const { data: orphanRows, error: selectError } = await admin
      .from(table)
      .select("id")
      .is("user_id", null)
      .limit(500);

    if (selectError) {
      continue;
    }

    if (!orphanRows?.length) {
      continue;
    }

    const ids = orphanRows.map((row) => row.id);

    const { error: updateError, count } = await admin
      .from(table)
      .update({ user_id: userId })
      .is("user_id", null)
      .in("id", ids);

    if (!updateError) {
      migrated += count ?? orphanRows.length;
    }
  }

  return NextResponse.json({ migrated, user_id: userId });
}
