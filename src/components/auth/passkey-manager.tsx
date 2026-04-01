"use client";

import { useState } from "react";
import { signIn } from "next-auth/webauthn";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { removePasskey } from "@/lib/actions/passkeys";

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
      toast.success("Passkey registered! Refresh to see it listed.");
      // Reload the page to show the new passkey
      window.location.reload();
    } catch {
      toast.error("Failed to register passkey. Your browser may not support passkeys.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(credentialID: string) {
    if (!confirm("Remove this passkey? You won't be able to use it to sign in anymore.")) return;
    setLoading(true);
    try {
      await removePasskey(credentialID);
      setPasskeys(passkeys.filter((p) => p.credentialID !== credentialID));
      toast.success("Passkey removed from this site. You may also want to delete it from your device: System Settings → Passwords.", { duration: 8000 });
    } catch {
      toast.error("Failed to remove passkey");
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

  return (
    <div className="space-y-4">
      {passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No passkeys registered. Add one to sign in without needing to remember your OAuth provider.
        </p>
      ) : (
        <div className="space-y-2">
          {passkeys.map((pk) => (
            <div
              key={pk.credentialID}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  Passkey
                </p>
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
      <Button onClick={handleRegister} disabled={loading} variant="outline">
        {loading ? "Registering..." : "Add Passkey"}
      </Button>
    </div>
  );
}
