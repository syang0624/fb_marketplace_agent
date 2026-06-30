"use client";

import { useState } from "react";
import { BuyerProfile, Negotiation } from "@/lib/types";
import { NegotiationLane } from "@/components/NegotiationLane";
import { ChatDrawer } from "@/components/ChatDrawer";

interface NegotiationDashboardProps {
  negotiations: Negotiation[];
  profile: BuyerProfile;
  onNegotiationUpdate: (updated: Negotiation) => void;
  onSendMessage?: (sellerId: string, content: string) => void;
}

export function NegotiationDashboard({
  negotiations,
  profile,
  onNegotiationUpdate,
  onSendMessage
}: NegotiationDashboardProps) {
  const [drawerSellerId, setDrawerSellerId] = useState<string | null>(null);

  const drawerNegotiation = drawerSellerId
    ? negotiations.find((n) => n.sellerId === drawerSellerId) ?? null
    : null;

  const handleTakeOver = (negotiation: Negotiation) => {
    onNegotiationUpdate({
      ...negotiation,
      userTookOver: !negotiation.userTookOver
    });
  };

  const handleSendMessage = (content: string) => {
    if (drawerSellerId && onSendMessage) {
      onSendMessage(drawerSellerId, content);
    }
  };

  const handleReturnControl = () => {
    if (drawerNegotiation) {
      onNegotiationUpdate({
        ...drawerNegotiation,
        userTookOver: false
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-4">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-ink/40">Step 3</p>
        <h2 className="mt-2 text-2xl font-light tracking-tight text-ink">Negotiations</h2>
        <p className="mt-1 text-sm text-ink/50">
          MRI is simulating negotiations against the live listings you selected.
          Not messaging real sellers.
        </p>
      </div>

      {/* 3-lane layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {negotiations.map((neg) => (
          <NegotiationLane
            key={neg.sellerId}
            negotiation={neg}
            onViewChat={() => setDrawerSellerId(neg.sellerId)}
            onTakeOver={() => handleTakeOver(neg)}
          />
        ))}
      </div>

      {/* Chat drawer */}
      {drawerNegotiation && (
        <ChatDrawer
          negotiation={drawerNegotiation}
          onClose={() => setDrawerSellerId(null)}
          onSendMessage={handleSendMessage}
          onTakeOver={() => handleTakeOver(drawerNegotiation)}
          onReturnControl={handleReturnControl}
        />
      )}
    </div>
  );
}
