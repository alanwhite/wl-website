"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function PasskeyLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasskeyLogin() {
    setLoading(true);
    setError(null);
    try {
      await signIn("passkey", { callbackUrl: "/dashboard" });
    } catch {
      setError("Passkey authentication failed. Try signing in with an OAuth provider instead.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePasskeyLogin}
        disabled={loading}
        variant="default"
        className="w-full"
        size="lg"
      >
        {loading ? "Authenticating..." : "Sign in with Passkey"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
