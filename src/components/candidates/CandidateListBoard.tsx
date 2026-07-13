"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

import { logger } from "@/utils/logger";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CandidateStatus } from "@prisma/client";

export function CandidateListBoard({ showApprovalQueue = false }: { showApprovalQueue?: boolean }) {
  interface CandidateInfo {
    id: string;
    photoUrl?: string;
    status: CandidateStatus;
    student: { fullName: string; matricNo?: string };
    election: { title: string };
    position: { title: string };
  }
  const [candidates, setCandidates] = useState<CandidateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(showApprovalQueue ? "PENDING_REVIEW" : "ALL");
  const [search, setSearch] = useState("");

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    let url = `/api/candidates?search=${encodeURIComponent(search)}`;
    if (statusFilter !== "ALL") {
      url += `&status=${statusFilter}`;
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setCandidates(data.data || []);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandidates();
  }, [statusFilter, search, fetchCandidates]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCandidates();
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {!showApprovalQueue && (
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.keys(CandidateStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Election</TableHead>
              <TableHead>Status</TableHead>
              {showApprovalQueue && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}><LoadingState message="Loading candidates..." /></TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}><EmptyState title="No candidates found" description="There are no candidates matching your criteria." /></TableCell>
              </TableRow>
            ) : (
              candidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Avatar>
                      {c.photoUrl && <Image src={c.photoUrl} alt={c.student?.fullName || "Candidate"} fill className="rounded-full object-cover" sizes="40px" />}
                      <AvatarFallback>{c.student?.fullName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{c.student?.fullName}</TableCell>
                  <TableCell>{c.position?.title}</TableCell>
                  <TableCell>{c.election?.title}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "APPROVED" ? "default" : "secondary"}>
                      {c.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  {showApprovalQueue && (
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(c.id, "APPROVED")}
                          className="text-sm bg-green-500 text-white px-2 py-1 rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(c.id, "REJECTED")}
                          className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
