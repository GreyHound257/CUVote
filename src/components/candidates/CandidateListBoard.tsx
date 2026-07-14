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
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update status");
        return;
      }
      toast.success(`Candidate ${newStatus.toLowerCase().replace("_", " ")}`);
      fetchCandidates();
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex gap-4">
        <Input
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm rounded-full focus-visible:ring-primary/20"
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

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Election</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profile</TableHead>
              {showApprovalQueue && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <LoadingState message="Loading candidates..." />
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="No candidates found"
                    description="There are no candidates matching your criteria."
                  />
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Avatar>
                      {c.photoUrl && (
                        <Image
                          src={c.photoUrl}
                          alt={c.student?.fullName || "Candidate"}
                          fill
                          className="rounded-full object-cover"
                          sizes="40px"
                        />
                      )}
                      <AvatarFallback>
                        {c.student?.fullName?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
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
                  <TableCell>
                    <LinkButton
                      href={`/candidates/${c.id}`}
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      View
                    </LinkButton>
                  </TableCell>
                  {showApprovalQueue && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-full bg-green-600 text-white hover:bg-green-700"
                          onClick={() => updateStatus(c.id, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full"
                          onClick={() => updateStatus(c.id, "REJECTED")}
                        >
                          Reject
                        </Button>
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
