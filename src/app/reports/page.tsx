import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportCard } from "./report-card";
import { Roles } from "@/constants";

export const metadata = {
  title: "Reports & Exports - CUVote",
  description: "Generate and export system reports.",
};

type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  allowedRoles: string[];
  filterOptions?: { label: string; value: string }[];
  placeholder?: string;
};

const reports: ReportDefinition[] = [
  {
    id: "students",
    title: "Student Roster Report",
    description: "Export students with eligibility status, level, and department.",
    allowedRoles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN],
    placeholder: "Search by name, matric, or email…",
    filterOptions: [
      { label: "Active", value: "ACTIVE" },
      { label: "Inactive", value: "INACTIVE" },
    ],
  },
  {
    id: "elections",
    title: "Elections Summary",
    description: "Export election metadata including schedule, status, and turnout counts.",
    allowedRoles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN],
    placeholder: "Search elections by title…",
    filterOptions: [
      { label: "Voting Open", value: "VOTING_OPEN" },
      { label: "Published Results", value: "PUBLISHED_RESULTS" },
      { label: "Archived", value: "ARCHIVED" },
    ],
  },
  {
    id: "election-results",
    title: "Published Election Results",
    description:
      "Export candidate vote tallies, winners, and turnout for all published elections.",
    allowedRoles: [Roles.SUPER_ADMIN, Roles.DEPARTMENT_ADMIN],
    placeholder: "Filter by election title…",
    filterOptions: [
      { label: "Published Results", value: "PUBLISHED_RESULTS" },
      { label: "Archived", value: "ARCHIVED" },
    ],
  },
  {
    id: "audit",
    title: "System Audit Logs",
    description: "Comprehensive security export of recent system activities and logins.",
    allowedRoles: [Roles.SUPER_ADMIN],
  },
];

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { role } = session.user;

  if (role === Roles.STUDENT) {
    redirect("/dashboard");
  }

  const availableReports = reports.filter((r) => r.allowedRoles.includes(role));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="System Reports"
        description="Generate and export administrative reports with optional search and status filters."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {availableReports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      {availableReports.length === 0 && (
        <p className="text-muted-foreground">You do not have permission to view any reports.</p>
      )}
    </div>
  );
}
