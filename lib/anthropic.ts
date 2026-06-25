import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { AiAnalysisPayload, AiInsightResponse } from "@/types/ai";

export const FINANCIAL_ROAST_SYSTEM_PROMPT = `You are a sharp personal finance coach reviewing spending and investment data for a 22-year-old who is comfortable with aggressive, high-risk moves.
Your tone is playful and direct — a friendly roast, not cruelty. Be specific with numbers from the payload.

When a "portfolio" field is present in the payload, add honest buy/hold/sell/watch recommendations per position, factoring in the user's spending habits, savings rate, and goals. Don't be conservative — this person can handle volatility and has a long time horizon.

Always respond with valid JSON only (no markdown fences) using this exact shape:
{
  "roast": "2-3 sentence punchy summary of their financial behavior",
  "wins": ["up to 3 things they're doing well"],
  "actions": ["up to 3 concrete next steps"],
  "flagged": ["up to 3 suspicious or wasteful patterns"],
  "allocations": { "goal_name": "short advice on how much to allocate this month" },
  "portfolio": {
    "summary": "2-3 sentence overall portfolio read given age 22 and high risk tolerance",
    "moves": [{ "ticker": "SYMBOL", "action": "hold|buy|sell|watch", "rationale": "one sentence" }]
  }
}
Omit the "portfolio" key entirely if no portfolio data is in the payload.
Use USD amounts as provided. Keep each string field concise.`;

function extractJson(raw: string): string {
  const text = raw.trim();

  // Strip markdown code fences if Claude wraps the response despite instructions
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Otherwise isolate the first balanced top-level JSON object. This tolerates
  // any stray prose Claude might emit before or after the object. We track
  // string state so braces inside string values don't throw off the depth count.
  const start = text.indexOf("{");
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  // Never balanced — the object is truncated. Return from the first brace so the
  // caller's JSON.parse fails and we surface a clear error.
  return text.slice(start);
}

export async function analyzeFinances(
  payload: AiAnalysisPayload
): Promise<AiInsightResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    // The response is large (roast + wins + actions + flagged + per-goal
    // allocations + a portfolio summary + one move per holding). 1500 tokens
    // truncated it mid-object on richer accounts, which broke JSON.parse — give
    // it ample headroom. Still well under the streaming threshold.
    max_tokens: 4096,
    system: FINANCIAL_ROAST_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  // A truncated response is incomplete JSON — catch it explicitly rather than
  // letting it fall through to an opaque parse failure.
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "The AI analysis was cut off before it finished. Please try again."
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let parsed: AiInsightResponse;
  try {
    parsed = JSON.parse(extractJson(textBlock.text)) as AiInsightResponse;
  } catch {
    // Log the raw response server-side for debugging; never surface it to the
    // user — a half-written roast blob is not something they should see.
    console.error(
      "[analyzeFinances] Failed to parse Claude response as JSON. Raw response:",
      textBlock.text
    );
    throw new Error("Could not read the AI analysis. Please try again.");
  }

  return {
    roast: parsed.roast ?? "",
    wins: parsed.wins ?? [],
    actions: parsed.actions ?? [],
    flagged: parsed.flagged ?? [],
    allocations: parsed.allocations ?? {},
    portfolio: parsed.portfolio ?? undefined,
  };
}
