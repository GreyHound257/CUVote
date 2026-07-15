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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Make sure this import path matches where you saved the component!
import { SearchableStudentInput } from "@/components/layout/SearchableStudentInput"; 

interface Election {
  id: string;
  title: string;
  departmentId: string;
  positions: { id: string; title: string }[];
}

export function CandidateNominationDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // We only need to store elections now; students are handled by the combobox
  const [elections, setElections] = useState<Election[]>([]);

  const [electionId, setElectionId] = useState<string | null>(null);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [slogan, setSlogan] = useState("");
  const [visionStatement, setVisionStatement] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === electionId) ?? null,
    [elections, electionId]
  );

  const selectedPosition = useMemo(
    () => selectedElection?.positions.find((p) => p.id === positionId) ?? null,
    [selectedElection, positionId]
  );

  // Fetch only elections on mount
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingData(true);

    fetch("/api/elections")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Failed to load elections");
        return json;
      })
      .then((electionsRes) => {
        if (cancelled) return;

        // Extract the array whether it's directly in .data or nested in .data.data
        const rawElections = electionsRes.data?.data || electionsRes.data;
        const electionList: Election[] = Array.isArray(rawElections) ? rawElections : [];
        setElections(electionList);

        if (electionList.length === 0) {
          toast.message("No elections found. Create an election first.");
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

  // Clear student selection if the election (and therefore department) changes
  useEffect(() => {
    setStudentId(null);
  }, [electionId]);

  const resetForm = () => {
    setElectionId(null);
    setPositionId(null);
    setStudentId(null);
    setSlogan("");
    setVisionStatement("");
    setManifesto("");
    setPhotoUrl("");
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
        body: JSON.stringify({
          electionId,
          positionId,
          studentId,
          slogan: slogan.trim() || undefined,
          visionStatement: visionStatement.trim() || undefined,
          manifesto: manifesto.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
        }),
      });
      const json = await res.json();

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
      <DialogTrigger
        render={
          <Button className="rounded-full">
            <UserPlus className="mr-2 h-4 w-4" /> Nominate Candidate
          </Button>
        }
      />

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nominate Candidate</DialogTitle>
          <DialogDescription>
            Assign a student to a position. You can add slogan, vision, and manifesto now or later on their profile.
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading elections...
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

            {/* This replaces the old native <Select> logic */}
            <div className="space-y-2">
              <Label>Student</Label>
              <SearchableStudentInput
                value={studentId}
                onChange={setStudentId}
                departmentId={selectedElection?.departmentId}
                disabled={!electionId}
              />
              {electionId && (
                <p className="text-xs text-muted-foreground">
                  Searching students in the election&apos;s department
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Campaign slogan (optional)</Label>
              <Input
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Short slogan"
                className="rounded-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Vision statement (optional)</Label>
              <Textarea
                value={visionStatement}
                onChange={(e) => setVisionStatement(e.target.value)}
                placeholder="Candidate vision"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Manifesto (optional)</Label>
              <Textarea
                value={manifesto}
                onChange={(e) => setManifesto(e.target.value)}
                placeholder="Campaign manifesto"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Photo URL (optional)</Label>
              <Input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-full"
              />
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