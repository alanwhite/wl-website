"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/webauthn";
import { Button } from "@/components/ui/button";
import { Loader2, Fingerprint } from "lucide-react";

const KNOWN_KEY = "wl-passkey-known";

/**
 * Marks this browser as having a known passkey for this origin. Called after
 * a successful passkey sign-in or registration. Read by PasskeyLoginPrompt
 * on /login to decide whether to surface the prominent or discreet variant.
 */
export function rememberPasskey() {
  try {
    localStorage.setItem(KNOWN_KEY, "1");
  } catch {
    // localStorage may be disabled; silent fallback to discreet UI is fine
  }
}

/**
 * Clears the "passkey known" hint. Called when a user removes their last
 * passkey from the profile, so the login page reverts to the discreet variant.
 */
export function forgetPasskey() {
  try {
    localStorage.removeItem(KNOWN_KEY);
  } catch {
    /* ignore */
  }
}

interface Props {
  /**
   * "prominent" renders a big primary button — shown above the OAuth buttons
   * when this browser has previously used a passkey here.
   * "subtle" renders a small muted link — shown below the OAuth buttons when
   * this browser has not yet used a passkey here.
   * Each variant returns null if it's not the right one for the current state,
   * so both can be rendered on the page and the right one shows up.
   */
  variant: "prominent" | "subtle";
}

export function PasskeyLoginPrompt({ variant }: Props) {
  const [supported, setSupported] = useState(false);
  const [known, setKnown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("PublicKeyCredential" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    setKnown(localStorage.getItem(KNOWN_KEY) === "1");
  }, []);

  if (!supported) return null;
  if (variant === "prominent" && !known) return null;
  if (variant === "subtle" && known) return null;

  async function handlePasskeyLogin() {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("passkey", { redirect: false });
      if (result?.error) {
        setError("Couldn't sign in with that — try one of the options below instead.");
        // If the credential is gone but the hint was set, drop the hint so
        // the page returns to the discreet variant next time.
        forgetPasskey();
        setLoading(false);
      } else {
        rememberPasskey();
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Couldn't sign in with that — try one of the options below instead.");
      setLoading(false);
    }
  }

  if (variant === "prominent") {
    return (
      <div className="space-y-3">
        <Button onClick={handlePasskeyLogin} disabled={loading} className="w-full" size="lg">
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Fingerprint className="mr-2 h-5 w-5" />
          )}
          {loading ? "Signing in…" : "Sign in with this device"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or sign in another way</span>
          </div>
        </div>
      </div>
    );
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
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Back-compat: the old import name still works during the deploy window.
export const PasskeyLoginButton = () => <PasskeyLoginPrompt variant="subtle" />;
