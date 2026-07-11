"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDepartmentSchema, CreateDepartmentInput } from "@/validation/department";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Routes } from "@/constants";
import { useState } from "react";

interface DepartmentFormProps {
  initialData?: Record<string, unknown>;
  isEdit?: boolean;
}

export function DepartmentForm({ initialData, isEdit }: DepartmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      name: (initialData?.name as string) || "",
      code: (initialData?.code as string) || "",
      description: (initialData?.description as string) || "",
      status: (initialData?.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
    }
  });

  const onSubmit = async (data: CreateDepartmentInput) => {
    setIsSubmitting(true);
    try {
      const url = isEdit && initialData?.id ? `/api/departments/${initialData.id as string}` : "/api/departments";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "Department updated successfully" : "Department created successfully");
        router.push(Routes.DEPARTMENTS);
      } else {
        toast.error(json.error || "An error occurred");
      }
    } catch (error) {
      toast.error("Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input {...register("name")} placeholder="e.g. Computer Science" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Code</label>
        <Input {...register("code")} placeholder="e.g. CS" className="uppercase" />
        {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea {...register("description")} placeholder="Department description..." />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select
          value={watch("status")}
          onValueChange={(val: "ACTIVE" | "INACTIVE" | null) => val && setValue("status", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Update Department" : "Create Department"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
