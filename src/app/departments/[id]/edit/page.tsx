"use client";

import { useEffect, useState, use } from "react";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/departments/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else toast.error("Failed to load department");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Network error");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-1/4" /><Skeleton className="h-[400px] w-full max-w-2xl" /></div>;
  if (!data) return <div>Department not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Department</h1>
        <p className="text-muted-foreground">Update department information.</p>
      </div>
      <DepartmentForm initialData={data} isEdit />
    </div>
  );
}
