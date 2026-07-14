"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Roles } from "@/constants";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { ThemeAppearanceSection } from "@/components/shared/ThemeToggle";

type AcademicSession = {
  id: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  isCurrent: boolean;
  status: string;
  _count?: { elections: number };
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [liveResultsEnabled, setLiveResultsEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const role = session?.user?.role;

  useEffect(() => {
    if (status === "authenticated" && role && role !== Roles.SUPER_ADMIN) {
      router.replace("/dashboard");
    }
  }, [status, role, router]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        setLiveResultsEnabled(!!json.data.liveResultsEnabled);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/academic-sessions?includeArchived=true");
      const json = await res.json();
      if (json.success) setSessions(json.data);
      else toast.error(json.error || "Failed to load sessions");
    } catch {
      toast.error("Failed to load academic sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === Roles.SUPER_ADMIN) {
      loadSettings();
      loadSessions();
    }
  }, [role, loadSettings, loadSessions]);

  const saveLiveToggle = async (enabled: boolean) => {
    setLiveResultsEnabled(enabled);
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveResultsEnabled: enabled }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          enabled
            ? "Live results enabled for Super Admin"
            : "Live results disabled"
        );
      } else {
        setLiveResultsEnabled(!enabled);
        toast.error(json.error || "Failed to update setting");
      }
    } catch {
      setLiveResultsEnabled(!enabled);
      toast.error("Failed to update setting");
    } finally {
      setSavingSettings(false);
    }
  };

  const createSession = async () => {
    if (!newName.trim()) {
      toast.error("Enter a session name like 2026/2027");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/academic-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          isCurrent: sessions.length === 0,
          status: "ACTIVE",
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Academic session created");
        setNewName("");
        loadSessions();
      } else {
        toast.error(json.error || "Failed to create session");
      }
    } catch {
      toast.error("Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const sessionAction = async (id: string, action: "setCurrent" | "archive") => {
    try {
      const res = await fetch(`/api/academic-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(action === "setCurrent" ? "Current session updated" : "Session archived");
        loadSessions();
      } else {
        toast.error(json.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    }
  };

  if (status === "loading" || role !== Roles.SUPER_ADMIN) {
    return (
      <AppPage>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader
        title="System Settings"
        description="Configure platform rules, academic sessions, and Super Admin feature toggles."
      />

      <GlassCard>
        <ThemeAppearanceSection />
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Live election reports</h3>
          <p className="text-sm text-muted-foreground">
            When enabled, Super Admins can view real-time tallies while voting is open.
            Department admins never see live tallies — only after voting closes.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3">
          <div>
            <p className="font-medium">Enable live results (Super Admin)</p>
            <p className="text-xs text-muted-foreground">
              {settingsLoading
                ? "Loading…"
                : liveResultsEnabled
                  ? "Currently on"
                  : "Currently off"}
            </p>
          </div>
          <Switch
            checked={liveResultsEnabled}
            disabled={settingsLoading || savingSettings}
            onCheckedChange={(checked) => saveLiveToggle(!!checked)}
          />
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Academic sessions</h3>
          <p className="text-sm text-muted-foreground">
            Sessions like 2026/2027 are selected when creating elections — no free-text entry.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="sessionName">New session</Label>
            <Input
              id="sessionName"
              placeholder="2026/2027"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-full"
            />
          </div>
          <Button
            type="button"
            className="rounded-full"
            disabled={creating}
            onClick={createSession}
          >
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Session
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Elections</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading sessions…
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No academic sessions yet. Create 2026/2027 to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.isCurrent && (
                        <Badge className="ml-2" variant="default">
                          Current
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "ACTIVE" ? "outline" : "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{s._count?.elections ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!s.isCurrent && s.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => sessionAction(s.id, "setCurrent")}
                          >
                            Set current
                          </Button>
                        )}
                        {s.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => sessionAction(s.id, "archive")}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </AppPage>
  );
}
