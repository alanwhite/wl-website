import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFinancialManagerRoles,
  getFinancialViewerRoles,
  canViewFinancials,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [managerRoles, viewerRoles] = await Promise.all([
    getFinancialManagerRoles(),
    getFinancialViewerRoles(),
  ]);

  if (!canViewFinancials(session.user, viewerRoles, managerRoles)) redirect("/dashboard");

  const params = await searchParams;
  const typeFilter = params.type;
  const query = params.q?.trim();

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(query
        ? {
            OR: [
              { description: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { reference: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/financials">Back</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={!typeFilter ? "default" : "outline"} size="sm">
          <Link href="/financials/transactions">All</Link>
        </Button>
        <Button asChild variant={typeFilter === "income" ? "default" : "outline"} size="sm">
          <Link href="/financials/transactions?type=income">Income</Link>
        </Button>
        <Button asChild variant={typeFilter === "expense" ? "default" : "outline"} size="sm">
          <Link href="/financials/transactions?type=expense">Expenses</Link>
        </Button>
      </div>

      <form action="/financials/transactions" method="get">
        {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
        <Input
          name="q"
          placeholder="Search transactions..."
          defaultValue={query ?? ""}
          className="max-w-sm"
        />
      </form>

      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions found</p>
        ) : (
          transactions.map((tx) => (
            <Link key={tx.id} href={`/financials/${tx.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(tx.date, "d MMM yyyy")}</span>
                      <Badge variant="outline" className="text-xs">{tx.category}</Badge>
                      {tx.reference && <span className="hidden sm:inline">Ref: {tx.reference}</span>}
                    </div>
                  </div>
                  <span className={`ml-3 font-semibold text-sm ${tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatPence(tx.amount)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
