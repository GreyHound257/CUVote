"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Roles } from "@/constants";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";

type ResultsData = {
  id: string;
  title: string;
  status: string;
  totalTurnout: number;
  isLive?: boolean;
  positions: {
    id: string;
    title: string;
    totalVotes: number;
    candidates: {
      id: string;
      name: string;
      voteCount: number;
      percentage: number;
      isTie: boolean;
    }[];
  }[];
};

export default function AdminResultsManager({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const isSuperAdmin = role === Roles.SUPER_ADMIN;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated" && role === Roles.STUDENT) {
      router.replace(`/elections/${electionId}/results`);
    }
  }, [authStatus, role, electionId, router]);

  useEffect(() => {
    if (electionId && role && role !== Roles.STUDENT) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId, role]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/results/${electionId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load results");
        toast.error(json.error || "Failed to load results");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
      toast.error(message);
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Network error");
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <AppPage>
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </AppPage>
    );
  }

  if (error) {
    return (
      <AppPage>
        <PageHeader title="Results" description="Access restricted for this election status." />
        <EmptyState title="Cannot view results yet" description={error} />
        <LinkButton href="/elections" variant="outline" className="rounded-full">
          Back to Elections
        </LinkButton>
      </AppPage>
    );
  }

  if (!data) return null;

  const isLive = data.isLive || data.status === "VOTING_OPEN";
  const canPublish =
    data.status === "VOTING_CLOSED" || data.status === "RESULTS_GENERATED";
  const alreadyPublished =
    data.status === "PUBLISHED_RESULTS" || data.status === "ARCHIVED";

  return (
    <AppPage>
      <PageHeader
        title={isLive && isSuperAdmin ? "Live Election Report" : "Results Manager"}
        description={
          isLive
            ? "Super Admin live tallies while voting is open. Department admins see results only after voting is closed."
            : data.title
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={handleGenerate} disabled={generating}>
              {generating
                ? "Refreshing…"
                : isLive
                  ? "Refresh Live Tallies"
                  : "Generate Results"}
            </Button>
            <Button
              className="rounded-full"
              onClick={handlePublish}
              disabled={publishing || !canPublish || alreadyPublished}
            >
              {publishing
                ? "Publishing…"
                : alreadyPublished
                  ? "Already Published"
                  : "Publish Results"}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                window.location.href = `/api/results/${electionId}/export/csv`;
              }}
            >
              Export CSV
            </Button>
            <LinkButton href="/elections" variant="ghost" className="rounded-full">
              Elections
            </LinkButton>
          </div>
        }
      />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{data.title}</h2>
        {isLive && (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0">
            Live — Super Admin only
          </Badge>
        )}
        {alreadyPublished && <Badge variant="default">Published</Badge>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.status.replace(/_/g, " ")}</div>
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
        {data.positions.map((pos) => (
          <Card key={pos.id}>
            <CardHeader>
              <CardTitle>{pos.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Total Votes: {pos.totalVotes}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pos.candidates.map((cand) => (
                <div key={cand.id} className="space-y-1 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      {cand.name}
                      {cand.isTie && <Badge variant="secondary">Tie</Badge>}
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground">
                      {cand.voteCount} votes ({cand.percentage}%)
                    </div>
                  </div>
                  <Progress value={cand.percentage} className="h-2" />
                </div>
              ))}
              {pos.candidates.length === 0 && (
                <EmptyState
                  title="No candidates or votes"
                  description="Generate tallies after votes have been cast."
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppPage>
  );
}
