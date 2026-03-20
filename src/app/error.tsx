"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold">500</h1>
      <p className="mt-4 text-xl text-muted-foreground">Something went wrong</p>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try Again
      </Button>
    </div>
  );
}
