"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTransaction } from "@/lib/actions/financials";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteTransaction(transactionId);
      toast.success("Transaction deleted");
      router.push("/financials");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Delete Transaction
    </Button>
  );
}
