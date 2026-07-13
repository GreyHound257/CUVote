"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form"; // Added Controller
import { zodResolver } from "@hookform/resolvers/zod";
import { createElectionSchema, CreateElectionInput } from "@/validation/election";
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

export function ElectionForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateElectionInput>({
    resolver: zodResolver(createElectionSchema),
    defaultValues: {
      title: "",
      description: "",
      departmentId: "",
      startTime: "",
      endTime: "",
      positions: [{ title: "", description: "", minCandidates: 1, maxCandidates: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "positions" });

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDepartments(json.data);
      })
      .catch(() => toast.error("Failed to load departments")); // Added error handling
  }, []);

  const onSubmit = async (data: CreateElectionInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Election created successfully");
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
          {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input id="startTime" type="datetime-local" {...register("startTime")} className="rounded-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input id="endTime" type="datetime-local" {...register("endTime")} className="rounded-full" />
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
            onClick={() => append({ title: "", description: "", minCandidates: 1, maxCandidates: 1 })}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Position
          </Button>
        </div>

        {errors.positions?.message && (
          <p className="text-sm text-destructive">{errors.positions.message}</p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Position {index + 1}</span>
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
                    <p className="text-xs text-destructive">{errors.positions[index]?.title?.message}</p>
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
        <Button type="button" variant="outline" className="rounded-full" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}