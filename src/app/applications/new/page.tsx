import { createApplication } from "@/app/actions/applications";
import { AppShell } from "@/components/AppShell";
import { ApplicationForm } from "@/components/ApplicationForm";

export const metadata = { title: "New application · AppTrack" };

export default function NewApplicationPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Add application</h1>
        <ApplicationForm action={createApplication} submitLabel="Add application" />
      </div>
    </AppShell>
  );
}
