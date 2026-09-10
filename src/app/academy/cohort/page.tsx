import { SiteHeader } from "@/components/SiteHeader";

export default function CohortPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="p-8">
      <h1 className="text-2xl font-bold text-brand-primary mb-2">Digital Academy Cohort Programme</h1>
      <p className="text-brand-muted mb-6">
        Apply, get accepted, and join a scheduled batch with live classes. (Phase 4 — coming next.)
      </p>
      <div className="rounded-lg border p-6 bg-white text-brand-muted">Cohort application UI goes here.</div>
      </div>
    </main>
  );
}
