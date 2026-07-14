"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Roles } from "@/constants";
import { toast } from "sonner";
import { Megaphone, Plus } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  department?: { id: string; name: string; code: string } | null;
  createdBy?: { name: string | null; email: string | null } | null;
};

type Department = { id: string; name: string; code: string };

export default function AnnouncementsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === Roles.SUPER_ADMIN || role === Roles.DEPARTMENT_ADMIN;

  const [items, setItems] = useState<Announcement[]>([]);
  const [manageItems, setManageItems] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("STUDENTS");
  const [departmentId, setDepartmentId] = useState("");
  const [publishNow, setPublishNow] = useState(true);

  const loadPublished = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else toast.error(json.error || "Failed to load announcements");
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadManage = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/announcements?manage=true");
      const json = await res.json();
      if (json.success) setManageItems(json.data);
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  useEffect(() => {
    loadPublished();
    loadManage();
  }, [loadPublished, loadManage]);

  useEffect(() => {
    if (role !== Roles.SUPER_ADMIN) return;
    fetch("/api/departments")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDepartments(json.data ?? []);
      })
      .catch(() => undefined);
  }, [role]);

  const createAnnouncement = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          departmentId: audience === "DEPARTMENT" ? departmentId || null : null,
          status: publishNow ? "PUBLISHED" : "DRAFT",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Could not create announcement");
        return;
      }
      toast.success(publishNow ? "Announcement published" : "Draft saved");
      setTitle("");
      setBody("");
      setShowComposer(false);
      await Promise.all([loadPublished(), loadManage()]);
    } catch {
      toast.error("Could not create announcement");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Update failed");
        return;
      }
      toast.success(`Marked as ${status.toLowerCase()}`);
      await Promise.all([loadPublished(), loadManage()]);
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Announcements"
        description="Official notices for elections, deadlines, and portal updates."
        action={
          isAdmin ? (
            <Button onClick={() => setShowComposer((v) => !v)}>
              <Plus className="mr-2 h-4 w-4" />
              {showComposer ? "Close" : "New announcement"}
            </Button>
          ) : undefined
        }
      />

      {isAdmin && showComposer && (
        <GlassCard className="mb-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Voting opens Monday"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Share election guidance, deadlines, or procedural updates…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v ?? "STUDENTS")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Audience">
                    {(value: string | null) => {
                      if (value === "EVERYONE") return "Everyone";
                      if (value === "STUDENTS") return "Students";
                      if (value === "ADMINS") return "Admins";
                      if (value === "DEPARTMENT") return "Department";
                      return "Audience";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {role === Roles.SUPER_ADMIN && (
                    <SelectItem value="EVERYONE">Everyone</SelectItem>
                  )}
                  <SelectItem value="STUDENTS">Students</SelectItem>
                  {role === Roles.SUPER_ADMIN && (
                    <SelectItem value="ADMINS">Admins</SelectItem>
                  )}
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audience === "DEPARTMENT" && role === Roles.SUPER_ADMIN && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="rounded border-border"
            />
            Publish immediately (notifies audience)
          </label>
          <Button onClick={createAnnouncement} disabled={saving || !title || !body}>
            {saving ? "Saving…" : publishNow ? "Publish" : "Save draft"}
          </Button>
        </GlassCard>
      )}

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="When officials publish notices, they will appear here."
          icon={<Megaphone className="h-10 w-10 text-muted-foreground/50" />}
        />
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <GlassCard key={a.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">{a.title}</h2>
                  <Badge variant="secondary">{a.audience}</Badge>
                  {a.department && (
                    <Badge variant="outline">{a.department.code}</Badge>
                  )}
                </div>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => patchStatus(a.id, "ARCHIVED")}>
                    Archive
                  </Button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              <p className="text-xs text-muted-foreground">
                {a.publishedAt
                  ? new Date(a.publishedAt).toLocaleString()
                  : new Date(a.createdAt).toLocaleString()}
                {a.createdBy?.name ? ` · ${a.createdBy.name}` : ""}
              </p>
            </GlassCard>
          ))}
        </div>
      )}

      {isAdmin && manageItems.some((a) => a.status === "DRAFT" || a.status === "ARCHIVED") && (
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Manage drafts & archive</h2>
          {manageItems
            .filter((a) => a.status === "DRAFT" || a.status === "ARCHIVED")
            .map((a) => (
              <GlassCard key={`m-${a.id}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.title}</span>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                </div>
                <div className="flex gap-2">
                  {a.status === "DRAFT" && (
                    <Button size="sm" onClick={() => patchStatus(a.id, "PUBLISHED")}>
                      Publish
                    </Button>
                  )}
                  {a.status !== "ARCHIVED" && (
                    <Button size="sm" variant="outline" onClick={() => patchStatus(a.id, "ARCHIVED")}>
                      Archive
                    </Button>
                  )}
                </div>
              </GlassCard>
            ))}
        </div>
      )}
    </AppPage>
  );
}
