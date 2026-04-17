"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { LayoutDashboard, User, MoreHorizontal } from "lucide-react";
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
}

const MAX_VISIBLE = 3; // + More button = 4 slots

export function MemberBottomNav({ items }: MemberBottomNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Always include Dashboard first, Profile last
  const allItems: MemberNavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    ...items.filter((i) => i.href !== "/dashboard" && i.href !== "/profile"),
    { label: "Profile", href: "/profile", icon: "User" },
  ];

  const needsMore = allItems.length > MAX_VISIBLE + 1;
  const visibleItems = needsMore ? allItems.slice(0, MAX_VISIBLE) : allItems;
  const overflowItems = needsMore ? allItems.slice(MAX_VISIBLE) : [];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const Icon = getIcon(item.icon) ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                isActive(item.href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {needsMore && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                  overflowItems.some((i) => isActive(i.href))
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
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
                      {item.label}
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
