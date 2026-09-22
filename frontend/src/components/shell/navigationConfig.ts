import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  GraduationCap,
  DollarSign,
  Building2,
  BarChart3,
  ShieldCheck,
  Settings,
  HelpCircle,
  UserCheck,
  BookOpen,
  Megaphone,
  Percent,
  type LucideIcon,
} from "lucide-react";
import type { UserRole, Permission } from "@/types/auth";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
}

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["super_admin", "partner_admin", "team_member", "counselor", "support"],
  },
  {
    id: "partners",
    label: "Partners",
    href: "/partners",
    icon: Building2,
    allowedRoles: ["super_admin"],
    requiredPermission: "partner:manage",
  },
  {
    id: "leads",
    label: "Leads",
    href: "/leads",
    icon: Users,
    allowedRoles: ["super_admin", "partner_admin", "team_member", "counselor", "support"],
  },
  {
    id: "follow-ups",
    label: "Follow Ups",
    href: "/follow-ups",
    icon: CalendarCheck,
    allowedRoles: ["super_admin", "partner_admin", "team_member", "counselor"],
  },
  {
    id: "admissions",
    label: "Admissions",
    href: "/admissions",
    icon: GraduationCap,
    allowedRoles: ["super_admin", "partner_admin", "team_member", "counselor", "support"],
  },
  {
    id: "courses",
    label: "Courses",
    href: "/courses",
    icon: BookOpen,
    allowedRoles: ["super_admin", "partner_admin", "counselor", "support"],
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    allowedRoles: ["super_admin", "partner_admin", "counselor", "support"],
  },
  {
    id: "team",
    label: "Team",
    href: "/team",
    icon: UserCheck,
    allowedRoles: ["super_admin", "partner_admin"],
    requiredPermission: "team:manage",
  },
  {
    id: "commissions",
    label: "Commissions",
    href: "/commissions",
    icon: DollarSign,
    allowedRoles: ["super_admin", "partner_admin"],
    requiredPermission: "commission:view",
  },
  {
    id: "commission-rules",
    label: "Commission Rules",
    href: "/commission-rules",
    icon: Percent,
    allowedRoles: ["super_admin"],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    allowedRoles: ["super_admin", "partner_admin"],
    requiredPermission: "report:view",
  },
  {
    id: "audit",
    label: "Audit Logs",
    href: "/audit",
    icon: ShieldCheck,
    allowedRoles: ["super_admin", "support"],
    requiredPermission: "audit:view",
  },
  {
    id: "support",
    label: "Support Desk",
    href: "/support",
    icon: HelpCircle,
    allowedRoles: ["super_admin", "support"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["super_admin"],
    requiredPermission: "settings:manage",
  },
];

/**
 * Filter navigation items for a given user role & permissions
 */
export function getAuthorizedNavItems(role?: UserRole | null, userPermissions: Permission[] = []): NavItemConfig[] {
  if (!role) return [];

  return ALL_NAV_ITEMS.filter((item) => {
    // Check role eligibility
    if (item.allowedRoles && !item.allowedRoles.includes(role)) {
      return false;
    }

    // Super admin bypasses permission checks
    if (role === "super_admin") {
      return true;
    }

    // Check specific permission if required
    if (item.requiredPermission && !userPermissions.includes(item.requiredPermission)) {
      return false;
    }

    return true;
  });
}
