"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface YearSelectorProps {
  year: number;
}

export function YearSelector({ year }: YearSelectorProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center gap-4 print:hidden">
      <Button variant="outline" size="icon" onClick={() => router.push(`/financials/annual?year=${year - 1}`)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-lg font-semibold min-w-[80px] text-center">{year}</span>
      <Button variant="outline" size="icon" onClick={() => router.push(`/financials/annual?year=${year + 1}`)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
