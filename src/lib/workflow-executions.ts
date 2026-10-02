export type ExecutionDecision = "YES" | "NO";

export type ExecutionStep = {
  nodeId: string;
  prompt: string;
  decision: ExecutionDecision;
};

export type WorkflowExecution = {
  id: string;
  status: "running" | "completed" | "failed";
  execution: ExecutionStep[];
  error?: string;
};

const executions = new Map<string, WorkflowExecution>();

export function createExecution(id: string) {
  const execution: WorkflowExecution = {
    id,
    status: "running",
    execution: [],
  };

  executions.set(id, execution);

  return execution;
}

export function updateExecution(
  id: string,
  update: Partial<WorkflowExecution>,
) {
  const current = executions.get(id);

  if (!current) {
    return;
  }

  executions.set(id, {
    ...current,
    ...update,
  });
}

export function getExecution(id: string) {
  return executions.get(id);
}