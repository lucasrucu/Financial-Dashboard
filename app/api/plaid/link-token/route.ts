import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createLinkToken } from "@/lib/plaid";

export async function POST() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const linkToken = await createLinkToken(auth.user.id);
    return NextResponse.json({ link_token: linkToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create link token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
