import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFinancialManagerRoles,
  getFinancialViewerRoles,
  canManageFinancials,
  canViewFinancials,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

function formatPence(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pounds);
}

export default async function FinancialsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [managerRoles, viewerRoles] = await Promise.all([
    getFinancialManagerRoles(),
    getFinancialViewerRoles(),
  ]);

  if (!canViewFinancials(session.user, viewerRoles, managerRoles)) redirect("/dashboard");

  const canManage = canManageFinancials(session.user, managerRoles);

  // Get totals
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.transaction.aggregate({ where: { type: "income" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "expense" }, _sum: { amount: true } }),
  ]);

  const totalIncome = incomeResult._sum.amount ?? 0;
  const totalExpense = expenseResult._sum.amount ?? 0;
  const balance = totalIncome - totalExpense;

  // Recent transactions
  const recent = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    take: 10,
    include: { creator: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financials</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/financials/report">Monthly</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/financials/annual">Annual</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/financials/transactions">All Transactions</Link>
          </Button>
          {canManage && (
            <Button asChild size="sm">
              <Link href="/financials/add">
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatPence(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatPence(totalExpense)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-xl font-bold ${balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                {formatPence(balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {recent.map((tx) => (
                <Link key={tx.id} href={`/financials/${tx.id}`} className="block">
                  <div className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(tx.date, "d MMM yyyy")}</span>
                        <Badge variant="outline" className="text-xs">{tx.category}</Badge>
                      </div>
                    </div>
                    <span className={`ml-3 font-semibold ${tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatPence(tx.amount)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
