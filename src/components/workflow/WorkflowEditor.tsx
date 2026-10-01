"use client";

import { useCallback, useEffect, useState } from "react";

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

export default function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<DecisionNodeType>(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>("1");

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

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
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
        y: 100 + Math.floor(nodes.length / 3) * 220,
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
  };

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div>
          <h2 className="font-semibold">
            Workflow Editor
          </h2>

          <p className="text-xs text-slate-500">
            Connect YES and NO paths between decision nodes.
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
            onClick={resetWorkflow}
            className="ml-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid min-h-[700px] grid-cols-[1fr_300px]">
        <div className="relative">
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
            Select a decision node and edit its prompt.
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
                The AI will eventually answer this prompt
                with YES or NO.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Select a node to edit it.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}