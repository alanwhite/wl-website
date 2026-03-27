"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { closePoll } from "@/lib/actions/polls";
import { toast } from "sonner";

export function ClosePollButton({ pollId }: { pollId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClose() {
    if (!confirm("Are you sure you want to close this poll? Voting will be disabled.")) return;
    setLoading(true);
    try {
      await closePoll(pollId);
      toast.success("Poll closed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close poll");
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleClose} disabled={loading}>
      {loading ? "Closing..." : "Close Poll"}
    </Button>
  );
}
