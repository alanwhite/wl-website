"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { castVote } from "@/lib/actions/polls";
import { toast } from "sonner";

interface PollOption {
  id: string;
  text: string;
}

interface PollVoteFormProps {
  pollId: string;
  options: PollOption[];
  currentVoteOptionId: string | null;
  isClosed: boolean;
}

export function PollVoteForm({ pollId, options, currentVoteOptionId, isClosed }: PollVoteFormProps) {
  const [selected, setSelected] = useState<string | null>(currentVoteOptionId);
  const [loading, setLoading] = useState(false);
  const hasChanged = selected !== currentVoteOptionId;

  async function handleVote() {
    if (!selected) return;
    setLoading(true);
    try {
      await castVote(pollId, selected);
      toast.success(currentVoteOptionId ? "Vote updated" : "Vote cast");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to vote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={isClosed}
          onClick={() => setSelected(option.id)}
          className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
            selected === option.id
              ? "border-primary bg-primary/10 font-medium"
              : "border-border hover:border-primary/50"
          } ${isClosed ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selected === option.id ? "border-primary bg-primary" : "border-muted-foreground/40"
              }`}
            >
              {selected === option.id && (
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            {option.text}
          </div>
        </button>
      ))}
      {!isClosed && (
        <Button onClick={handleVote} disabled={!selected || loading || !hasChanged} className="w-full">
          {loading ? "Submitting..." : currentVoteOptionId ? "Change Vote" : "Cast Vote"}
        </Button>
      )}
    </div>
  );
}
