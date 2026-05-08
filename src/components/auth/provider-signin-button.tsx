"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  children?: React.ReactNode;
}

export function ProviderSignInButton({ label, children }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full"
      size="lg"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        children
      )}
      {pending ? `Connecting to ${label}…` : `Continue with ${label}`}
    </Button>
  );
}
