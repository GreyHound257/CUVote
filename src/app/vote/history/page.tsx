"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkButton } from "@/components/ui/link-button";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { AlertCircle } from "lucide-react";

interface HistoryItem {
  election: {
    id: string;
    title: string;
    endTime: string | null;
  };
  votedAt: string;
}

export default function VoteHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/vote/history");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load voting history");
        }

        setHistory(json.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load voting history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <AppPage maxWidth="4xl">
      <PageHeader
        title="Voting History"
        description="A secure log of your voting activity. Your ballot choices remain completely private."
        action={
          <LinkButton href="/vote" variant="outline" className="rounded-full">
            Back to Dashboard
          </LinkButton>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <GlassCard className="flex items-start gap-4 border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Unable to load voting history</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </GlassCard>
      ) : history.length === 0 ? (
        <GlassCard className="text-center">
          <p className="text-muted-foreground">You have not participated in any elections yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.election.id} className="border-border/50">
              <CardHeader>
                <CardTitle>{item.election.title}</CardTitle>
                <CardDescription>
                  Voted on: {new Date(item.votedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:text-green-400">
                  Ballot submitted successfully
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppPage>
  );
}
