import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFinancialManagerRoles, canManageFinancials, getFinancialCategories } from "@/lib/config";
import { TransactionForm } from "@/components/financials/transaction-form";

export const dynamic = "force-dynamic";

export default async function AddTransactionPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getFinancialManagerRoles();
  if (!canManageFinancials(session.user, managerRoles)) redirect("/financials");

  const categories = await getFinancialCategories();

  return (
    <div className="mx-auto max-w-2xl">
      <TransactionForm categories={categories} />
    </div>
  );
}
