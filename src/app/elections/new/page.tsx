import { ElectionForm } from "@/components/elections/ElectionForm";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewElectionPage() {
  return (
    <AppPage maxWidth="4xl">
      <PageHeader
        title="Create Election"
        description="Set up a new election with positions for your department."
      />
      <ElectionForm />
    </AppPage>
  );
}
