import { NextResponse } from "next/server";

import { importBcpStatement } from "@/lib/bcp/import";
import type { BcpImportPayload } from "@/types/bcp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BcpImportPayload;

    if (!body.fileHash || !body.accountCode || !body.period?.start || !body.period?.end) {
      return NextResponse.json({ error: "Missing import payload fields" }, { status: 400 });
    }

    if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
      return NextResponse.json({ error: "No transactions to import" }, { status: 400 });
    }

    const result = await importBcpStatement(body);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import BCP statement";
    const status = message.includes("already been imported") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
