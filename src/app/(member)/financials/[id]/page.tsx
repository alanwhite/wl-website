import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getFinancialManagerRoles,
  getFinancialViewerRoles,
  canManageFinancials,
  canViewFinancials,
  getFinancialCategories,
} from "@/lib/config";
import { TransactionForm } from "@/components/financials/transaction-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { DeleteTransactionButton } from "@/components/financials/delete-transaction-button";

export const dynamic = "force-dynamic";

function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [managerRoles, viewerRoles] = await Promise.all([
    getFinancialManagerRoles(),
    getFinancialViewerRoles(),
  ]);

  if (!canViewFinancials(session.user, viewerRoles, managerRoles)) redirect("/dashboard");

  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { creator: { select: { name: true } } },
  });

  if (!transaction) notFound();

  const canManage = canManageFinancials(session.user, managerRoles);

  if (canManage) {
    const categories = await getFinancialCategories();
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/financials">Back</Link>
        </Button>
        <TransactionForm categories={categories} transaction={transaction} />
        <div className="flex justify-end">
          <DeleteTransactionButton transactionId={transaction.id} />
        </div>
      </div>
    );
  }

  // Read-only view for viewers
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/financials">Back</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Date:</strong> {format(transaction.date, "d MMMM yyyy")}</p>
          <p><strong>Type:</strong> <Badge variant={transaction.type === "income" ? "default" : "destructive"}>{transaction.type}</Badge></p>
          <p><strong>Category:</strong> {transaction.category}</p>
          <p><strong>Description:</strong> {transaction.description}</p>
          <p><strong>Amount:</strong> {formatPence(transaction.amount)}</p>
          {transaction.reference && <p><strong>Reference:</strong> {transaction.reference}</p>}
          <p className="text-xs text-muted-foreground">
            Added by {transaction.creator.name ?? "Unknown"} on {format(transaction.createdAt, "d MMM yyyy")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
