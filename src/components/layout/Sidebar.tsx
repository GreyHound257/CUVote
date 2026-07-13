"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Routes, Roles } from "@/constants";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Vote,
  Users,
  UserCircle,
  ScrollText,
  BarChart3,
  UserCheck,
  ClipboardCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
};

const navItems: NavItem[] = [
  { href: Routes.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN, Roles.STUDENT] },
  { href: Routes.DEPARTMENTS, label: "Departments", icon: Building2, roles: [Roles.SUPER_ADMIN] },
  { href: Routes.USERS, label: "Users", icon: UserCog, roles: [Roles.SUPER_ADMIN] },
  { href: Routes.ELECTIONS, label: "Elections", icon: Vote, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN] },
  { href: Routes.STUDENTS, label: "Students", icon: Users, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN] },
  { href: Routes.CANDIDATES, label: "Candidates", icon: UserCheck, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN] },
  { href: Routes.CANDIDATE_APPROVALS, label: "Approvals", icon: ClipboardCheck, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN] },
  { href: Routes.VOTING, label: "Voting", icon: Vote, roles: [Roles.STUDENT] },
  { href: Routes.REPORTS, label: "Reports", icon: BarChart3, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN] },
  { href: Routes.AUDIT_LOGS, label: "Audit Logs", icon: ScrollText, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN] },
  { href: Routes.PROFILE, label: "Profile", icon: UserCircle, roles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN, Roles.STUDENT] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-md md:block">
      <nav className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isExactOrChild = pathname === href || pathname.startsWith(`${href}/`);
          const hasMoreSpecificMatch = visibleItems.some(
            (other) =>
              other.href !== href &&
              other.href.length > href.length &&
              pathname.startsWith(other.href)
          );
          const isActive = isExactOrChild && !hasMoreSpecificMatch;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
