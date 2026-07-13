"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { LinkButton } from "@/components/ui/link-button";

export default function PublicResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);

  const [data, setData] = useState<{
    title: string;
    totalTurnout: number;
    positions: {
      id: string;
      title: string;
      description: string | null;
      totalVotes: number;
      candidates: {
        id: string;
        name: string;
        slogan: string | null;
        photoUrl: string | null;
        voteCount: number;
        percentage: number;
        isTie: boolean;
      }[];
    }[];
  } | null>(null);
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

  return (
    <AppPage>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `,
        }}
      />

      <div className="flex flex-col justify-between gap-4 border-b pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Election Results</h1>
          <p className="mt-1 text-xl text-muted-foreground">{data.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Total Turnout
            </p>
            <p className="text-3xl font-bold">{data.totalTurnout}</p>
          </div>
          <Button className="no-print" variant="outline" onClick={() => window.print()}>
            Print PDF
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {data.positions.map((pos) => (
          <Card key={pos.id} className="print-break border-2 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{pos.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{pos.description}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{pos.totalVotes}</span>{" "}
                  <span className="text-sm text-muted-foreground">Votes Cast</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {pos.candidates.map((cand, idx) => {
                const isWinner =
                  idx === 0 && pos.candidates.length > 0 && cand.voteCount > 0;
                return (
                  <div
                    key={cand.id}
                    className={`relative rounded-lg border p-4 ${
                      isWinner && !cand.isTie
                        ? "border-primary/20 bg-primary/5"
                        : "bg-card"
                    }`}
                  >
                    {isWinner && !cand.isTie && (
                      <div className="absolute -right-3 -top-3">
                        <Badge className="border-0 bg-yellow-500 text-white shadow-sm hover:bg-yellow-600">
                          Winner
                        </Badge>
                      </div>
                    )}
                    <div className="mb-3 flex flex-col items-center gap-4 sm:flex-row">
                      {cand.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cand.photoUrl}
                          alt={cand.name}
                          className="h-16 w-16 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-bold text-muted-foreground">
                          {cand.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="flex items-center justify-center gap-2 text-xl font-bold sm:justify-start">
                          {cand.name}
                          {cand.isTie && <Badge variant="secondary">Tie</Badge>}
                        </h3>
                        {cand.slogan && (
                          <p className="text-sm italic text-muted-foreground">
                            &quot;{cand.slogan}&quot;
                          </p>
                        )}
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-3xl font-black">{cand.percentage}%</div>
                        <div className="text-sm font-medium text-muted-foreground">
                          {cand.voteCount} votes
                        </div>
                      </div>
                    </div>
                    <Progress value={cand.percentage} className="h-3 rounded-full" />
                  </div>
                );
              })}
              {pos.candidates.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  No candidate data available.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppPage>
  );
}
