import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { exchangePublicToken, getInstitutionName } from "@/lib/plaid";
import { syncPlaidAccounts, syncPlaidTransactions } from "@/lib/plaid/sync-helpers";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;
    const body = (await request.json()) as { public_token?: string };

    if (!body.public_token) {
      return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
    }

    const { accessToken, itemId } = await exchangePublicToken(body.public_token);
    const institutionName = await getInstitutionName(accessToken);

    const { data: existingItem } = await supabase
      .from("plaid_items")
      .select("id")
      .eq("item_id", itemId)
      .maybeSingle();

    let plaidItemId = existingItem?.id;

    if (plaidItemId) {
      await supabase
        .from("plaid_items")
        .update({
          access_token: accessToken,
          institution_name: institutionName,
        })
        .eq("id", plaidItemId);
    } else {
      const { data: insertedItem, error: insertError } = await supabase
        .from("plaid_items")
        .insert({
          access_token: accessToken,
          item_id: itemId,
          user_id: user.id,
          institution_name: institutionName,
        })
        .select("id")
        .single();

      if (insertError || !insertedItem) {
        throw new Error(insertError?.message ?? "Failed to save Plaid item");
      }

      plaidItemId = insertedItem.id;
    }

    await syncPlaidAccounts(supabase, accessToken, plaidItemId, user.id);
    await syncPlaidTransactions(supabase, accessToken, user.id, 90);

    await supabase
      .from("plaid_items")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", plaidItemId);

    return NextResponse.json({
      item_id: itemId,
      institution_name: institutionName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange public token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
