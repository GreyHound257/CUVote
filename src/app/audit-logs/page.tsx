"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";


import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Roles } from "@/constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // Debounce outcome/action filter changes (we trigger re-fetch when they change, no need for extra debounce on select usually, but we reset page)
  useEffect(() => {
    setPage(1);
  }, [actionFilter, outcomeFilter]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "20");
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (actionFilter && actionFilter !== "all") params.append("action", actionFilter);
      if (outcomeFilter && outcomeFilter !== "all") params.append("outcome", outcomeFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error("Forbidden: Admins only.");
        throw new Error("Failed to load audit logs");
      }

      const json = await res.json();
      setLogs(json.data.data);
      setTotalPages(json.data.pagination.totalPages);
    }catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, actionFilter, outcomeFilter]);

  useEffect(() => {
    if (session?.user?.role !== Roles.STUDENT) {
        fetchLogs();
    }
  }, [fetchLogs, session]);

  if (!session) return null;

  if (session.user.role === Roles.STUDENT) {
    return <div className="p-8 text-center text-destructive">Forbidden. Admins only.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-heading">Audit Logs</h1>
        <p className="text-muted-foreground">View system activity and security events.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <Input
          placeholder="Search details or action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-1/3"
        />

        <Select value={outcomeFilter} onValueChange={(val) => setOutcomeFilter(val || "all")}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILURE">Failure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="p-4 text-destructive border-l-4 border-destructive bg-destructive/10">{error}</div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}><LoadingState message="Loading audit logs..." /></TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found.</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.user ? `${log.user.name} (${log.user.email})` : "System/Unknown"}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate" title={log.details || ""}>{log.details}</TableCell>
                    <TableCell>
                      <Badge variant={log.outcome === "SUCCESS" ? "default" : log.outcome === "FAILURE" ? "destructive" : "secondary"}>
                        {log.outcome || "N/A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm text-muted-foreground px-4">Page {page} of {totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
