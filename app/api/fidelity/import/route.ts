import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { importFidelityPortfolio } from "@/lib/fidelity/import";
import type { FidelityImportPayload } from "@/types/fidelity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const body = (await request.json()) as FidelityImportPayload;

    if (!body.fileHash) {
      return NextResponse.json({ error: "Missing fileHash" }, { status: 400 });
    }

    if (!body.snapshotDate) {
      return NextResponse.json({ error: "Missing snapshotDate" }, { status: 400 });
    }

    if (!Array.isArray(body.positions) || body.positions.length === 0) {
      return NextResponse.json({ error: "No positions to import" }, { status: 400 });
    }

    const result = await importFidelityPortfolio(auth.supabase, auth.user.id, body);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import Fidelity portfolio";
    const status = message.includes("already imported") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
