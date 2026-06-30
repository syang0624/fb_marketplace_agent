"use client";

import { NegotiationStage } from "@/lib/types";

interface StageTrackerProps {
  currentStage: NegotiationStage;
}

const STAGES: { key: NegotiationStage; label: string }[] = [
  { key: "outreach", label: "Outreach" },
  { key: "price_discovery", label: "Price" },
  { key: "condition_qa", label: "Condition" },
  { key: "counter_offer", label: "Counter" },
  { key: "logistics", label: "Logistics" },
  { key: "final_offer", label: "Final" }
];

const stageIndex = (stage: NegotiationStage): number => {
  if (stage === "withdrawn") return -1;
  return STAGES.findIndex((s) => s.key === stage);
};

// Minimal progress rail: a thin connector with the current stage labelled.
// Hierarchy via weight/opacity rather than coloured pills.
export function StageTracker({ currentStage }: StageTrackerProps) {
  const activeIndex = stageIndex(currentStage);
  const isWithdrawn = currentStage === "withdrawn";

  if (isWithdrawn) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-critical" />
        <span className="text-xs font-medium text-critical">Walked away</span>
      </div>
    );
  }

  const currentLabel = STAGES[activeIndex]?.label ?? "Outreach";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {STAGES.map((stage, index) => {
          const reached = index <= activeIndex;
          return (
            <div
              key={stage.key}
              className={`h-1 flex-1 rounded-full transition-colors ${
                reached ? "bg-ink" : "bg-line"
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink">{currentLabel}</span>
        <span className="text-[11px] tabular-nums text-ink/40">
          {Math.min(activeIndex + 1, STAGES.length)}/{STAGES.length}
        </span>
      </div>
    </div>
  );
}
