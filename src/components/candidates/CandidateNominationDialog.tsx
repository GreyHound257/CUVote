"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Election {
  id: string;
  title: string;
  departmentId: string;
  positions: { id: string; title: string }[];
}

interface Student {
  id: string;
  fullName: string;
  matricNo: string;
  departmentId: string;
}

export function CandidateNominationDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [electionId, setElectionId] = useState<string | null>(null);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === electionId) ?? null,
    [elections, electionId]
  );

  const eligibleStudents = useMemo(() => {
    if (!selectedElection) return students;
    return students.filter((s) => s.departmentId === selectedElection.departmentId);
  }, [students, selectedElection]);

  const selectedStudent = useMemo(
    () => eligibleStudents.find((s) => s.id === studentId) ?? null,
    [eligibleStudents, studentId]
  );

  const selectedPosition = useMemo(
    () => selectedElection?.positions.find((p) => p.id === positionId) ?? null,
    [selectedElection, positionId]
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingData(true);

    Promise.all([
      fetch("/api/elections").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Failed to load elections");
        return json;
      }),
      fetch("/api/students?limit=200").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Failed to load students");
        return json;
      }),
    ])
      .then(([electionsRes, studentsRes]) => {
        if (cancelled) return;

        const electionList: Election[] = Array.isArray(electionsRes.data)
          ? electionsRes.data
          : [];
        setElections(electionList);

        const studentList: Student[] = Array.isArray(studentsRes.data)
          ? studentsRes.data
          : [];
        setStudents(studentList);

        if (electionList.length === 0) {
          toast.message("No elections found. Create an election first.");
        }
        if (studentList.length === 0) {
          toast.message("No students found. Import or create students first.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load nomination data");
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    // Clear student if they don't belong to the newly selected election's department
    if (studentId && selectedElection) {
      const stillEligible = students.some(
        (s) => s.id === studentId && s.departmentId === selectedElection.departmentId
      );
      if (!stillEligible) setStudentId(null);
    }
  }, [selectedElection, studentId, students]);

  const resetForm = () => {
    setElectionId(null);
    setPositionId(null);
    setStudentId(null);
  };

  const handleSubmit = async () => {
    if (!electionId || !positionId || !studentId) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId, positionId, studentId }),
      });
      const json = await res.json();

      // API returns { success: true, data } or a candidate with id
      if (res.ok && (json.success || json.id || json.data?.id)) {
        toast.success("Candidate nominated successfully");
        setOpen(false);
        resetForm();
        onSuccess();
      } else {
        toast.error(json.error || "Failed to nominate candidate");
      }
    } catch {
      toast.error("An error occurred while nominating candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger render={<Button className="rounded-full" />}>
        <UserPlus className="mr-2 h-4 w-4" /> Nominate Candidate
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nominate Candidate</DialogTitle>
          <DialogDescription>
            Assign a student to contest a position in an election.
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading elections and students...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Election</Label>
              <Select
                value={electionId}
                onValueChange={(val) => {
                  setElectionId(val);
                  setPositionId(null);
                }}
              >
                <SelectTrigger className="w-full rounded-full">
                  <SelectValue placeholder="Select election">
                    {selectedElection?.title}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {elections.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No elections available</div>
                  ) : (
                    elections.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={positionId}
                onValueChange={setPositionId}
                disabled={!electionId}
              >
                <SelectTrigger className="w-full rounded-full">
                  <SelectValue placeholder={electionId ? "Select position" : "Select an election first"}>
                    {selectedPosition?.title}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {(selectedElection?.positions ?? []).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No positions for this election</div>
                  ) : (
                    selectedElection!.positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={studentId}
                onValueChange={setStudentId}
                disabled={!electionId}
              >
                <SelectTrigger className="w-full rounded-full">
                  <SelectValue
                    placeholder={
                      !electionId
                        ? "Select an election first"
                        : eligibleStudents.length === 0
                          ? "No eligible students"
                          : "Select student"
                    }
                  >
                    {selectedStudent
                      ? `${selectedStudent.fullName} (${selectedStudent.matricNo})`
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {eligibleStudents.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {electionId
                        ? "No students in this election's department"
                        : "Select an election first"}
                    </div>
                  ) : (
                    eligibleStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} ({s.matricNo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {electionId && (
                <p className="text-xs text-muted-foreground">
                  Showing {eligibleStudents.length} student(s) from the election&apos;s department
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingData || !electionId || !positionId || !studentId}
            className="rounded-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Nominating...
              </>
            ) : (
              "Nominate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
