"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deletePoll } from "@/lib/actions/polls";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DeletePollButton({ pollId, pollTitle }: { pollId: string; pollTitle: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${pollTitle}"? Results will be saved to the audit log but the poll will be permanently removed.`)) return;
    setLoading(true);
    try {
      await deletePoll(pollId);
      toast.success("Poll deleted");
      router.push("/polls");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Delete Poll
    </Button>
  );
}
