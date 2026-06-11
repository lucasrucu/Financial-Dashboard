import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { FidelityCSVError, parseFidelityCSV } from "@/lib/fidelity/csv";
import { checkDuplicateSnapshot } from "@/lib/fidelity/import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = parseFidelityCSV(buffer);
    const duplicate = await checkDuplicateSnapshot(auth.supabase, preview.fileHash);

    if (duplicate) {
      preview.warnings.push(
        `This snapshot was already imported on ${duplicate.imported_at}`
      );
    }

    return NextResponse.json({ preview, duplicate: Boolean(duplicate) });
  } catch (error) {
    if (error instanceof FidelityCSVError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to parse Fidelity CSV";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
