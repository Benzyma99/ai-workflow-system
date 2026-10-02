import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  try {
    const workflow = await request.json();

    const result = await inngest.send({
      name: "workflow/execute",
      data: workflow,
    });

    return Response.json({
      success: true,
      eventId: result.ids[0],
    });
  } catch (error) {
    console.error("Failed to start workflow:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to start workflow.",
      },
      { status: 500 },
    );
  }
}