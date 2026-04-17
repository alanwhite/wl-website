"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { LayoutDashboard, User } from "lucide-react";

interface MemberNavItem {
  label: string;
  href: string;
  icon?: string;
}

interface MemberSidebarProps {
  items: MemberNavItem[];
}

export function MemberSidebar({ items }: MemberSidebarProps) {
  const pathname = usePathname();

  // Always include Dashboard first and Profile last
  const allItems: MemberNavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    ...items.filter((i) => i.href !== "/dashboard" && i.href !== "/profile"),
    { label: "Profile", href: "/profile", icon: "User" },
  ];

  return (
    <aside className="hidden w-64 border-r bg-muted/30 md:block min-h-[calc(100vh-4rem)]">
      <nav className="flex flex-col gap-1 p-4">
        {allItems.map((item) => {
          const Icon = getIcon(item.icon) ?? LayoutDashboard;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
