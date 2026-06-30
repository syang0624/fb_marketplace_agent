"use client";

import { Negotiation } from "@/lib/types";
import { StageTracker } from "@/components/StageTracker";
import { ProductImage } from "@/components/ProductImage";

interface NegotiationLaneProps {
  negotiation: Negotiation;
  onViewChat: () => void;
  onTakeOver: () => void;
}

export function NegotiationLane({ negotiation, onViewChat, onTakeOver }: NegotiationLaneProps) {
  const { listing, stage, currentPrice, agentReasoning, messages, sellerName, userTookOver } =
    negotiation;
  const lastMessage = [...messages].reverse().find((m) => m.role === "buyer" || m.role === "seller");
  const savings = listing.price - currentPrice;
  const savingsPercent = listing.price > 0 ? Math.round((savings / listing.price) * 100) : 0;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ProductImage
          src={listing.image}
          alt={listing.title}
          fallbackLabel="IMG"
          className="h-11 w-11 flex-shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-ink">{listing.title}</h3>
          <p className="text-xs text-ink/40">{sellerName}</p>
        </div>
      </div>

      {/* Stage */}
      <StageTracker currentStage={stage} />

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-light tracking-tight text-ink">${currentPrice}</span>
        {savings > 0 && (
          <>
            <span className="text-xs text-ink/35 line-through">${listing.price}</span>
            <span className="text-xs font-medium text-positive">−{savingsPercent}%</span>
          </>
        )}
      </div>

      {/* Agent reasoning */}
      {agentReasoning && (
        <p className="border-l-2 border-line pl-3 text-xs italic leading-relaxed text-ink/50">
          {agentReasoning}
        </p>
      )}

      {/* Last message preview */}
      <div className="min-h-[2.5rem] flex-1">
        {lastMessage ? (
          <p className="text-xs leading-relaxed text-ink/60">
            <span className="font-medium text-ink/40">
              {lastMessage.role === "buyer" ? "You: " : "Seller: "}
            </span>
            {lastMessage.content.length > 90
              ? lastMessage.content.slice(0, 90) + "…"
              : lastMessage.content}
          </p>
        ) : (
          <p className="text-xs italic text-ink/30">Waiting to start…</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewChat}
          className="flex-1 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-mist"
        >
          View chat
        </button>
        <button
          onClick={onTakeOver}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            userTookOver
              ? "bg-ink text-white hover:bg-ink/90"
              : "border border-line text-ink hover:bg-mist"
          }`}
        >
          {userTookOver ? "You control" : "Take over"}
        </button>
      </div>
    </article>
  );
}
