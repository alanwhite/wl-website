"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { LayoutDashboard, MoreHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MemberNavItem {
  label: string;
  href: string;
  icon?: string;
}

interface MemberBottomNavProps {
  items: MemberNavItem[];
  notificationCounts?: Record<string, number>;
}

const MAX_VISIBLE = 3;

function NotiBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn(
      "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white",
      className,
    )}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MemberBottomNav({ items, notificationCounts = {} }: MemberBottomNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const dashboardItem = items.find((i) => i.href === "/dashboard") ?? { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" };
  const profileItem = items.find((i) => i.href === "/profile") ?? { label: "Profile", href: "/profile", icon: "User" };
  const allItems: MemberNavItem[] = [
    dashboardItem,
    ...items.filter((i) => i.href !== "/dashboard" && i.href !== "/profile"),
    profileItem,
  ];

  const needsMore = allItems.length > MAX_VISIBLE + 1;
  const visibleItems = needsMore ? allItems.slice(0, MAX_VISIBLE) : allItems;
  const overflowItems = needsMore ? allItems.slice(MAX_VISIBLE) : [];

  // Cumulative count for overflow items
  const overflowCount = overflowItems.reduce(
    (sum, item) => sum + (notificationCounts[item.href] ?? 0),
    0,
  );

  const allNavItems = [...visibleItems, ...overflowItems];
  function isActive(href: string) {
    return pathname === href ||
      (pathname.startsWith(href + "/") &&
        !allNavItems.some((other) => other.href !== href && other.href.length > href.length && pathname.startsWith(other.href)));
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
    >
      <div className="flex items-center justify-around px-2">
        {visibleItems.map((item) => {
          const Icon = getIcon(item.icon) ?? LayoutDashboard;
          const count = notificationCounts[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                isActive(item.href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                <NotiBadge count={count} />
              </div>
              {item.label}
            </Link>
          );
        })}

        {needsMore && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                  overflowItems.some((i) => isActive(i.href))
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <MoreHorizontal className="h-5 w-5" />
                  <NotiBadge count={overflowCount} />
                </div>
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-safe">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 py-4">
                {overflowItems.map((item) => {
                  const Icon = getIcon(item.icon) ?? LayoutDashboard;
                  const count = notificationCounts[item.href] ?? 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium",
                          isActive(item.href)
                            ? "bg-primary-foreground text-primary"
                            : "bg-red-600 text-white",
                        )}>
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
