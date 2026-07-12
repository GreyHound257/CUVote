"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Vote, Calendar, Clock, History, FileText } from "lucide-react";
import { SearchFilter } from "./search-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function StudentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/student")
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!data || data.error) {
    return <div className="text-red-500 p-4">Error loading dashboard data. {data?.error}</div>;
  }

  const { profile, elections, history } = data;


  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleSearch = (term: string) => setSearchTerm(term);
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === "status") setStatusFilter(value);
  };

  const filteredElections = elections.eligible.filter((election: any) => {
    const matchesSearch = election.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Student Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {profile.fullName}. Here's your voting overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Status</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile.isEligible ? <span className="text-green-600">Eligible</span> : <span className="text-red-600">Ineligible</span>}
            </div>
            <p className="text-xs text-muted-foreground">{profile.department.name} - Level {profile.level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{elections.eligible.length}</div>
            <p className="text-xs text-muted-foreground">Currently open for voting</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Elections</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{elections.upcoming.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled future elections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="mb-4">Active & Eligible Elections</CardTitle>
              <SearchFilter onSearch={handleSearch} onFilterChange={handleFilterChange} placeholder="Search active elections..." />

            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredElections.map((election: any) => (
                  <div key={election.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                    <div>
                      <p className="font-bold">{election.title}</p>
                      <p className="text-sm text-muted-foreground">Closes: {new Date(election.endTime).toLocaleString()}</p>
                    </div>
                    {election.hasVoted ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Voted Successfully</Badge>
                    ) : (
                      <Button disabled={!profile.isEligible} render={<Link href={`/vote/${election.id}`} />}>
                        <span>Go to Voting</span>
                      </Button>
                    )}
                  </div>
                ))}
                {filteredElections.length === 0 && <p className="text-sm text-muted-foreground">No active elections at this time.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Published Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {elections.publishedResults.map((election: any) => (
                  <div key={election.id} className="flex items-center justify-between text-sm p-3 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{election.title}</p>
                    </div>
                    <Button variant="outline" size="sm" render={<Link href={`/elections/${election.id}/results`} />}>
                      <span>View Results</span>
                    </Button>
                  </div>
                ))}
                {elections.publishedResults.length === 0 && <p className="text-sm text-muted-foreground">No published results available.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Elections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {elections.upcoming.map((election: any) => (
                  <div key={election.id} className="text-sm p-3 border rounded-md">
                    <p className="font-medium">{election.title}</p>
                    <p className="text-muted-foreground text-xs">Starts: {new Date(election.startTime).toLocaleString()}</p>
                  </div>
                ))}
                {elections.upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming elections scheduled.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Voting Activity</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">Voted: {record.position.title}</p>
                      <p className="text-muted-foreground text-xs">{record.election.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-muted-foreground">No recent voting history.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
