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
Keep total output under 900 tokens. Use USD amounts as provided.`;

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
    max_tokens: 900,
    system: FINANCIAL_ROAST_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const parsed = JSON.parse(textBlock.text) as AiInsightResponse;

  return {
    roast: parsed.roast ?? "",
    wins: parsed.wins ?? [],
    actions: parsed.actions ?? [],
    flagged: parsed.flagged ?? [],
    allocations: parsed.allocations ?? {},
    portfolio: parsed.portfolio ?? undefined,
  };
}
