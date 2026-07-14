"use client";
import { logger } from "@/utils/logger";

import React, { useState } from "react";
import Link from "next/link";
import { Routes, Roles } from "@/constants";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { BellIcon, Menu, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<{ id: string, title: string, message: string, isRead: boolean, createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setNotifications(data);
        setUnreadCount(data.filter((n: { isRead: boolean }) => !n.isRead).length);
      }
    } catch {
      logger.error("Failed to load notifications");
    }
  };

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    // Poll less aggressively to avoid saturating Neon's connection pool.
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      const body = id ? { notificationIds: [id] } : {};
      await fetch("/api/notifications/mark-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    } catch {
      logger.error("Failed to mark notifications as read");
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative min-w-[44px] min-h-[44px] hover:bg-accent/80"><span className="sr-only">Notifications</span></Button>}>
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="link" size="sm" onClick={() => markAsRead()} className="text-xs h-auto p-0">
                Mark all as read
              </Button>
            )}
            <Link href={Routes.NOTIFICATIONS} className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
        </div>
        <div className="flex flex-col max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`p-4 border-b border-border/50 last:border-0 flex flex-col gap-1 ${!n.isRead ? "bg-muted/50" : ""}`}>
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">{n.title}</span>
                  {!n.isRead && (
                    <button onClick={() => markAsRead(n.id)} className="text-xs text-primary hover:underline">
                      Mark read
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <LinkButton
      href={href}
      variant="ghost"
      size="sm"
      className="min-h-[44px] font-medium hover:bg-accent/80"
      linkClassName="flex items-center"
      onClick={onClick}
    >
      {children}
    </LinkButton>
  );
}

export function TopNav() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={cn(
      "sticky top-0 z-50",
      "bg-background/80 backdrop-blur-md",
      "border-b border-border/50",
      "flex flex-col md:flex-row items-center justify-between p-4"
    )}>
      <div className="flex w-full md:w-auto items-center justify-between">
        <div className="font-bold text-xl tracking-tight">
          <Link href={Routes.HOME} className="hover:text-primary transition-colors">
            <span className="text-primary">CU</span><span className="text-gold">Vote</span>
          </Link>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          {session?.user && <NotificationCenter />}
          <Button
            variant="ghost"
            size="icon"
            className="min-w-[44px] min-h-[44px] hover:bg-accent/80"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>

      <nav className={cn(
        "flex-col md:flex-row items-center gap-1 w-full md:w-auto mt-4 md:mt-0",
        mobileMenuOpen ? "flex" : "hidden md:flex"
      )}>
        <NavLink href={Routes.DASHBOARD} onClick={() => setMobileMenuOpen(false)}>
          Dashboard
        </NavLink>
        {session?.user ? (
          <>
            {session.user.role === Roles.SUPER_ADMIN && (
              <>
                <NavLink href={Routes.USERS} onClick={() => setMobileMenuOpen(false)}>
                  Users
                </NavLink>
                <NavLink href={Routes.SETTINGS} onClick={() => setMobileMenuOpen(false)}>
                  Settings
                </NavLink>
              </>
            )}
            {(session.user.role === Roles.SUPER_ADMIN ||
              session.user.role === Roles.DEPARTMENT_ADMIN) && (
              <>
                <NavLink href={Routes.STUDENTS} onClick={() => setMobileMenuOpen(false)}>
                  Students
                </NavLink>
                <NavLink href={Routes.CANDIDATES} onClick={() => setMobileMenuOpen(false)}>
                  Candidates
                </NavLink>
                <NavLink href={Routes.CANDIDATE_APPROVALS} onClick={() => setMobileMenuOpen(false)}>
                  Approvals
                </NavLink>
              </>
            )}
            {session.user.role !== Roles.STUDENT && (
              <NavLink href={Routes.AUDIT_LOGS} onClick={() => setMobileMenuOpen(false)}>
                Audit Logs
              </NavLink>
            )}
            <NavLink href={Routes.ANNOUNCEMENTS} onClick={() => setMobileMenuOpen(false)}>
              Announcements
            </NavLink>
            <NavLink href={Routes.ACTIVITY} onClick={() => setMobileMenuOpen(false)}>
              Activity
            </NavLink>
            <NavLink href={Routes.PROFILE} onClick={() => setMobileMenuOpen(false)}>
              Profile
            </NavLink>
            <div className="hidden md:flex md:items-center md:gap-1">
              <ThemeToggle />
              <NotificationCenter />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="min-h-[44px] hover:bg-accent/80"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <ThemeToggle />
            <NavLink href={Routes.LOGIN} onClick={() => setMobileMenuOpen(false)}>
              Login
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
