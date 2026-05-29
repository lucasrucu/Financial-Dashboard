import { createHash } from "node:crypto";

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pathToFileURL } from "node:url";
import path from "node:path";

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

const BOP_PREFIX = "$BOP$";

export class BcpPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BcpPdfError";
  }
}

export function stripBopPrefix(buffer: Buffer): Uint8Array {
  const prefix = Buffer.from(BOP_PREFIX);
  const pdfMarker = Buffer.from("%PDF");

  let start = 0;

  if (buffer.subarray(0, prefix.length).equals(prefix)) {
    start = prefix.length;
  }

  const pdfStart = buffer.indexOf(pdfMarker, start);

  if (pdfStart === -1) {
    throw new BcpPdfError("Invalid BCP PDF: missing PDF header");
  }

  return new Uint8Array(buffer.subarray(pdfStart));
}

interface TextItem {
  x: number;
  y: number;
  str: string;
}

export interface BcpPdfPageText {
  pageNumber: number;
  lines: string[];
  items: TextItem[];
}

export async function extractBcpPdfText(
  buffer: Buffer,
  password: string
): Promise<BcpPdfPageText[]> {
  const data = stripBopPrefix(buffer);

  let pdf;

  try {
    pdf = await getDocument({ data, password, useSystemFonts: true }).promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read PDF";

    if (/password/i.test(message)) {
      throw new BcpPdfError("Incorrect PDF password");
    }

    throw new BcpPdfError(message);
  }

  const pages: BcpPdfPageText[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lineMap = new Map<number, TextItem[]>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) {
        continue;
      }

      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      const bucket = lineMap.get(y) ?? [];
      bucket.push({ x, y, str: item.str.trim() });
      lineMap.set(y, bucket);
    }

    const items: TextItem[] = [];
    const lines = Array.from(lineMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([, rowItems]) => {
        rowItems.sort((a, b) => a.x - b.x);
        items.push(...rowItems);
        return rowItems.map((entry) => entry.str).join(" ").replace(/\s+/g, " ").trim();
      })
      .filter(Boolean);

    pages.push({ pageNumber, lines, items });
  }

  return pages;
}

export function hashFileBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
