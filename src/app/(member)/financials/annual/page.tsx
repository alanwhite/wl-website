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
import { YearSelector } from "@/components/financials/year-selector";
import { PrintButton } from "@/components/financials/print-button";

export const dynamic = "force-dynamic";

function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [managerRoles, viewerRoles] = await Promise.all([
    getFinancialManagerRoles(),
    getFinancialViewerRoles(),
  ]);

  if (!canViewFinancials(session.user, viewerRoles, managerRoles)) redirect("/dashboard");

  const params = await searchParams;
  const year = parseInt(params.year ?? String(new Date().getFullYear()));

  const periodStart = new Date(year, 0, 1);
  const periodEnd = new Date(year, 11, 31, 23, 59, 59);

  const siteInfo = await getSiteInfo();

  // Opening balance (all transactions before this year)
  const priorTransactions = await prisma.transaction.findMany({
    where: { date: { lt: periodStart } },
    select: { type: true, amount: true },
  });

  const openingBalance = priorTransactions.reduce(
    (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );

  // This year's transactions
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: periodStart, lte: periodEnd } },
    orderBy: { date: "asc" },
  });

  // Group by category
  const incomeByCategory = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      incomeByCategory.set(tx.category, (incomeByCategory.get(tx.category) ?? 0) + tx.amount);
      totalIncome += tx.amount;
    } else {
      expenseByCategory.set(tx.category, (expenseByCategory.get(tx.category) ?? 0) + tx.amount);
      totalExpense += tx.amount;
    }
  }

  const closingBalance = openingBalance + totalIncome - totalExpense;

  // Sort categories by amount descending
  const incomeCats = [...incomeByCategory.entries()].sort((a, b) => b[1] - a[1]);
  const expenseCats = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Annual Report</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/financials?year=${year}`} download>Export CSV</a>
          </Button>
          <PrintButton />
          <Button asChild variant="outline" size="sm">
            <Link href="/financials">Back</Link>
          </Button>
        </div>
      </div>

      <YearSelector year={year} />

      {/* Print header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">{siteInfo.name}</h1>
        <h2 className="text-lg">Annual Financial Report — {year}</h2>
      </div>

      {/* Balance summary */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader>
          <CardTitle>Summary — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <p className="text-lg font-bold">{formatPence(openingBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-lg font-bold text-green-600">{formatPence(totalIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-bold text-red-600">{formatPence(totalExpense)}</p>
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

      {/* Income by category */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader>
          <CardTitle>Income by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {incomeCats.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No income recorded in {year}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {incomeCats.map(([cat, amount]) => (
                  <tr key={cat} className="border-b last:border-0">
                    <td className="py-2">{cat}</td>
                    <td className="py-2 text-right text-green-600">{formatPence(amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2">Total Income</td>
                  <td className="py-2 text-right text-green-600">{formatPence(totalIncome)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Expenses by category */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseCats.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No expenses recorded in {year}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseCats.map(([cat, amount]) => (
                  <tr key={cat} className="border-b last:border-0">
                    <td className="py-2">{cat}</td>
                    <td className="py-2 text-right text-red-600">{formatPence(amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2">Total Expenses</td>
                  <td className="py-2 text-right text-red-600">{formatPence(totalExpense)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Net position */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Net {totalIncome >= totalExpense ? "Surplus" : "Deficit"} for {year}</span>
            <span className={totalIncome >= totalExpense ? "text-green-600" : "text-red-600"}>
              {formatPence(Math.abs(totalIncome - totalExpense))}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
