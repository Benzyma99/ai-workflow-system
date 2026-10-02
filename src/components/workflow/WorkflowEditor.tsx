"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import DecisionNode, {
  type DecisionNodeType,
} from "./DecisionNode";

const STORAGE_KEY = "ai-workflow";

const nodeTypes = {
  decision: DecisionNode,
};

const initialNodes: DecisionNodeType[] = [
  {
    id: "1",
    type: "decision",
    position: { x: 250, y: 180 },
    data: {
      prompt: "Is this a support request?",
    },
  },
];

const initialEdges: Edge[] = [];

type ExecutionStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed";

type ExecutionLogItem = {
  nodeId: string;
  prompt: string;
  decision: "YES" | "NO";
};

export default function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<DecisionNodeType>(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>("1");

  const [executionId, setExecutionId] =
    useState<string | null>(null);

  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>("idle");

  const [executionLog, setExecutionLog] =
    useState<ExecutionLogItem[]>([]);

  const [workflowMessage, setWorkflowMessage] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId,
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed.nodes)) {
        setNodes(parsed.nodes);
      }

      if (Array.isArray(parsed.edges)) {
        setEdges(parsed.edges);
      }
    } catch {
      console.warn(
        "Could not load saved workflow.",
      );
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nodes,
        edges,
      }),
    );
  }, [nodes, edges]);

  useEffect(() => {
    if (!executionId) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null =
      null;

    const checkExecution = async () => {
      try {
        const response = await fetch(
          `/api/workflow/execution/${executionId}`,
        );

        if (!response.ok) {
          throw new Error(
            "Could not retrieve workflow execution.",
          );
        }

        const result = await response.json();

        if (cancelled) {
          return;
        }

        setExecutionLog(result.execution ?? []);

        if (result.status === "completed") {
          setExecutionStatus("completed");
          return;
        }

        if (result.status === "failed") {
          setExecutionStatus("failed");
          return;
        }

        timeoutId = setTimeout(
          checkExecution,
          1000,
        );
      } catch (error) {
        console.error(
          "Failed to check workflow execution:",
          error,
        );

        if (!cancelled) {
          setExecutionStatus("failed");
        }
      }
    };

    checkExecution();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [executionId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target
      ) {
        return;
      }

      const label =
        connection.sourceHandle === "yes"
          ? "YES"
          : connection.sourceHandle === "no"
            ? "NO"
            : "";

      const newEdge: Edge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle}-${connection.target}`,
        label,
        animated: true,
      };

      setEdges((currentEdges) =>
        addEdge(newEdge, currentEdges),
      );
    },
    [setEdges],
  );

  const addDecisionNode = () => {
    const id = `node-${Date.now()}`;

    const newNode: DecisionNodeType = {
      id,
      type: "decision",
      position: {
        x: 100 + (nodes.length % 3) * 300,
        y:
          100 +
          Math.floor(nodes.length / 3) * 220,
      },
      data: {
        prompt: "Enter a decision question",
      },
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);

    setSelectedNodeId(id);
  };

  const updatePrompt = (prompt: string) => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                prompt,
              },
            }
          : node,
      ),
    );
  };

  const resetWorkflow = () => {
    localStorage.removeItem(STORAGE_KEY);

    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId("1");

    setExecutionId(null);
    setExecutionStatus("idle");
    setExecutionLog([]);
    setWorkflowMessage(null);
  };

  const exportWorkflow = () => {
    const workflow = {
      nodes,
      edges,
    };

    const blob = new Blob(
      [JSON.stringify(workflow, null, 2)],
      {
        type: "application/json",
      },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ai-workflow.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setWorkflowMessage(
      "Workflow exported successfully.",
    );
  };

  const importWorkflow = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (
        !Array.isArray(parsed.nodes) ||
        !Array.isArray(parsed.edges)
      ) {
        throw new Error(
          "Invalid workflow file.",
        );
      }

      const importedNodes =
        parsed.nodes as DecisionNodeType[];

      const importedEdges =
        parsed.edges as Edge[];

      setNodes(importedNodes);
      setEdges(importedEdges);

      setSelectedNodeId(
        importedNodes[0]?.id ?? null,
      );

      setExecutionId(null);
      setExecutionStatus("idle");
      setExecutionLog([]);

      setWorkflowMessage(
        "Workflow imported successfully.",
      );
    } catch (error) {
      console.error(
        "Failed to import workflow:",
        error,
      );

      setWorkflowMessage(
        "Could not import workflow. Please select a valid workflow JSON file.",
      );
    }

    event.target.value = "";
  };

  const runWorkflow = async () => {
    setExecutionStatus("running");
    setExecutionLog([]);
    setExecutionId(null);
    setWorkflowMessage(null);

    try {
      const response = await fetch(
        "/api/workflow/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nodes,
            edges,
            startNodeId: "1",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Failed to start workflow.",
        );
      }

      setExecutionId(result.executionId);
    } catch (error) {
      console.error(
        "Failed to start workflow:",
        error,
      );

      setExecutionStatus("failed");
      setWorkflowMessage(
        "Could not start workflow.",
      );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div>
          <h2 className="font-semibold">
            Workflow Editor
          </h2>

          <p className="text-xs text-slate-500">
            Connect YES and NO paths between
            decision nodes.
          </p>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={addDecisionNode}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Add Decision
          </button>

          <button
            type="button"
            onClick={exportWorkflow}
            className="ml-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Export JSON
          </button>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="ml-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Import JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importWorkflow}
            className="hidden"
          />

          <button
            type="button"
            onClick={runWorkflow}
            disabled={
              executionStatus === "running"
            }
            className="ml-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {executionStatus === "running"
              ? "Running..."
              : "Run Workflow"}
          </button>

          <button
            type="button"
            onClick={resetWorkflow}
            className="ml-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>

      {workflowMessage && (
        <div className="border-b bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {workflowMessage}
        </div>
      )}

      <div className="grid min-h-[700px] grid-cols-[1fr_300px]">
        <div className="relative min-h-[700px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
            }}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <aside className="border-l bg-slate-50 p-5">
          <h2 className="mb-1 text-lg font-semibold">
            Node Settings
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Select a decision node and edit its
            prompt.
          </p>

          {selectedNode ? (
            <div>
              <label
                htmlFor="prompt"
                className="mb-2 block text-sm font-medium"
              >
                Decision prompt
              </label>

              <textarea
                id="prompt"
                value={selectedNode.data.prompt}
                onChange={(event) =>
                  updatePrompt(event.target.value)
                }
                className="min-h-[140px] w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Enter a question for the AI..."
              />

              <p className="mt-3 text-xs text-slate-500">
                The AI will eventually answer this
                prompt with YES or NO.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Select a node to edit it.
            </p>
          )}

          <div className="mt-8 border-t pt-6">
            <h3 className="mb-3 text-sm font-semibold">
              Execution Log
            </h3>

            {executionStatus === "idle" && (
              <p className="text-xs text-slate-500">
                Run the workflow to see AI
                decisions.
              </p>
            )}

            {executionStatus === "running" && (
              <p className="text-xs text-blue-600">
                Workflow is running...
              </p>
            )}

            {executionStatus === "failed" && (
              <p className="text-xs text-red-600">
                Workflow execution failed.
              </p>
            )}

            {executionStatus === "completed" && (
              <p className="mb-3 text-xs font-medium text-green-600">
                Workflow completed.
              </p>
            )}

            {executionLog.length > 0 && (
              <div className="space-y-3">
                {executionLog.map(
                  (item, index) => (
                    <div
                      key={`${item.nodeId}-${index}`}
                      className="rounded-lg border bg-white p-3"
                    >
                      <div className="text-xs font-semibold text-slate-500">
                        Step {index + 1}
                      </div>

                      <div className="mt-1 text-sm font-medium">
                        {item.prompt}
                      </div>

                      <div
                        className={`mt-2 text-xs font-bold ${
                          item.decision === "YES"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        Decision:{" "}
                        {item.decision}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}