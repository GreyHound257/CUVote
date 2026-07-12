import { CandidateListBoard } from "@/components/candidates/CandidateListBoard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidates | CUVote",
  description: "Manage election candidates",
};

export default function CandidatesPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
      </div>
      <CandidateListBoard />
    </div>
  );
}
