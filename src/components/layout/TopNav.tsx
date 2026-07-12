"use client";

import React from "react";
import Link from "next/link";
import { Routes, Roles } from "@/constants";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BellIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to load notifications");
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
    } catch (error) {
      console.error("Failed to mark notifications as read");
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
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

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="font-bold text-xl">
        <Link href={Routes.HOME}>CUVote</Link>
      </div>
      <nav className="flex items-center gap-4">
        <Link href={Routes.DASHBOARD} className="text-sm font-medium hover:underline">
          Dashboard
        </Link>
        {session?.user ? (
          <>
            {session.user.role !== Roles.STUDENT && (
              <Link href={Routes.AUDIT_LOGS} className="text-sm font-medium hover:underline">
                Audit Logs
              </Link>
            )}
            <Link href={Routes.PROFILE} className="text-sm font-medium hover:underline">
              Profile
            </Link>
            <NotificationCenter />
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Logout
            </Button>
          </>
        ) : (
          <Link href={Routes.LOGIN} className="text-sm font-medium hover:underline">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
