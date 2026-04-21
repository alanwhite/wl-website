"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveSubmission, rejectSubmission, deleteSubmission } from "@/lib/actions/forms";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SubmissionActionsProps {
  submissionId: string;
  formSlug: string;
  status: string;
}

export function SubmissionActions({ submissionId, formSlug, status }: SubmissionActionsProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    try {
      await approveSubmission(submissionId, notes || undefined);
      toast.success("Submission approved");
      router.push(`/forms/${formSlug}/submissions`);
    } catch {
      toast.error("Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      await rejectSubmission(submissionId, notes || undefined);
      toast.success("Submission rejected");
      router.push(`/forms/${formSlug}/submissions`);
    } catch {
      toast.error("Failed to reject");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this submission? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteSubmission(submissionId);
      toast.success("Submission deleted");
      router.push(`/forms/${formSlug}/submissions`);
    } catch {
      toast.error("Failed to delete");
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
        {status === "pending" && (
          <>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleApprove} disabled={loading}>
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={loading}>
                Reject
              </Button>
            </div>
          </>
        )}
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={loading}>
          Delete Submission
        </Button>
      </CardContent>
    </Card>
  );
}
