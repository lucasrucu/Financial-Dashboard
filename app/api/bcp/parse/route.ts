import { NextResponse } from "next/server";

import {
  checkDuplicateImport,
  parseBcpStatementFile,
  resolveBcpPassword,
} from "@/lib/bcp/import";
import { BcpPdfError } from "@/lib/bcp/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const passwordOverride = formData.get("password");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const password = resolveBcpPassword(
      typeof passwordOverride === "string" ? passwordOverride : null
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseBcpStatementFile(buffer, password);
    const duplicate = await checkDuplicateImport(preview.fileHash);

    if (duplicate) {
      preview.warnings.push(
        `This statement was already imported on ${duplicate.imported_at}`
      );
    }

    return NextResponse.json({
      preview,
      duplicate: Boolean(duplicate),
    });
  } catch (error) {
    if (error instanceof BcpPdfError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to parse BCP statement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
