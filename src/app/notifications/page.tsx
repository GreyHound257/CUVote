"use client";

import { useCallback, useEffect, useState } from "react";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  priority: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=100");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else toast.error(json.error || "Failed to load notifications");
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id?: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { notificationIds: [id] } : {}),
      });
      await load();
    } catch {
      toast.error("Could not update notifications");
    }
  };

  return (
    <AppPage maxWidth="4xl">
      <PageHeader
        title="Notifications"
        description="Alerts about elections, nominations, and announcements."
        action={
          items.some((n) => !n.isRead) ? (
            <Button variant="outline" onClick={() => markRead()}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title="Inbox clear"
          description="You have no notifications right now."
          icon={<Bell className="h-10 w-10 text-muted-foreground/50" />}
        />
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/50 bg-card/40">
          {items.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between",
                !n.isRead && "bg-muted/40"
              )}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {n.type.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}
