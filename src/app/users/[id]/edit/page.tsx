"use client";

import { useEffect, useState, use } from "react";
import { UserForm } from "@/components/users/UserForm";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else toast.error("Failed to load user");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Network error");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-1/4" /><Skeleton className="h-[400px] w-full max-w-2xl" /></div>;
  if (!data) return <div>User not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
        <p className="text-muted-foreground">Update user information.</p>
      </div>
      <UserForm initialData={data} isEdit />
    </div>
  );
}
