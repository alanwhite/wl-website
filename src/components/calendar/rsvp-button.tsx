"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rsvpEvent, removeRsvp } from "@/lib/actions/calendar";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, HelpCircle } from "lucide-react";

interface RsvpButtonProps {
  eventId: string;
  currentStatus?: string | null; // "accepted" | "declined" | "maybe" | null
}

export function RsvpButton({ eventId, currentStatus }: RsvpButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRsvp(status: "accepted" | "declined" | "maybe") {
    setLoading(true);
    try {
      if (currentStatus === status) {
        await removeRsvp(eventId);
        toast.success("RSVP removed");
      } else {
        await rsvpEvent(eventId, status);
        toast.success(
          status === "accepted" ? "Accepted" :
          status === "declined" ? "Declined" : "Marked as maybe",
        );
      }
      router.refresh();
    } catch {
      toast.error("Failed to update RSVP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant={currentStatus === "accepted" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("accepted")}
        disabled={loading}
      >
        <Check className="mr-1 h-3.5 w-3.5" />
        Accept
      </Button>
      <Button
        variant={currentStatus === "maybe" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("maybe")}
        disabled={loading}
      >
        <HelpCircle className="mr-1 h-3.5 w-3.5" />
        Maybe
      </Button>
      <Button
        variant={currentStatus === "declined" ? "destructive" : "outline"}
        size="sm"
        onClick={() => handleRsvp("declined")}
        disabled={loading}
      >
        <X className="mr-1 h-3.5 w-3.5" />
        Decline
      </Button>
    </div>
  );
}
