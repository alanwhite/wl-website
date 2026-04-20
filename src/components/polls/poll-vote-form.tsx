"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { castVotes } from "@/lib/actions/polls";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface PollOption {
  id: string;
  text: string;
}

interface PollVoteFormProps {
  pollId: string;
  options: PollOption[];
  currentVoteOptionIds: string[];
  maxVotes: number; // 1 = single, 0 = unlimited, N = max N
  isClosed: boolean;
}

export function PollVoteForm({ pollId, options, currentVoteOptionIds, maxVotes, isClosed }: PollVoteFormProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentVoteOptionIds));
  const [loading, setLoading] = useState(false);
  const isSingle = maxVotes === 1;
  const isUnlimited = maxVotes === 0;
  const atLimit = !isUnlimited && !isSingle && selected.size >= maxVotes;

  const hasChanged =
    selected.size !== currentVoteOptionIds.length ||
    [...selected].some((id) => !currentVoteOptionIds.includes(id));

  function toggleOption(optionId: string) {
    if (isClosed) return;
    const next = new Set(selected);

    if (isSingle) {
      // Single choice — replace
      next.clear();
      next.add(optionId);
    } else if (next.has(optionId)) {
      // Deselect
      next.delete(optionId);
    } else if (!atLimit || selected.has(optionId)) {
      // Add if under limit
      next.add(optionId);
    }

    setSelected(next);
  }

  async function handleVote() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await castVotes(pollId, [...selected]);
      toast.success(currentVoteOptionIds.length > 0 ? "Vote updated" : "Vote cast");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to vote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!isSingle && !isClosed && (
        <p className="text-sm text-muted-foreground">
          {isUnlimited
            ? "Select as many as you like"
            : `Select up to ${maxVotes} option${maxVotes === 1 ? "" : "s"} (${selected.size} of ${maxVotes} chosen)`}
        </p>
      )}
      {options.map((option) => {
        const isSelected = selected.has(option.id);
        const isDisabled = isClosed || (!isSelected && atLimit);

        return (
          <button
            key={option.id}
            type="button"
            disabled={isDisabled}
            onClick={() => toggleOption(option.id)}
            className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
              isSelected
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:border-primary/50"
            } ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="flex items-center gap-3">
              {isSingle ? (
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
              ) : (
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              )}
              {option.text}
            </div>
          </button>
        );
      })}
      {!isClosed && (
        <Button onClick={handleVote} disabled={selected.size === 0 || loading || !hasChanged} className="w-full">
          {loading ? "Submitting..." : currentVoteOptionIds.length > 0 ? "Change Vote" : "Cast Vote"}
        </Button>
      )}
    </div>
  );
}
