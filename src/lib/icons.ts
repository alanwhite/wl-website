import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  User,
  FileText,
  Mail,
  MessageSquare,
  Megaphone,
  Settings,
  Home,
  Info,
  Globe,
  Calendar,
  Users,
  Heart,
  BookOpen,
  Camera,
  MapPin,
  Phone,
  Shield,
  Star,
  Newspaper,
  Wallet,
  TrendingUp,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  User,
  FileText,
  Mail,
  MessageSquare,
  Megaphone,
  Settings,
  Home,
  Info,
  Globe,
  Calendar,
  Users,
  Heart,
  BookOpen,
  Camera,
  MapPin,
  Phone,
  Shield,
  Star,
  Newspaper,
  Wallet,
  TrendingUp,
  ClipboardList,
};

export function getIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  return iconMap[name] ?? null;
}

export const availableIcons = Object.keys(iconMap);
