"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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
        if (!res.ok) {
          throw new Error("Failed to load elections");
        }
        const { data } = await res.json();
        setElections(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchElections();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voting Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            View active elections and cast your ballot.
          </p>
        </div>
        <Link href="/vote/history">
          <Button variant="outline">Voting History</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 font-medium">Error: {error}</div>
      ) : elections.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Active Elections</CardTitle>
            <CardDescription>There are currently no open elections available for your department.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {elections.map((election) => (
            <Card key={election.id}>
              <CardHeader>
                <CardTitle>{election.title}</CardTitle>
                <CardDescription>
                  {election.endTime && (
                    <span>Closes: {new Date(election.endTime).toLocaleString()}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {election.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter>
                {election.isFullyVoted ? (
                  <Button className="w-full" disabled variant="secondary">
                    Already Voted
                  </Button>
                ) : (
                  <Link href={`/vote/${election.id}`} className="w-full">
                    <Button className="w-full">
                      {election.hasVoted ? "Continue Voting" : "Vote Now"}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
