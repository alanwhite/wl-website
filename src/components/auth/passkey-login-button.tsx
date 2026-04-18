"use client";

import { useState } from "react";
import { signIn } from "next-auth/webauthn";
import { Button } from "@/components/ui/button";

export function PasskeyLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasskeyLogin() {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("passkey", { redirect: false });
      if (result?.error) {
        setError("Sign in failed. Try using one of the buttons above instead.");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Sign in failed. Try using one of the buttons above instead.");
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
        {loading ? "Signing in..." : "Sign in with your device"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
