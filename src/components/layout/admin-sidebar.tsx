"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  FileText,
  Settings,
  ClipboardList,
  MessageSquare,
  LayoutDashboard,
  Image,
  Megaphone,
  ScrollText,
  Layers,
  Shield,
  FolderOpen,
  FolderKanban,
  Mail,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tiers", label: "Tiers", icon: Layers },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/newsletters", label: "Newsletters", icon: Mail },
  { href: "/admin/contacts", label: "Contacts", icon: MessageSquare },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

function NavList({ pathname, onSelect }: { pathname: string; onSelect?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      <p className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
        Admin
      </p>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onSelect}
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
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 border-r bg-muted/30 md:block min-h-[calc(100vh-4rem)]">
      <NavList pathname={pathname} />
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = navItems.find((item) => isActiveHref(pathname, item.href));

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open admin menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle>Admin</SheetTitle>
          </SheetHeader>
          <NavList pathname={pathname} onSelect={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="text-sm font-medium">
        {current?.label ?? "Admin"}
      </span>
    </div>
  );
}
