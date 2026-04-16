"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { approveRegistration, rejectRegistration } from "@/lib/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Tier {
  id: string;
  name: string;
  level: number;
}

interface RegistrationActionsProps {
  registrationId: string;
  tiers: Tier[];
  suggestedTierId?: string | null;
}

export function RegistrationActions({ registrationId, tiers, suggestedTierId }: RegistrationActionsProps) {
  const [tierId, setTierId] = useState(
    suggestedTierId && tiers.some((t) => t.id === suggestedTierId)
      ? suggestedTierId
      : tiers[0]?.id ?? "",
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    if (!tierId) {
      toast.error("Please select a membership tier");
      return;
    }
    setLoading(true);
    try {
      await approveRegistration(registrationId, tierId);
      toast.success("Registration approved");
      router.push("/admin/registrations");
    } catch {
      toast.error("Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      await rejectRegistration(registrationId, reason || undefined);
      toast.success("Registration rejected");
      router.push("/admin/registrations");
    } catch {
      toast.error("Failed to reject");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Membership Tier</Label>
            {suggestedTierId && tierId === suggestedTierId && (
              <Badge variant="outline" className="text-xs">Auto-suggested</Badge>
            )}
          </div>
          <Select value={tierId} onValueChange={setTierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select tier..." />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.name} (level {tier.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Rejection reason (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
          />
        </div>
        <div className="flex gap-4">
          <Button onClick={handleApprove} disabled={loading}>
            Approve
          </Button>
          <Button onClick={handleReject} variant="destructive" disabled={loading}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
