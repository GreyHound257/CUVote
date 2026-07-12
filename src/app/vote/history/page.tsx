"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HistoryItem {
  election: {
    id: string;
    title: string;
    endTime: string | null;
  };
  votedAt: string;
  positionsVoted: string[];
}

export default function VoteHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/vote/history");
        if (!res.ok) {
          throw new Error("Failed to load voting history");
        }
        const { data } = await res.json();
        setHistory(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voting History</h1>
          <p className="text-muted-foreground mt-2">
            A secure log of your voting activity. Your ballot choices remain completely private.
          </p>
        </div>
        <Link href="/vote">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 font-medium">Error: {error}</div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">You have not participated in any elections yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle>{item.election.title}</CardTitle>
                <CardDescription>
                  Voted on: {new Date(item.votedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">Status:</span>
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Submitted Successfully
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Positions voted for: {item.positionsVoted.join(", ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
