"use client";
import { EmptyState } from "@/components/shared/EmptyState";


import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function AdminResultsManager({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (electionId) {
      fetchResults();
    }
  }, [electionId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/results/${electionId}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || "Failed to load results");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/results/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchResults();
      } else {
        toast.error(json.error || "Failed to generate results");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/results/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchResults();
      } else {
        toast.error(json.error || "Failed to publish results");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data) return <div>No data available.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Results Manager</h1>
          <p className="text-muted-foreground">{data.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate Internal Counts"}
          </Button>
          <Button onClick={handlePublish} disabled={publishing || data.status === "PUBLISHED_RESULTS" || data.status === "ARCHIVED"}>
            {publishing ? "Publishing..." : data.status === "PUBLISHED_RESULTS" ? "Already Published" : "Publish Results"}
          </Button>
          <Button variant="secondary" onClick={() => window.location.href = `/api/results/${electionId}/export/csv`}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.status}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Turnout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTurnout}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {data.positions.map((pos: any) => (
          <Card key={pos.id}>
            <CardHeader>
              <CardTitle>{pos.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Total Votes: {pos.totalVotes}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pos.candidates.map((cand: any) => (
                <div key={cand.id} className="space-y-1 border p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div className="font-medium flex items-center gap-2">
                      {cand.name}
                      {cand.isTie && <Badge variant="secondary">Tie</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground font-semibold">
                      {cand.voteCount} votes ({cand.percentage}%)
                    </div>
                  </div>
                  <Progress value={cand.percentage} className="h-2" />
                </div>
              ))}
              {pos.candidates.length === 0 && (
                <EmptyState title="No candidates or votes" description="There are no candidates or votes calculated for this position yet." />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
