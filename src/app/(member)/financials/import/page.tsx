import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFinancialManagerRoles,
  canManageFinancials,
  getCsvMapping,
  getFinancialCategories,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { CsvImport } from "@/components/financials/csv-import";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getFinancialManagerRoles();
  if (!canManageFinancials(session.user, managerRoles)) redirect("/financials");

  const [csvMapping, categories] = await Promise.all([
    getCsvMapping(),
    getFinancialCategories(),
  ]);

  // Get recent transactions for duplicate detection
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const existingTransactions = await prisma.transaction.findMany({
    where: { date: { gte: threeMonthsAgo } },
    select: { date: true, amount: true, description: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Import Statement</h1>
      <CsvImport
        existingMapping={csvMapping}
        categories={categories}
        existingTransactions={existingTransactions}
      />
    </div>
  );
}
