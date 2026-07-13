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
import { AlertCircle } from "lucide-react";

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

  return (
    <AppPage>
      <PageHeader
        title="Voting Dashboard"
        description="View active elections and cast your ballot."
        action={
          <LinkButton href="/vote/history" variant="outline" className="rounded-full">
            Voting History
          </LinkButton>
        }
      />

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
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
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Unable to load elections</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </GlassCard>
      ) : elections.length === 0 ? (
        <GlassCard>
          <h3 className="font-semibold">No Active Elections</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are currently no open elections available for your department.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {elections.map((election) => (
            <Card key={election.id} className="border-border/50 transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="leading-snug">{election.title}</CardTitle>
                  {election.isFullyVoted && (
                    <Badge variant="secondary" className="shrink-0">Voted</Badge>
                  )}
                </div>
                <CardDescription>
                  {election.endTime && (
                    <span>Closes: {new Date(election.endTime).toLocaleString()}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {election.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter>
                {election.isFullyVoted ? (
                  <Button className="w-full rounded-full" disabled variant="secondary">
                    Already Voted
                  </Button>
                ) : (
                  <LinkButton href={`/vote/${election.id}`} className="w-full rounded-full" linkClassName="w-full">
                    {election.hasVoted ? "Continue Voting" : "Vote Now"}
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
