"use client";

import { useCallback, useEffect, useState } from "react";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { toast } from "sonner";

type ActivityItem = {
  id: string;
  kind: "AUDIT" | "ANNOUNCEMENT";
  title: string;
  summary: string;
  createdAt: string;
  actorName?: string | null;
  entity?: string | null;
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity?limit=50");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else toast.error(json.error || "Failed to load activity");
    } catch {
      toast.error("Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppPage>
      <PageHeader
        title="Activity"
        description="Recent portal events, announcements, and administrative actions."
      />

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Election and announcement events will show up here as they happen."
          icon={<Activity className="h-10 w-10 text-muted-foreground/50" />}
        />
      ) : (
        <div className="relative space-y-0 border-l border-border/60 pl-6">
          {items.map((item) => (
            <div key={item.id} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <GlassCard className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold tracking-tight">{item.title}</h2>
                  <Badge variant={item.kind === "ANNOUNCEMENT" ? "default" : "secondary"}>
                    {item.kind === "ANNOUNCEMENT" ? "Announcement" : "System"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                  {item.actorName ? ` · ${item.actorName}` : ""}
                  {item.entity ? ` · ${item.entity}` : ""}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>
      )}
    </AppPage>
  );
}
