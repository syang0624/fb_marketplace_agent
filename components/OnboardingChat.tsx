"use client";

import { useEffect, useRef, useState } from "react";
import { BuyerProfile, Message } from "@/lib/types";
import { ChatBubble } from "@/components/ChatBubble";

interface OnboardingChatProps {
  onComplete: (profile: BuyerProfile) => void;
}

function parseProfileFromText(text: string): BuyerProfile | null {
  const block = text.match(/\{[\s\S]*\}/)?.[0];
  if (!block) return null;
  try {
    const parsed = JSON.parse(block) as BuyerProfile;
    if (
      parsed.bikeType &&
      typeof parsed.budgetMin === "number" &&
      typeof parsed.budgetMax === "number" &&
      parsed.location
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "I'm MRI, your buying agent. I'll search the marketplace for the best deals and negotiate for you. What are you looking for?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!input.trim() || loading) return;

    const buyerMessage: Message = { role: "buyer", content: input.trim(), timestamp: Date.now() };
    const nextMessages = [...messages, buyerMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "onboarding",
          messages: nextMessages.map((m) => ({
            role: m.role === "buyer" ? "user" : "assistant",
            content: m.content
          }))
        })
      });

      const data = (await response.json()) as { reply: string };
      const assistantMessage: Message = {
        role: "seller",
        content: data.reply,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const parsed = parseProfileFromText(data.reply);
      if (parsed) {
        onComplete(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[78vh] w-full max-w-2xl flex-col">
      {/* Header — typographic, no container */}
      <div className="px-1 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-ink/40">Step 1</p>
        <h2 className="mt-2 text-2xl font-light tracking-tight text-ink">
          Tell us what you want
        </h2>
        <p className="mt-1 text-sm text-ink/50">
          What you want, where you are, and your budget.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-line bg-paper p-5">
        {messages.map((message, index) => (
          <ChatBubble
            key={`${message.timestamp}-${index}`}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}
        {loading && (
          <div className="mr-auto inline-flex items-center gap-1.5 rounded-md bg-mist px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/60 animate-pulseDot" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink/60 animate-pulseDot [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink/60 animate-pulseDot [animation-delay:0.4s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. what you're after, your location, and budget"
          className="flex-1 rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink/35 outline-none transition-colors focus:border-ink/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
