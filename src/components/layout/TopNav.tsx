"use client";
import { logger } from "@/utils/logger";

import React, { useState } from "react";
import Link from "next/link";
import { Routes, Roles } from "@/constants";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BellIcon, Menu, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

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
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
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
      fetchNotifications();
    } catch {
      logger.error("Failed to mark notifications as read");
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative min-w-[44px] min-h-[44px]"><span className="sr-only">Notifications</span></Button>}>
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={() => markAsRead()} className="text-xs h-auto p-0">
              Mark all as read
            </Button>
          )}
        </div>
        <div className="flex flex-col max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`p-4 border-b last:border-0 flex flex-col gap-1 ${!n.isRead ? "bg-muted/50" : ""}`}>
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

export function TopNav() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="flex flex-col md:flex-row items-center justify-between p-4 border-b">
      <div className="flex w-full md:w-auto items-center justify-between">
        <div className="font-bold text-xl">
          <Link href={Routes.HOME}>CUVote</Link>
        </div>
        <div className="md:hidden flex items-center gap-2">
          {session?.user && <NotificationCenter />}
          <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>

      <nav className={`flex-col md:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0 ${mobileMenuOpen ? "flex" : "hidden md:flex"}`}>
        <Link href={Routes.DASHBOARD} className="text-sm font-medium hover:underline p-2 min-h-[44px] flex items-center">
          Dashboard
        </Link>
        {session?.user ? (
          <>
            {session.user.role !== Roles.STUDENT && (
              <Link href={Routes.AUDIT_LOGS} className="text-sm font-medium hover:underline p-2 min-h-[44px] flex items-center">
                Audit Logs
              </Link>
            )}
            <Link href={Routes.PROFILE} className="text-sm font-medium hover:underline p-2 min-h-[44px] flex items-center">
              Profile
            </Link>
            <div className="hidden md:block">
              <NotificationCenter />
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="min-h-[44px]">
              Logout
            </Button>
          </>
        ) : (
          <Link href={Routes.LOGIN} className="text-sm font-medium hover:underline p-2 min-h-[44px] flex items-center">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
