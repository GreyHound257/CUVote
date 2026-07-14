"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Roles } from "@/constants";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { ResultsSummaryCards } from "@/components/results/ResultsSummaryCards";
import { PositionResultsChart } from "@/components/results/PositionResultsChart";
import { PositionResultsList } from "@/components/results/PositionResultsList";
import { WinnerSummary } from "@/components/results/WinnerSummary";
import type { ElectionResultsPayload } from "@/types/results";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";

export default function AdminResultsManager({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const isSuperAdmin = role === Roles.SUPER_ADMIN;

  const [data, setData] = useState<ElectionResultsPayload | null>(null);
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
  const winnerCount = data.positions.reduce((sum, pos) => sum + pos.winners.length, 0);

  return (
    <AppPage>
      <PageHeader
        title={isLive && isSuperAdmin ? "Live Election Report" : "Results Manager"}
        description={
          isLive
            ? "Super Admin live tallies while voting is open. Department admins see results only after voting is closed."
            : `${data.title} · ${data.department.code}`
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
            <LinkButton href={`/elections/${electionId}/results`} variant="outline" className="rounded-full">
              Public View
            </LinkButton>
            <LinkButton href="/elections" variant="ghost" className="rounded-full">
              Elections
            </LinkButton>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isLive && (
          <Badge className="border-0 bg-amber-600 text-white hover:bg-amber-700">
            Live — Super Admin only
          </Badge>
        )}
        {alreadyPublished && <Badge variant="default">Published</Badge>}
        {data.publishedAt && (
          <span className="text-sm text-muted-foreground">
            Published {format(new Date(data.publishedAt), "MMM d, yyyy 'at' HH:mm")}
          </span>
        )}
      </div>

      {!data.hasGeneratedResults && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">No tallies generated yet</p>
              <p className="text-sm text-muted-foreground">
                {isLive
                  ? "Click Refresh Live Tallies to compile current ballot counts."
                  : "Generate results from submitted ballots before publishing to students."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ResultsSummaryCards
        totalTurnout={data.totalTurnout}
        eligibleVoters={data.eligibleVoters}
        turnoutRate={data.turnoutRate}
        positionCount={data.positions.length}
        winnerCount={winnerCount}
        status={data.status}
        isLive={isLive}
      />

      {data.hasGeneratedResults && <WinnerSummary positions={data.positions} />}

      <div className="mt-6 space-y-6">
        {data.positions.map((pos) => (
          <Card key={pos.id}>
            <CardHeader>
              <CardTitle>{pos.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Total Votes: {pos.totalVotes}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.hasGeneratedResults ? (
                <>
                  <PositionResultsChart candidates={pos.candidates} />
                  <PositionResultsList candidates={pos.candidates} variant="compact" />
                </>
              ) : (
                <EmptyState
                  title="No tallies yet"
                  description="Generate or refresh results to see vote counts for this position."
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppPage>
  );
}
