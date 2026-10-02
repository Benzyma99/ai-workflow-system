import { getExecution } from "@/lib/workflow-executions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;

  const execution = getExecution(id);

  if (!execution) {
    return Response.json(
      {
        error: "Execution not found.",
      },
      { status: 404 },
    );
  }

  return Response.json(execution);
}