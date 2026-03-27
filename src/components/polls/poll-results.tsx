"use client";

interface VoterInfo {
  id: string;
  name: string | null;
}

interface OptionResult {
  id: string;
  text: string;
  count: number;
  voters: VoterInfo[];
}

interface PollResultsProps {
  options: OptionResult[];
  totalVotes: number;
  isAnonymous: boolean;
  isClosed: boolean;
  userVoteOptionId: string | null;
}

export function PollResults({ options, totalVotes, isAnonymous, isClosed, userVoteOptionId }: PollResultsProps) {
  // Anonymous + open: only show user's own vote status
  if (isAnonymous && !isClosed) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This is an anonymous poll. Results will be visible after the poll closes.</p>
        {userVoteOptionId && (
          <p>You have cast your vote. You can change it until the poll is closed.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""} total</p>
      {options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
        const isUserVote = option.id === userVoteOptionId;
        return (
          <div key={option.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={isUserVote ? "font-medium" : ""}>
                {option.text}
                {isUserVote && <span className="ml-2 text-xs text-muted-foreground">(your vote)</span>}
              </span>
              <span className="text-muted-foreground">{option.count} ({pct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Show voter names for non-anonymous polls */}
            {!isAnonymous && option.voters.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {option.voters.map((v) => v.name || "Anonymous").join(", ")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
