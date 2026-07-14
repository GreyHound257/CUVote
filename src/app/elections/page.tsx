"use client";

import { useEffect, useState, useCallback } from "react";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { LinkButton } from "@/components/ui/link-button";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DataTableToolbar } from "@/components/shared/DataTableToolbar";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Vote, Play, Square, Send, BarChart3, Eye, Archive } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { Roles } from "@/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Election {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  department: { name: string; code: string };
  academicSession?: { id: string; name: string; isCurrent: boolean } | null;
  positions: { id: string; title: string }[];
  _count: { candidates: number; voteRecords: number };
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  SCHEDULED: "outline",
  PUBLISHED: "default",
  VOTING_OPEN: "default",
  VOTING_CLOSED: "secondary",
  RESULTS_GENERATED: "secondary",
  PUBLISHED_RESULTS: "default",
  ARCHIVED: "outline",
};

const LIVE_RESULTS_STATUSES = ["VOTING_OPEN"];
const CLOSED_RESULTS_STATUSES = [
  "VOTING_CLOSED",
  "RESULTS_GENERATED",
  "PUBLISHED_RESULTS",
  "ARCHIVED",
];

export default function ElectionsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveResultsEnabled, setLiveResultsEnabled] = useState(true);
  
  // Pagination and filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const canOpenResults = (status: string) => {
    if (role === Roles.SUPER_ADMIN) {
      if (LIVE_RESULTS_STATUSES.includes(status)) {
        return liveResultsEnabled;
      }
      return CLOSED_RESULTS_STATUSES.includes(status);
    }
    if (role === Roles.DEPARTMENT_ADMIN) {
      return CLOSED_RESULTS_STATUSES.includes(status);
    }
    return status === "PUBLISHED_RESULTS" || status === "ARCHIVED";
  };

  const resultsHref = (id: string) => {
    if (role === Roles.STUDENT) return `/elections/${id}/results`;
    return `/elections/${id}/results/admin`;
  };

  const resultsLabel = (status: string) => {
    if (role === Roles.SUPER_ADMIN && LIVE_RESULTS_STATUSES.includes(status)) {
      return "Live Results";
    }
    return "Results";
  };

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (status !== "all") params.append("status", status);

      const res = await fetch(`/api/elections?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setElections(json.data.data);
        setTotalPages(json.data.meta.totalPages);
      } else {
        const errorMsg = json.error || "Failed to load elections";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load elections";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    if (role === Roles.SUPER_ADMIN || role === Roles.DEPARTMENT_ADMIN) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setLiveResultsEnabled(!!json.data.liveResultsEnabled);
        })
        .catch(() => {
          /* default remains true */
        });
    }
  }, [role]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/elections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Election status updated to ${status.replace(/_/g, " ")}`);
        fetchElections();
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update election status");
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Elections Management"
        description="Create and manage department elections."
        action={
          <LinkButton href="/elections/new" className="rounded-full">
            Create Election
          </LinkButton>
        }
      />

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or description..."
      >
        <Select value={status} onValueChange={(val) => {
          setStatus(val || "all");
          setPage(1);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Elections</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="ACTIVE">Active (Voting Open)</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </DataTableToolbar>

      {error ? (
        <ErrorState
          title="Failed to load elections"
          message={error}
          onRetry={fetchElections}
        />
      ) : loading ? (
        <LoadingState message="Loading elections..." />
      ) : elections.length === 0 ? (
        <EmptyState
          icon={<Vote className="h-10 w-10 text-muted-foreground/50" />}
          title="No Elections Found"
          description="You haven't created any elections yet. Get started by creating your first election."
          action={
            <LinkButton href="/elections/new" className="rounded-full">
              Create Election
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Candidates</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elections.map((election) => (
                  <TableRow key={election.id}>
                    <TableCell className="font-medium">{election.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {election.academicSession?.name ?? "—"}
                    </TableCell>
                    <TableCell>{election.department.code}</TableCell>
                    <TableCell>
                      <Badge variant={(statusColors[election.status] as any) || "secondary"}>
                        {election.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{election.positions.length}</TableCell>
                    <TableCell>{election._count.candidates}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {election.startTime
                        ? format(new Date(election.startTime), "MMM d, yyyy HH:mm")
                        : "—"}
                      {election.endTime && (
                        <> → {format(new Date(election.endTime), "MMM d, yyyy HH:mm")}</>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <LinkButton
                          href={`/elections/${election.id}/preview`}
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                        >
                          <Eye className="mr-1 h-3 w-3" /> Preview
                        </LinkButton>
                        {election.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(election.id, "PUBLISHED")}
                          >
                            <Send className="mr-1 h-3 w-3" /> Publish
                          </Button>
                        )}
                        {["PUBLISHED", "SCHEDULED"].includes(election.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(election.id, "VOTING_OPEN")}
                          >
                            <Play className="mr-1 h-3 w-3" /> Open Voting
                          </Button>
                        )}
                        {election.status === "VOTING_OPEN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(election.id, "VOTING_CLOSED")}
                          >
                            <Square className="mr-1 h-3 w-3" /> Close
                          </Button>
                        )}
                        {["PUBLISHED_RESULTS", "RESULTS_GENERATED"].includes(election.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(election.id, "ARCHIVED")}
                          >
                            <Archive className="mr-1 h-3 w-3" /> Archive
                          </Button>
                        )}
                        {canOpenResults(election.status) && (
                          <LinkButton
                            href={resultsHref(election.id)}
                            size="sm"
                            variant={
                              role === Roles.SUPER_ADMIN &&
                              LIVE_RESULTS_STATUSES.includes(election.status)
                                ? "default"
                                : "outline"
                            }
                            className="rounded-full"
                          >
                            <BarChart3 className="mr-1 h-3 w-3" />
                            {resultsLabel(election.status)}
                          </LinkButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </AppPage>
  );
}
