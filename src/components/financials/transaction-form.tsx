"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTransaction, updateTransaction } from "@/lib/actions/financials";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Category {
  name: string;
  type: string;
}

interface TransactionFormProps {
  categories: Category[];
  transaction?: {
    id: string;
    date: Date;
    type: string;
    category: string;
    description: string;
    amount: number;
    reference: string | null;
  };
}

export function TransactionForm({ categories, transaction }: TransactionFormProps) {
  const isEdit = !!transaction;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(transaction?.type ?? "income");

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const amountStr = form.get("amount") as string;
    const amountPence = Math.round(parseFloat(amountStr) * 100);

    if (isNaN(amountPence) || amountPence <= 0) {
      toast.error("Please enter a valid amount");
      setLoading(false);
      return;
    }

    const data = {
      date: form.get("date") as string,
      type,
      category: form.get("category") as string,
      description: form.get("description") as string,
      amount: amountPence,
      reference: (form.get("reference") as string) || undefined,
    };

    try {
      if (isEdit) {
        await updateTransaction(transaction.id, data);
        toast.success("Transaction updated");
      } else {
        await createTransaction(data);
        toast.success("Transaction added");
      }
      router.push("/financials");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={
                transaction
                  ? new Date(transaction.date).toISOString().slice(0, 10)
                  : new Date().toISOString().slice(0, 10)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              name="category"
              defaultValue={transaction?.category ?? filteredCategories[0]?.name ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              required
              defaultValue={transaction?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="pl-7"
                defaultValue={
                  transaction ? (transaction.amount / 100).toFixed(2) : ""
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input
              id="reference"
              name="reference"
              placeholder="Receipt/invoice number"
              defaultValue={transaction?.reference ?? ""}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Add Transaction"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
