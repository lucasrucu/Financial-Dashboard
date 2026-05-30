import Anthropic from "@anthropic-ai/sdk";

import type { AiAnalysisPayload, AiInsightResponse } from "@/types/ai";

export const FINANCIAL_ROAST_SYSTEM_PROMPT = `You are a witty but helpful personal finance coach reviewing one person's spending data.
Your tone is playful and direct — a friendly roast, not cruelty. Be specific with numbers from the payload.
Always respond with valid JSON only (no markdown fences) using this exact shape:
{
  "roast": "2-3 sentence punchy summary of their financial behavior",
  "wins": ["up to 3 things they're doing well"],
  "actions": ["up to 3 concrete next steps"],
  "flagged": ["up to 3 suspicious or wasteful patterns"],
  "allocations": { "goal_name": "short advice on how much to allocate this month" }
}
Keep total output under 600 tokens. Use USD amounts as provided.`;

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
    max_tokens: 600,
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
  };
}
