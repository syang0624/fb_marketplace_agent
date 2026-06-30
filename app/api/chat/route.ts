// PedalBot v3 — single mode-switched chat route.
// All inference goes through NVIDIA Nemotron 3 Ultra on GMI Cloud via the
// OpenAI-compatible chat completions API. If no key is configured (or the call
// fails), we return a deterministic fallback so local dev + the demo survive.

import OpenAI from "openai";
import {
  ONBOARDING_PROMPT,
  agentTurnPrompt,
  evaluatePrompt,
  modifyLogisticsPrompt,
  normalizeListingPrompt,
  personaFromListingPrompt,
  queryPlannerPrompt,
  rankingPrompt,
  reopenCounterPrompt,
  sellerPrompt,
} from "@/lib/prompts";
import {
  BuyerProfile,
  ChatMode,
  Listing,
  MarketplaceRawListing,
  Negotiation,
  SellerPersona,
} from "@/lib/types";

interface ChatRequestBody {
  mode: ChatMode;
  messages: Array<{ role: string; content: string }>;
  context?: {
    profile?: BuyerProfile;
    rawListing?: MarketplaceRawListing;
    listing?: Listing;
    listings?: Listing[];
    negotiation?: Negotiation;
    persona?: SellerPersona;
    changes?: Record<string, string>;
    newTarget?: number;
  };
}

const MODEL = process.env.GMI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";

// GMI Cloud Model Hub is OpenAI-compatible. Base URL gets `/v1` appended.
const client =
  process.env.GMI_API_KEY && process.env.GMI_API_BASE_URL
    ? new OpenAI({
        baseURL: `${process.env.GMI_API_BASE_URL}/v1`,
        apiKey: process.env.GMI_API_KEY,
      })
    : null;

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequestBody;
  const { mode, messages, context } = body;

  let systemPrompt: string;
  switch (mode) {
    case "onboarding":
      systemPrompt = ONBOARDING_PROMPT;
      break;
    case "query_plan":
      systemPrompt = queryPlannerPrompt(context!.profile as BuyerProfile);
      break;
    case "normalize_listing":
      systemPrompt = normalizeListingPrompt(context!.rawListing as MarketplaceRawListing);
      break;
    case "rank":
      systemPrompt = rankingPrompt(context!.profile as BuyerProfile, context!.listings ?? []);
      break;
    case "persona_from_listing":
      systemPrompt = personaFromListingPrompt(
        context!.listing as Listing,
        context!.profile as BuyerProfile
      );
      break;
    case "agent_turn":
      systemPrompt = agentTurnPrompt(
        context!.negotiation as Negotiation,
        context!.profile as BuyerProfile
      );
      break;
    case "seller":
      systemPrompt = sellerPrompt(
        context!.negotiation as Negotiation,
        context!.persona as SellerPersona
      );
      break;
    case "evaluate_offer":
      systemPrompt = evaluatePrompt(
        context!.negotiation as Negotiation,
        context!.profile as BuyerProfile
      );
      break;
    case "modify_logistics":
      systemPrompt = modifyLogisticsPrompt(
        context!.negotiation as Negotiation,
        context!.changes ?? {}
      );
      break;
    case "reopen_counter":
      systemPrompt = reopenCounterPrompt(
        context!.negotiation as Negotiation,
        context!.newTarget ?? 0
      );
      break;
    default:
      return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  // Higher temperature for character/creative modes, low for structured ones.
  const temperature = mode === "seller" || mode === "persona_from_listing" ? 0.7 : 0.2;

  if (!client) {
    return Response.json({ reply: fallbackReply(mode, context) });
  }

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1000,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        ...normalizeMessages(messages ?? []),
      ],
    });
    const text = response.choices[0]?.message?.content || "";
    return Response.json({ reply: text });
  } catch (err) {
    console.error("[/api/chat] GMI call failed, using fallback:", err);
    return Response.json({ reply: fallbackReply(mode, context) });
  }
}

function normalizeMessages(
  messages: Array<{ role: string; content: string }>
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map((msg) => ({
    role:
      msg.role === "assistant" || msg.role === "seller" || msg.role === "system"
        ? "assistant"
        : "user",
    content: msg.content,
  }));
}

// Deterministic fallbacks so the demo never hard-fails without GMI keys.
function fallbackReply(mode: ChatMode, context?: ChatRequestBody["context"]): string {
  switch (mode) {
    case "onboarding":
      return JSON.stringify({
        bikeType: "road bike",
        frameSize: "56cm",
        budgetMin: 0,
        budgetMax: 1000,
        preferences: "weekend rides, prefers a clean build",
        location: "San Francisco, CA",
        searchRadiusKm: 25,
        walkAwayPrice: 1100,
        autoAcceptThreshold: 800,
        deadline: "no rush",
        meetRadius: 10,
        meetWindows: "weekday evenings, weekend mornings",
        nonNegotiables: ["no crash history"],
      });

    case "query_plan": {
      const p = context?.profile;
      return JSON.stringify({
        location: p?.location ?? "San Francisco, CA",
        radiusKm: p?.searchRadiusKm ?? 25,
        minPrice: p?.budgetMin ?? 0,
        maxPrice: p?.budgetMax ?? 1200,
        queries: [p?.bikeType ?? "road bike", "used bicycle", "bike for sale"],
        includeTerms: [p?.bikeType ?? "bike", p?.frameSize ?? ""].filter(Boolean),
        excludeTerms: ["kids", "broken", "parts only"],
        condition: "used",
        dateListed: "last_7_days",
        countPerQuery: 20,
      });
    }

    case "normalize_listing": {
      const r = context?.rawListing;
      return JSON.stringify({
        title: r?.title ?? "Bike",
        price: r?.price ?? 0,
        fairValue: Math.round((r?.price ?? 0) * 1.3),
        specs: "",
        description: r?.description ?? "",
        riskFlags: [],
      });
    }

    case "rank": {
      const listings = context?.listings ?? [];
      const ranked = listings.slice(0, 3).map((l, i) => ({
        listingId: l.id,
        score: Math.max(55, 88 - i * 12),
        dealQuality: (i === 0 ? "great" : i === 1 ? "good" : "fair") as "great" | "good" | "fair",
        valueScore: 80 - i * 8,
        relevanceScore: 82 - i * 6,
        conditionScore: 70,
        distanceScore: 75,
        riskScore: 85 - (l.riskFlags?.length ?? 0) * 15,
        summary: `${l.title} at $${l.price}${
          l.riskFlags?.length ? ` — note: ${l.riskFlags[0]}` : " — solid match for your request."
        }`,
        suggestedFirstOffer: Math.round(l.price * 0.85),
        maxRecommendedPrice: Math.round(l.price * 0.98),
      }));
      return JSON.stringify(ranked);
    }

    case "persona_from_listing": {
      const l = context?.listing;
      return JSON.stringify({
        name: "Marketplace Seller",
        style: "friendly and responsive",
        priceFloor: Math.round((l?.price ?? 100) * 0.8),
        hiddenInfo: "prefers a quick local pickup",
        concessionPattern: "easy_drop",
      });
    }

    case "agent_turn": {
      const neg = context?.negotiation;
      const current = neg?.currentPrice ?? neg?.listing.price ?? 100;
      const next = Math.round(current * 0.9);
      return JSON.stringify({
        message: `Thanks! Would you consider $${next} if I can pick up this week?`,
        newStage: "counter_offer",
        currentPrice: next,
        reasoning: "Opening a reasonable counter below asking to find their floor.",
      });
    }

    case "seller": {
      const persona = context?.persona;
      const neg = context?.negotiation;
      const floor = persona?.priceFloor ?? Math.round((neg?.currentPrice ?? 100) * 0.8);
      const current = neg?.currentPrice ?? 100;
      const next = Math.max(floor, Math.round(current * 0.95));
      return JSON.stringify({
        reply:
          next > floor
            ? `I could do $${next} if you can pick up soon.`
            : `I'm pretty firm at $${floor}, but it's a great bike.`,
        newPrice: next,
      });
    }

    case "evaluate_offer": {
      const neg = context?.negotiation;
      const profile = context?.profile;
      const price = neg?.currentPrice ?? 0;
      const verdict =
        profile && price <= profile.autoAcceptThreshold
          ? "accept"
          : profile && price > profile.walkAwayPrice
            ? "walk_away"
            : "continue";
      return JSON.stringify({
        verdict,
        reasoning: `Current price $${price} vs walk-away $${profile?.walkAwayPrice ?? "?"}.`,
      });
    }

    case "modify_logistics":
      return JSON.stringify({
        message: "Quick change on my end — could we adjust the meet time/place? Everything else stays the same.",
      });

    case "reopen_counter": {
      const target = context?.newTarget ?? 0;
      return JSON.stringify({
        message: `Circling back — could you do $${target}? I'm ready to close this week.`,
        reasoning: "Re-engaging with a firm but friendly counter at the buyer's new target.",
      });
    }

    default:
      return "{}";
  }
}
