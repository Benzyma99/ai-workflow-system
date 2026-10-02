import OpenAI from "openai";

import { inngest } from "./client";

import {
  createExecution,
  updateExecution,
} from "@/lib/workflow-executions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type WorkflowNode = {
  id: string;
  type?: string;
  data: {
    prompt: string;
  };
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  label?: string;
};

type WorkflowEventData = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  startNodeId: string;
  executionId?: string;
};

type Decision = "YES" | "NO";

async function getDecision(
  prompt: string,
): Promise<Decision> {
  const mockMode =
    process.env.AI_MOCK_MODE === "true";

  if (mockMode) {
    const mockDecision = (
      process.env.MOCK_AI_DECISION ?? "YES"
    ).toUpperCase();

    if (
      mockDecision !== "YES" &&
      mockDecision !== "NO"
    ) {
      throw new Error(
        `Invalid MOCK_AI_DECISION: ${mockDecision}. Use YES or NO.`,
      );
    }

    console.log(
      `Mock AI decision for "${prompt}": ${mockDecision}`,
    );

    return mockDecision as Decision;
  }

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You are a workflow decision engine. Answer the user's question with exactly one word: YES or NO. Do not provide explanations.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const answer = response.output_text
    .trim()
    .toUpperCase();

  if (answer !== "YES" && answer !== "NO") {
    throw new Error(
      `AI returned an invalid decision: "${answer}". Expected YES or NO.`,
    );
  }

  return answer as Decision;
}

export const testFunction = inngest.createFunction(
  {
    id: "test-workflow",
    triggers: {
      event: "workflow/test",
    },
  },
  async ({ event, step }) => {
    return await step.run("hello", async () => {
      return {
        message: "Inngest is working",
        received: event.data,
      };
    });
  },
);

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-ai-workflow",
    triggers: {
      event: "workflow/execute",
    },
  },
  async ({ event, step }) => {
    const data = event.data as WorkflowEventData;

    const executionId = data.executionId;

    if (!executionId) {
      throw new Error(
        "Missing executionId in workflow event.",
      );
    }

    createExecution(executionId);

    const execution: Array<{
      nodeId: string;
      prompt: string;
      decision: Decision;
    }> = [];

    let currentNodeId: string | null =
      data.startNodeId;

    while (currentNodeId) {
      const node = data.nodes.find(
        (item) => item.id === currentNodeId,
      );

      if (!node) {
        throw new Error(
          `Workflow node "${currentNodeId}" was not found.`,
        );
      }

      const decision = await step.run(
        `decision-${node.id}`,
        async () => {
          return await getDecision(
            node.data.prompt,
          );
        },
      );

      execution.push({
        nodeId: node.id,
        prompt: node.data.prompt,
        decision,
      });

      updateExecution(executionId, {
        execution: [...execution],
      });

      const nextEdge = data.edges.find((edge) => {
        if (edge.source !== node.id) {
          return false;
        }

        if (edge.label) {
          return (
            edge.label.toUpperCase() === decision
          );
        }

        return (
          edge.sourceHandle?.toUpperCase() ===
          decision
        );
      });

      currentNodeId = nextEdge?.target ?? null;
    }

    updateExecution(executionId, {
      status: "completed",
      execution,
    });

    return {
      status: "completed",
      execution,
    };
  },
);