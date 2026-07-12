import { ApprovalQueue } from "@/components/candidates/ApprovalQueue";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approval Queue | CUVote",
  description: "Approve or reject candidates",
};

export default function ApprovalQueuePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ApprovalQueue />
    </div>
  );
}
