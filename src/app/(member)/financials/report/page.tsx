import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFinancialManagerRoles,
  getFinancialViewerRoles,
  canViewFinancials,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getSiteInfo } from "@/lib/config";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { MonthSelector } from "@/components/financials/month-selector";

export const dynamic = "force-dynamic";

function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [managerRoles, viewerRoles] = await Promise.all([
    getFinancialManagerRoles(),
    getFinancialViewerRoles(),
  ]);

  if (!canViewFinancials(session.user, viewerRoles, managerRoles)) redirect("/dashboard");

  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.month ?? String(now.getMonth() + 1));
  const year = parseInt(params.year ?? String(now.getFullYear()));

  const periodStart = startOfMonth(new Date(year, month - 1));
  const periodEnd = endOfMonth(new Date(year, month - 1));

  const siteInfo = await getSiteInfo();

  // Get all transactions before this month (for opening balance)
  const priorResult = await prisma.transaction.findMany({
    where: { date: { lt: periodStart } },
    select: { type: true, amount: true },
  });

  const openingBalance = priorResult.reduce(
    (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );

  // Get this month's transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: "asc" },
  });

  const monthIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const closingBalance = openingBalance + monthIncome - monthExpense;

  const monthLabel = format(periodStart, "MMMM yyyy");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Monthly Report</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline" size="sm" className="print:hidden">
            Print
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/financials">Back</Link>
          </Button>
        </div>
      </div>

      <MonthSelector month={month} year={year} />

      {/* Print header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">{siteInfo.name}</h1>
        <h2 className="text-lg">Financial Report — {monthLabel}</h2>
      </div>

      {/* Summary */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader>
          <CardTitle>{monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <p className="text-lg font-bold">{formatPence(openingBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-lg font-bold text-green-600">{formatPence(monthIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-lg font-bold text-red-600">{formatPence(monthExpense)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Closing Balance</p>
              <p className={`text-lg font-bold ${closingBalance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatPence(closingBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction list */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No transactions in {monthLabel}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2 text-right">Income</th>
                  <th className="pb-2 text-right">Expense</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-2">{format(tx.date, "d MMM")}</td>
                    <td className="py-2">{tx.description}</td>
                    <td className="py-2">{tx.category}</td>
                    <td className="py-2 text-muted-foreground">{tx.reference ?? "—"}</td>
                    <td className="py-2 text-right text-green-600">
                      {tx.type === "income" ? formatPence(tx.amount) : ""}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      {tx.type === "expense" ? formatPence(tx.amount) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={4} className="py-2">Totals</td>
                  <td className="py-2 text-right text-green-600">{formatPence(monthIncome)}</td>
                  <td className="py-2 text-right text-red-600">{formatPence(monthExpense)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
