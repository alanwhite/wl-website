"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/webauthn";
import { Loader2 } from "lucide-react";

/**
 * Discreet "already set up a passkey?" link shown beneath the OAuth providers
 * on the login page. Designed to be invisible to first-time users (who use
 * OAuth) and only catch the eye of returning members who set up a passkey
 * from their profile. Auto-hides on browsers without WebAuthn support.
 */
export function PasskeyLoginButton() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "PublicKeyCredential" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(true);
    }
  }, []);

  if (!supported) return null;

  async function handlePasskeyLogin() {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("passkey", { redirect: false });
      if (result?.error) {
        setError("Couldn't sign in with that — try one of the options above instead.");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Couldn't sign in with that — try one of the options above instead.");
      setLoading(false);
    }
  }

  return (
    <div className="pt-3 text-center">
      <button
        type="button"
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {loading ? "Signing in…" : "Already set up a passkey? Sign in with this device"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
