"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { LinkButton } from "@/components/ui/link-button";
import { ResultsSummaryCards } from "@/components/results/ResultsSummaryCards";
import { PositionResultsChart } from "@/components/results/PositionResultsChart";
import { PositionResultsList } from "@/components/results/PositionResultsList";
import { WinnerSummary } from "@/components/results/WinnerSummary";
import type { ElectionResultsPayload } from "@/types/results";
import { format } from "date-fns";

export default function PublicResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);

  const [data, setData] = useState<ElectionResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
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
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [electionId]);

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
        <PageHeader
          title="Election Results"
          description="Published results only — unavailable until an admin publishes them."
        />
        <EmptyState title="Results not available" description={error} />
        <LinkButton href="/dashboard" variant="outline" className="rounded-full">
          Back to Dashboard
        </LinkButton>
      </AppPage>
    );
  }

  if (!data) return null;

  const winnerCount = data.positions.reduce((sum, pos) => sum + pos.winners.length, 0);

  return (
    <AppPage>
      <div className="flex flex-col justify-between gap-4 border-b pb-4 md:flex-row md:items-center print:border-0">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Election Results</h1>
          <p className="mt-1 text-xl text-muted-foreground">{data.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.department.name} ({data.department.code})
            {data.publishedAt && (
              <> · Published {format(new Date(data.publishedAt), "MMM d, yyyy 'at' HH:mm")}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = `/api/results/${electionId}/export/csv`;
            }}
          >
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print PDF
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <ResultsSummaryCards
          totalTurnout={data.totalTurnout}
          eligibleVoters={data.eligibleVoters}
          turnoutRate={data.turnoutRate}
          positionCount={data.positions.length}
          winnerCount={winnerCount}
        />

        <WinnerSummary positions={data.positions} />

        {data.positions.map((pos) => (
          <Card key={pos.id} className="border-2 shadow-sm break-inside-avoid">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{pos.title}</CardTitle>
                  {pos.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{pos.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-semibold">{pos.totalVotes}</span>{" "}
                  <span className="text-sm text-muted-foreground">Votes Cast</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <PositionResultsChart candidates={pos.candidates} />
              <PositionResultsList
                candidates={pos.candidates}
                showPhotos
                variant="public"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </AppPage>
  );
}
