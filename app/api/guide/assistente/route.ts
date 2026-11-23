import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rankPublishedInstructions } from "@/lib/ai/providers/anthropic";
import { logOperationalEvent } from "@/lib/observability/operations";
import { apiError, smallJson } from "@/lib/pratiche/api";
import { assistantTopics, applyInstructionSelection, isAssistantTopic, relevantInstructions } from "@/lib/pratiche/guide-assistant";
import { publicGuide } from "@/lib/pratiche/public-guides";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";

const noStore = { "Cache-Control": "no-store" };

function dailyLimit(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 500 ? parsed : fallback;
}

function unitCost(inputTokens: number, outputTokens: number) {
  const inputPrice = Number(process.env.GUIDE_ASSISTANT_INPUT_USD_PER_MILLION);
  const outputPrice = Number(process.env.GUIDE_ASSISTANT_OUTPUT_USD_PER_MILLION);
  if (!Number.isFinite(inputPrice) || inputPrice <= 0 || !Number.isFinite(outputPrice) || outputPrice <= 0) return undefined;
  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000;
}

export async function POST(request: Request) {
  try {
    const { slug, topic } = await smallJson(request);
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,100}$/.test(slug) || !isAssistantTopic(topic)) {
      return NextResponse.json({ error: "Domanda non disponibile." }, { status: 400, headers: noStore });
    }
    const item = await publicGuide(slug);
    if (!item) return NextResponse.json({ error: "Guida non disponibile." }, { status: 404, headers: noStore });

    const candidates = relevantInstructions(item.guide, topic).slice(0, 12);
    let instructions = candidates.slice(0, 3);
    let assisted = false;
    if (candidates.length > 3 && process.env.GUIDE_ASSISTANT_AI_ENABLED === "true" && process.env.ANTHROPIC_API_KEY) {
      const session = await auth();
      if (session?.user?.id) {
        const scopedLimit = { name: "guide-assistant:user", limit: dailyLimit(process.env.GUIDE_ASSISTANT_USER_LIMIT, 8), windowSeconds: 86400 };
        const overallLimit = { name: "guide-assistant:global", limit: dailyLimit(process.env.GUIDE_ASSISTANT_GLOBAL_LIMIT, 50), windowSeconds: 86400 };
        const scoped = await enforceRateLimits("guide-assistant", [{ rule: scopedLimit, subject: session.user.id }]);
        if (scoped.enforced && scoped.allowed) {
          const overall = await enforceRateLimits("guide-assistant", [{ rule: overallLimit, subject: "global" }]);
          if (overall.enforced && overall.allowed) {
            try {
              const ranked = await rankPublishedInstructions(assistantTopics[topic], candidates);
              const selection = applyInstructionSelection(candidates, ranked.output);
              logOperationalEvent("pratiche.guide_assistant_used", {
                model: ranked.model, inputTokens: ranked.inputTokens, outputTokens: ranked.outputTokens,
                estimatedCostUsd: unitCost(ranked.inputTokens, ranked.outputTokens), selectionAccepted: Boolean(selection),
              });
              if (selection) {
                instructions = selection;
                assisted = true;
              }
            } catch {
              logOperationalEvent("pratiche.guide_assistant_fallback", {}, "warn");
            }
          }
        }
      }
    }

    return NextResponse.json({
      instructions, assisted, source: item.guide.source, reviewedOn: item.reviewedOn,
      portal: topic === "presentazione" ? item.guide.link : undefined,
    }, { headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}
