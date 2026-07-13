"use client";

import { EmptyState } from "@/components/shared/EmptyState";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PublicResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);

  const [data, setData] = useState<any>(null);
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
      } catch (err: any) {
        setError(err.message || "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [electionId]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto p-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Print styles injected via standard style tag to avoid heavy dependencies */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Election Results</h1>
          <p className="text-xl text-muted-foreground mt-1">{data.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Total Turnout</p>
            <p className="text-3xl font-bold">{data.totalTurnout}</p>
          </div>
          <Button className="no-print" variant="outline" onClick={() => window.print()}>
            Print PDF
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {data.positions.map((pos: any) => (
          <Card key={pos.id} className="print-break border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">{pos.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{pos.description}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{pos.totalVotes}</span> <span className="text-muted-foreground text-sm">Votes Cast</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {pos.candidates.map((cand: any, idx: number) => {
                const isWinner = idx === 0 && pos.candidates.length > 0 && cand.voteCount > 0;
                return (
                  <div key={cand.id} className={`p-4 rounded-lg border relative ${isWinner && !cand.isTie ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                    {isWinner && !cand.isTie && (
                      <div className="absolute -top-3 -right-3">
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm border-0">Winner</Badge>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4 items-center mb-3">
                      {cand.photoUrl ? (
                        <img src={cand.photoUrl} alt={cand.name} className="w-16 h-16 rounded-full object-cover border" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {cand.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xl font-bold flex items-center justify-center sm:justify-start gap-2">
                          {cand.name}
                          {cand.isTie && <Badge variant="secondary">Tie</Badge>}
                        </h3>
                        {cand.slogan && <p className="text-sm text-muted-foreground italic">&quot;{cand.slogan}&quot;</p>}
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-3xl font-black">{cand.percentage}%</div>
                        <div className="text-sm font-medium text-muted-foreground">{cand.voteCount} votes</div>
                      </div>
                    </div>
                    <Progress value={cand.percentage} className="h-3 rounded-full" />
                  </div>
                );
              })}
              {pos.candidates.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No candidate data available.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
