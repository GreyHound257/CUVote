"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-1/4" /><Skeleton className="h-[400px] w-full" /></div>;
  if (!data) return <div>User not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data.name as string}</h1>
          <p className="text-muted-foreground">Email: {data.email as string}</p>
        </div>
        <div className="flex gap-2">
           <Badge variant={data.status === "ACTIVE" ? "default" : data.status === "SUSPENDED" ? "secondary" : "destructive"} className="text-sm">
             {data.status as string}
           </Badge>
           <Badge variant="outline" className="text-sm">
             {data.role as string}
           </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-semibold text-sm">Department:</span>
              <p className="text-sm text-muted-foreground">{((data.department as Record<string, unknown> | null)?.name as string) || "N/A"}</p>
            </div>
            <div>
              <span className="font-semibold text-sm">Created At:</span>
              <p className="text-sm text-muted-foreground">{format(new Date(data.createdAt as string), "MMM dd, yyyy HH:mm")}</p>
            </div>
            <div>
              <span className="font-semibold text-sm">Last Updated:</span>
              <p className="text-sm text-muted-foreground">{format(new Date(data.updatedAt as string), "MMM dd, yyyy HH:mm")}</p>
            </div>
             <div>
              <span className="font-semibold text-sm">Last Login:</span>
              <p className="text-sm text-muted-foreground">{data.lastLogin ? format(new Date(data.lastLogin as string), "MMM dd, yyyy HH:mm") : "Never"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
