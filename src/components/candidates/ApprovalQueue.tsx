"use client";

import { CandidateListBoard } from "./CandidateListBoard";

export function ApprovalQueue() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Approval Queue</h2>
        <p className="text-muted-foreground">
          Review candidates pending approval.
        </p>
      </div>
      <CandidateListBoard showApprovalQueue={true} />
    </div>
  );
}
