"use client";

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
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tiers", label: "Tiers", icon: Layers },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/newsletters", label: "Newsletters", icon: Mail },
  { href: "/admin/contacts", label: "Contacts", icon: MessageSquare },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
      <nav className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
          Admin
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
