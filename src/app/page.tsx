import WorkflowEditor from "@/components/workflow/WorkflowEditor";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold">
          AI Workflow System
        </h1>

        <p className="mb-6 text-muted-foreground">
          Build and run AI decision workflows visually.
        </p>

        <WorkflowEditor />
      </div>
    </main>
  );
}