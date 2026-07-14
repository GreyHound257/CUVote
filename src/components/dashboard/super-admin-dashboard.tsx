"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartTooltipContent, useChartColors } from "./chart-styles";
import { TurnoutLineChart } from "./TurnoutLineChart";
import { Users, Building2, Vote, ShieldCheck, Activity, Printer } from "lucide-react";
import { SearchFilter } from "./search-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const COLORS = useChartColors();

  useEffect(() => {
    fetch("/api/dashboard/super-admin")
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

  const { metrics, analytics, system } = data;

  // Transform data for charts
  const deptChartData = analytics.departmentStats.map((d: any) => ({
    name: d.code,
    Students: d._count.students,
    Elections: d._count.elections
  }));

  const COLORS = CHART_COLORS;
  const electionStatusData = Object.entries(metrics.electionsStatusSummary).map(([name, value]) => ({
    name, value
  }));





  const handleSearch = (term: string) => setSearchTerm(term);
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === "status") setStatusFilter(value);
  };

  const filteredLogins = system.recentLogins.filter((user: any) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground">System-wide overview and operational analytics.</p>
        </div>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold">CUVote System Report</h1>
        <p>Generated Date: {new Date().toLocaleString()}</p>
        <p>Report Scope: System-Wide Overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">{metrics.eligibleStudents} Eligible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">{metrics.totalDepartmentAdmins} Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeElections}</div>
            <p className="text-xs text-muted-foreground">{metrics.totalCandidates} Total Candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{system.health.status}</div>
            <p className="text-xs text-muted-foreground">Uptime: {system.health.uptime}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Department Statistics</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="Students" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Elections" fill="currentColor" className="fill-muted-foreground" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Election Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={electionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
            <div className="flex flex-wrap gap-2 justify-center mt-2">
               {electionStatusData.map((entry: any, index: number) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name}: {entry.value}
                  </Badge>
               ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Voter Turnover (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <TurnoutLineChart data={analytics.turnoutDaily} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {system.recentAuditLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-muted-foreground text-xs">{log.user?.email || "System"} • {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary">{log.entity || 'System'}</Badge>
                </div>
              ))}
              {system.recentAuditLogs.length === 0 && <p className="text-sm text-muted-foreground">No recent audit logs.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="mb-4">Recent Logins</CardTitle>
            <SearchFilter onSearch={handleSearch} onFilterChange={handleFilterChange} placeholder="Search users..." />

          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLogins.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-muted-foreground text-xs">{user.role}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(user.lastLogin).toLocaleString()}</span>
                </div>
              ))}
              {filteredLogins.length === 0 && <p className="text-sm text-muted-foreground">No recent logins.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
