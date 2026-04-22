"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { reorderCategory } from "@/lib/actions/library";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReorderButtonsProps {
  categoryId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function ReorderButtons({ categoryId, isFirst, isLast }: ReorderButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMove(direction: "up" | "down") {
    setLoading(true);
    try {
      await reorderCategory(categoryId, direction);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => handleMove("up")}
        disabled={isFirst || loading}
      >
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => handleMove("down")}
        disabled={isLast || loading}
      >
        <ArrowDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
