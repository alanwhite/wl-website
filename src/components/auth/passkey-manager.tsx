"use client";

import { useState } from "react";
import { signIn } from "next-auth/webauthn";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { removePasskey } from "@/lib/actions/passkeys";
import { rememberPasskey, forgetPasskey } from "@/components/auth/passkey-login-button";

interface PasskeyInfo {
  credentialID: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string | null;
}

interface PasskeyManagerProps {
  passkeys: PasskeyInfo[];
}

export function PasskeyManager({ passkeys: initialPasskeys }: PasskeyManagerProps) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      // Auth.js WebAuthn registration is triggered via signIn with action "register"
      await signIn("passkey", { action: "register", redirect: false });
      rememberPasskey();
      toast.success("Sign-in saved to this device. Refresh to see it listed.");
      // Reload the page to show the new passkey
      window.location.reload();
    } catch {
      toast.error("Couldn't save sign-in to this device. Your browser may not support it.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(credentialID: string) {
    if (!confirm("Remove the saved sign-in for this device? You'll need to use Google or Apple to sign in here next time.")) return;
    setLoading(true);
    try {
      await removePasskey(credentialID);
      const remaining = passkeys.filter((p) => p.credentialID !== credentialID);
      setPasskeys(remaining);
      if (remaining.length === 0) {
        // No saved sign-ins left for this account — clear the login-page hint
        // so the discreet variant returns until they save one again.
        forgetPasskey();
      }
      toast.success("Sign-in removed from this site. You may also want to delete it from your device: System Settings → Passwords.", { duration: 8000 });
    } catch {
      toast.error("Couldn't remove sign-in");
    } finally {
      setLoading(false);
    }
  }

  function deviceLabel(type: string, backed: boolean) {
    const labels: Record<string, string> = {
      singleDevice: "This device only",
      multiDevice: "Synced across devices",
    };
    return labels[type] ?? type;
  }

  const hasAny = passkeys.length > 0;

  return (
    <div className="space-y-4">
      {!hasAny && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Save your sign-in to this device so you can come back without having to choose Google or Apple again — use your fingerprint, face, or device PIN to sign in next time.
          </p>
          <p className="text-xs">
            Browsers call this a <em>passkey</em>. It&apos;s safer than a password and only works from this device (or any device signed into the same browser).
          </p>
        </div>
      )}
      {hasAny && (
        <div className="space-y-2">
          {passkeys.map((pk) => (
            <div
              key={pk.credentialID}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="text-sm font-medium">Saved sign-in</p>
                <p className="text-xs text-muted-foreground">
                  {deviceLabel(pk.credentialDeviceType, pk.credentialBackedUp)}
                  {pk.transports && ` (${pk.transports})`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(pk.credentialID)}
                disabled={loading}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleRegister} disabled={loading} variant={hasAny ? "outline" : "default"}>
        {loading ? "Saving…" : hasAny ? "Save another device" : "Save sign-in to this device"}
      </Button>
    </div>
  );
}
