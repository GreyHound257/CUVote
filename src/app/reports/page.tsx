import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Download } from "lucide-react";
import { ReportCard } from "./report-card";
import Link from "next/link";

export const metadata = {
  title: "Reports & Exports - CUVote",
  description: "Generate and export system reports.",
};

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { role } = session.user;

  if (role === "STUDENT") {
    redirect("/dashboard");
  }

  const reports = [
    {
      id: "students",
      title: "Student Roster Report",
      description: "Export a list of all students, their eligibility status, and departments.",
      allowedRoles: ["SUPER_ADMIN", "DEPARTMENT_ADMIN"]
    },
    {
      id: "elections",
      title: "Elections Summary",
      description: "Export metadata for all elections including start/end times and statuses.",
      allowedRoles: ["SUPER_ADMIN", "DEPARTMENT_ADMIN"]
    },
    {
      id: "audit",
      title: "System Audit Logs",
      description: "Comprehensive security export of recent system activities and logins.",
      allowedRoles: ["SUPER_ADMIN"]
    }
  ];

  const availableReports = reports.filter(r => r.allowedRoles.includes(role));


  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Reports</h2>
        <p className="text-muted-foreground">Generate and export administrative reports.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {availableReports.map(report => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                {report.title}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" render={<Link href={`/api/reports/export?type=${report.id}`} target="_blank" className="flex items-center" />}>
                <span className="flex items-center">
                  <Download className="mr-2 h-4 w-4" /> Download CSV
                </span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {availableReports.length === 0 && (
        <p className="text-muted-foreground">You do not have permission to view any reports.</p>
      )}
    </div>
  );
}
