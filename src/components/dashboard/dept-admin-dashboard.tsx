"use client";
import { EmptyState } from "@/components/shared/EmptyState";


import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent, useChartColors } from "./chart-styles";
import { TurnoutLineChart } from "./TurnoutLineChart";
import { Users, Vote, UserCheck, Activity, Printer } from "lucide-react";
import { SearchFilter } from "./search-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DeptAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const COLORS = useChartColors();

  useEffect(() => {
    fetch("/api/dashboard/dept-admin")
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
    return <div className="text-red-500 p-4">Error loading dashboard data.</div>;
  }

  const { department, metrics, elections, activity, analytics } = data;

  const electionStatusData = Object.entries(metrics.electionsStatusSummary).map(([name, value]) => ({
    name, value
  }));

  const participationRate = metrics.totalStudents > 0
    ? Math.round((metrics.eligibleStudents / metrics.totalStudents) * 100)
    : 0;

  const handleSearch = (term: string) => setSearchTerm(term);
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === "status") setStatusFilter(value);
  };

  const filteredCandidates = elections.awaitingApproval.filter((candidate: any) => {
    const matchesSearch = candidate.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          candidate.student.matricNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Department Dashboard</h2>
          <p className="text-muted-foreground">{department.name} ({department.code})</p>
        </div>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold">Department Report: {department.name}</h1>
        <p>Generated Date: {new Date().toLocaleString()}</p>
        <p>Report Scope: Department Analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Voters</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.eligibleStudents}</div>
            <p className="text-xs text-muted-foreground">{participationRate}% of total students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{elections.active.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Candidates</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{elections.awaitingApproval.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="mb-4">Candidates Awaiting Approval</CardTitle>
            <SearchFilter onSearch={handleSearch} onFilterChange={handleFilterChange} placeholder="Search candidates..." />

          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCandidates.map((candidate: any) => (
                <div key={candidate.id} className="flex items-center justify-between text-sm p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{candidate.student.fullName} <span className="text-muted-foreground">({candidate.student.matricNo})</span></p>
                    <p className="text-xs text-muted-foreground">{candidate.position.title} - {candidate.election.title}</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Review</Badge>
                </div>
              ))}
              {filteredCandidates.length === 0 && <EmptyState title="No candidates" description="No candidates are currently awaiting approval." />}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Election Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={electionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {electionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 mt-2">
               {electionStatusData.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="font-bold">{entry.value}</span>
                  </div>
               ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Voter Turnover (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <TurnoutLineChart data={analytics.turnoutDaily} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Department Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-muted-foreground text-xs">{log.user?.email} • {new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <Badge variant="secondary">{log.entity || 'System'}</Badge>
              </div>
            ))}
            {activity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
