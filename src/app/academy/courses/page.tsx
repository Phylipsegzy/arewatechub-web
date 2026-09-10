import { SiteHeader } from "@/components/SiteHeader";

export default function CoursesPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="p-8">
      <h1 className="text-2xl font-bold text-brand-primary mb-2">Self-Paced Courses</h1>
      <p className="text-brand-muted mb-6">
        Buy anytime, learn at your own pace. (Phase 3 — coming next.)
      </p>
      <div className="rounded-lg border p-6 bg-white text-brand-muted">Course catalog goes here.</div>
      </div>
    </main>
  );
}
