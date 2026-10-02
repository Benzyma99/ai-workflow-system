import { randomUUID } from "crypto";

import { inngest } from "@/inngest/client";

import { createExecution } from "@/lib/workflow-executions";

export async function POST(request: Request) {
  try {
    const workflow = await request.json();

    const executionId = randomUUID();

    createExecution(executionId);

    const result = await inngest.send({
      name: "workflow/execute",
      data: {
        ...workflow,
        executionId,
      },
    });

    return Response.json({
      success: true,
      executionId,
      eventId: result.ids[0],
    });
  } catch (error) {
    console.error(
      "Failed to start workflow:",
      error,
    );

    return Response.json(
      {
        success: false,
        error: "Failed to start workflow.",
      },
      { status: 500 },
    );
  }
}