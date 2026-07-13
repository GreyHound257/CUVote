import { ApprovalQueue } from "@/components/candidates/ApprovalQueue";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { LinkButton } from "@/components/ui/link-button";
import { Routes } from "@/constants";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approval Queue | CUVote",
  description: "Approve or reject candidates",
};

export default function ApprovalQueuePage() {
  return (
    <AppPage>
      <PageHeader
        title="Candidate Approvals"
        description="Review pending nominations. Approve candidates before voting opens."
        action={
          <LinkButton href={Routes.CANDIDATES} variant="outline" className="rounded-full">
            All Candidates
          </LinkButton>
        }
      />
      <ApprovalQueue />
    </AppPage>
  );
}
