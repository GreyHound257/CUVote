"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Student } from "@prisma/client";

interface StudentDetailsDialogProps {
  student: (Student & { department: { name: string, code: string } }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function StudentDetailsDialog({ student, open, onOpenChange, onUpdate }: StudentDetailsDialogProps) {
  const [loading, setLoading] = useState(false);

  const toggleEligibility = async (checked: boolean) => {
    if (!student) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEligible: checked }),
      });
      if (res.ok) {
        toast.success(`Student is now ${checked ? "Eligible" : "Ineligible"}`);
        onUpdate();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to update eligibility");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Student Profile Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Full Name:</span>
              <span className="col-span-2">{student.fullName}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Matric No:</span>
              <span className="col-span-2">{student.matricNo}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Email:</span>
              <span className="col-span-2">{student.email}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Department:</span>
              <span className="col-span-2">{student.department.name} ({student.department.code})</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Level:</span>
              <span className="col-span-2">{student.level}</span>
            </div>
             <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Status:</span>
              <span className="col-span-2">
                 <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>
                    {student.status}
                </Badge>
              </span>
            </div>
             <div className="grid grid-cols-3 items-center gap-4 border-t pt-4">
              <span className="font-semibold">Voting Eligibility:</span>
              <div className="col-span-2 flex items-center gap-2">
                 <Switch
                   checked={student.isEligible}
                   onCheckedChange={toggleEligibility}
                   disabled={loading}
                 />
                 <span className={student.isEligible ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                     {student.isEligible ? "Eligible" : "Ineligible"}
                 </span>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
