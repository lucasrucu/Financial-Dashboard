import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { sendAccessRequestEmail } from "@/lib/email";

// Public endpoint backing the landing page "Request Access" form. No auth.
// Validates the email, enforces consent, rate-limits abuse, records the request,
// and emails the operator. Allowed through middleware via PUBLIC_API_PREFIXES.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_PER_IP_PER_HOUR = 3;
const MAX_PER_IP_PER_DAY = 8;
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export async function POST(request: Request) {
  let body: { email?: unknown; note?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  const consent = body.consent === true;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { error: "Please accept the privacy policy to continue." },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - DEDUPE_WINDOW_MS).toISOString();

  // Rate-limit by IP (skip when the proxy gives us nothing useful).
  if (ip !== "unknown") {
    const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
      supabase
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", hourAgo),
      supabase
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", dayAgo),
    ]);

    if ((hourCount ?? 0) >= MAX_PER_IP_PER_HOUR || (dayCount ?? 0) >= MAX_PER_IP_PER_DAY) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Dedupe: if this email already asked recently, acknowledge without re-emailing.
  const { data: existing } = await supabase
    .from("access_requests")
    .select("id")
    .eq("email", email)
    .gte("created_at", dayAgo)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const { error: insertError } = await supabase.from("access_requests").insert({
    email,
    note: note || null,
    ip: ip === "unknown" ? null : ip,
    user_agent: userAgent,
  });

  if (insertError) {
    return NextResponse.json({ error: "Could not save your request." }, { status: 500 });
  }

  // Best-effort notification — the request is already saved.
  await sendAccessRequestEmail({ email, note, ip });

  return NextResponse.json({ ok: true });
}
