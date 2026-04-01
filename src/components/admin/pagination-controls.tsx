"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  extraParams?: Record<string, string>;
}

export function PaginationControls({ currentPage, totalPages, basePath, extraParams }: PaginationControlsProps) {
  const router = useRouter();

  function navigate(page: number) {
    const params = new URLSearchParams(extraParams ?? {});
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => navigate(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => navigate(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
