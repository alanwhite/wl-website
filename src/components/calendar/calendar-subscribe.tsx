"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";

export function CalendarSubscribe() {
  const [copied, setCopied] = useState(false);

  function handleSubscribe() {
    const url = `${window.location.origin}/api/calendar.ics`;
    const webcalUrl = url.replace(/^https?:/, "webcal:");

    // Try to open webcal URL (works on iOS/macOS)
    window.open(webcalUrl, "_blank");

    // Also copy to clipboard as fallback
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Calendar URL copied — paste it into your calendar app if it didn't open automatically");
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSubscribe}>
      {copied ? <Check className="mr-1 h-4 w-4" /> : <LinkIcon className="mr-1 h-4 w-4" />}
      Subscribe
    </Button>
  );
}
