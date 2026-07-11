"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function DepartmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-1/4" /><Skeleton className="h-[400px] w-full" /></div>;
  if (!data) return <div>Department not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data.name as string}</h1>
          <p className="text-muted-foreground">Code: {data.code as string}</p>
        </div>
        <Badge variant={data.status === "ACTIVE" ? "default" : data.status === "INACTIVE" ? "secondary" : "destructive"} className="text-sm">
          {data.status as string}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-semibold text-sm">Description:</span>
              <p className="text-sm text-muted-foreground">{(data.description as string) || "No description provided."}</p>
            </div>
            <div>
              <span className="font-semibold text-sm">Created At:</span>
              <p className="text-sm text-muted-foreground">{format(new Date(data.createdAt as string), "MMM dd, yyyy HH:mm")}</p>
            </div>
            <div>
              <span className="font-semibold text-sm">Last Updated:</span>
              <p className="text-sm text-muted-foreground">{format(new Date(data.updatedAt as string), "MMM dd, yyyy HH:mm")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata & Relationships</CardTitle>
            <CardDescription>Future modules will populate this</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-sm">Elections:</span>
              <span className="text-sm text-muted-foreground">0</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-sm">Students:</span>
              <span className="text-sm text-muted-foreground">0</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-sm">Candidates:</span>
              <span className="text-sm text-muted-foreground">0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
