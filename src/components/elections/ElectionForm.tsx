"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createElectionSchema, CreateElectionInput } from "@/validation/election";
import { STUDENT_LEVELS } from "@/lib/electionEligibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/shared/GlassCard";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Routes } from "@/constants";
import Link from "next/link";

type SessionOption = { id: string; name: string; isCurrent: boolean };
type TemplateOption = {
  id: string;
  name: string;
  eligibilityLevels: number[];
  positionsJson: { title: string; description?: string; minCandidates?: number; maxCandidates?: number }[];
};

export function ElectionForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateElectionInput>({
    resolver: zodResolver(createElectionSchema),
    defaultValues: {
      title: "",
      description: "",
      departmentId: "",
      academicSessionId: "",
      startTime: "",
      endTime: "",
      eligibilityLevels: [],
      saveAsTemplateName: "",
      positions: [{ title: "", description: "", minCandidates: 1, maxCandidates: 1 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "positions" });
  const eligibilityLevels = useWatch({ control, name: "eligibilityLevels" }) ?? [];

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDepartments(json.data);
      })
      .catch(() => toast.error("Failed to load departments"));

    fetch("/api/academic-sessions")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setSessions(json.data);
          const current = (json.data as SessionOption[]).find((s) => s.isCurrent);
          if (current) setValue("academicSessionId", current.id);
        }
      })
      .catch(() => toast.error("Failed to load academic sessions"));

    fetch("/api/election-templates")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTemplates(json.data);
      })
      .catch(() => {
        /* templates optional */
      });
  }, [setValue]);

  const toggleLevel = (level: number) => {
    const next = eligibilityLevels.includes(level)
      ? eligibilityLevels.filter((l) => l !== level)
      : [...eligibilityLevels, level].sort((a, b) => a - b);
    setValue("eligibilityLevels", next, { shouldValidate: true });
  };

  const applyTemplate = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const positions = (template.positionsJson || []).map((p) => ({
      title: p.title || "",
      description: p.description || "",
      minCandidates: p.minCandidates ?? 1,
      maxCandidates: p.maxCandidates ?? 1,
    }));

    if (positions.length > 0) replace(positions);
    setValue("eligibilityLevels", template.eligibilityLevels ?? []);
    toast.success(`Loaded template “${template.name}”`);
  };

  const onSubmit = async (data: CreateElectionInput) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        saveAsTemplateName: data.saveAsTemplateName?.trim() || undefined,
      };
      const res = await fetch("/api/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(
          payload.saveAsTemplateName
            ? "Election created and saved as template"
            : "Election created successfully"
        );
        router.push(Routes.ELECTIONS);
      } else {
        toast.error(json.error || "Failed to create election");
      }
    } catch {
      toast.error("An error occurred while creating the election");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <GlassCard className="space-y-4">
        <h3 className="font-semibold">Election Details</h3>

        {templates.length > 0 && (
          <div className="space-y-2">
            <Label>Start from template (optional)</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={(val) => applyTemplate(val)}
            >
              <SelectTrigger className="w-full rounded-full">
                <SelectValue placeholder="Choose a saved template">
                  {selectedTemplateId
                    ? templates.find((t) => t.id === selectedTemplateId)?.name
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="e.g. Department Student Union Election 2026"
            className="rounded-full focus-visible:ring-primary/20"
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Brief description of this election"
            rows={3}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Academic Session</Label>
            <Controller
              control={control}
              name="academicSessionId"
              render={({ field }) => {
                const selected = sessions.find((s) => s.id === field.value);
                return (
                  <Select
                    value={field.value || null}
                    onValueChange={(val) => field.onChange(val ?? "")}
                  >
                    <SelectTrigger className="w-full rounded-full">
                      <SelectValue placeholder="Select session">
                        {selected
                          ? `${selected.name}${selected.isCurrent ? " (Current)" : ""}`
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No sessions yet.{" "}
                          <Link href={Routes.SETTINGS} className="text-primary underline">
                            Create one in Settings
                          </Link>
                        </div>
                      ) : (
                        sessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.isCurrent ? " (Current)" : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {errors.academicSessionId && (
              <p className="text-sm text-destructive">{errors.academicSessionId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => {
                const selected = departments.find((d) => d.id === field.value);
                return (
                  <Select
                    value={field.value || null}
                    onValueChange={(val) => field.onChange(val ?? "")}
                  >
                    <SelectTrigger className="w-full rounded-full">
                      <SelectValue placeholder="Select department">
                        {selected ? `${selected.name} (${selected.code})` : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No departments available. Create one first.
                        </div>
                      ) : (
                        departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {errors.departmentId && (
              <p className="text-sm text-destructive">{errors.departmentId.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Eligibility by level</Label>
          <p className="text-xs text-muted-foreground">
            Leave all unchecked to allow every level in the department.
          </p>
          <div className="flex flex-wrap gap-2">
            {STUDENT_LEVELS.map((level) => {
              const active = eligibilityLevels.includes(level);
              return (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => toggleLevel(level)}
                >
                  {level} Level
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              {...register("startTime")}
              className="rounded-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              {...register("endTime")}
              className="rounded-full"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Positions</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ title: "", description: "", minCandidates: 1, maxCandidates: 1 })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add Position
          </Button>
        </div>

        {errors.positions?.message && (
          <p className="text-sm text-destructive">{errors.positions.message}</p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Position {index + 1}
                </span>
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Input
                    {...register(`positions.${index}.title`)}
                    placeholder="Position title (e.g. President)"
                    className="rounded-full"
                  />
                  {errors.positions?.[index]?.title && (
                    <p className="text-xs text-destructive">
                      {errors.positions[index]?.title?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Input
                    {...register(`positions.${index}.description`)}
                    placeholder="Position description (optional)"
                    className="rounded-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-2">
        <Label htmlFor="saveAsTemplateName">Save as template (optional)</Label>
        <Input
          id="saveAsTemplateName"
          {...register("saveAsTemplateName")}
          placeholder="e.g. Standard DSU Structure"
          className="rounded-full"
        />
        <p className="text-xs text-muted-foreground">
          Reuse these positions and level rules for future sessions.
        </p>
      </GlassCard>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="rounded-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            "Create Election"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
