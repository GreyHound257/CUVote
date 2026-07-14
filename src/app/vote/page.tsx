"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { AlertCircle, Vote } from "lucide-react";

interface Election {
  id: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  hasVoted: boolean;
  isFullyVoted: boolean;
}

export default function VoteDashboard() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchElections() {
      try {
        const res = await fetch("/api/vote/elections");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load elections");
        }

        setElections(json.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load elections");
      } finally {
        setLoading(false);
      }
    }
    fetchElections();
  }, []);

  const openCount = elections.filter((e) => !e.isFullyVoted).length;
  const votedCount = elections.filter((e) => e.isFullyVoted).length;

  return (
    <AppPage>
      <PageHeader
        title="Voting Dashboard"
        description="Open eligible elections for your department and level. Cast once — your ballot stays anonymous."
        action={
          <LinkButton href="/vote/history" variant="outline" className="rounded-full">
            Voting History
          </LinkButton>
        }
      />

      {!loading && !error && elections.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="rounded-full">
            {openCount} open
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            {votedCount} completed
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardHeader>
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full rounded-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="flex items-start gap-4 border-destructive/30 bg-destructive/5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Unable to load elections</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </GlassCard>
      ) : elections.length === 0 ? (
        <GlassCard className="space-y-2 text-center">
          <Vote className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold">No open ballots</h3>
          <p className="text-sm text-muted-foreground">
            There are no elections open for your department and level right now.
            Check back when voting opens, or review past activity in Voting History.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {elections.map((election) => (
            <Card
              key={election.id}
              className="border-border/50 transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="leading-snug">{election.title}</CardTitle>
                  {election.isFullyVoted ? (
                    <Badge variant="secondary" className="shrink-0 rounded-full">
                      Voted
                    </Badge>
                  ) : (
                    <Badge className="shrink-0 rounded-full">Open</Badge>
                  )}
                </div>
                <CardDescription>
                  {election.endTime ? (
                    <span>Closes {new Date(election.endTime).toLocaleString()}</span>
                  ) : (
                    <span>Voting window open</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {election.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter>
                {election.isFullyVoted ? (
                  <Button className="w-full rounded-full" disabled variant="secondary">
                    Ballot already submitted
                  </Button>
                ) : (
                  <LinkButton
                    href={`/vote/${election.id}`}
                    className="w-full rounded-full"
                    linkClassName="w-full"
                  >
                    Open ballot
                  </LinkButton>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </AppPage>
  );
}
