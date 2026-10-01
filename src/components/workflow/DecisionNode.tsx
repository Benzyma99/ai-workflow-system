"use client";

import {
  Handle,
  Position,
  type NodeProps,
  type Node,
} from "@xyflow/react";

export type DecisionNodeData = {
  prompt: string;
};

export type DecisionNodeType = Node<
  DecisionNodeData,
  "decision"
>;

export default function DecisionNode({
  data,
}: NodeProps<DecisionNodeType>) {
  return (
    <div className="relative min-w-[240px] rounded-xl border-2 border-slate-800 bg-white p-4 shadow-sm">
      <Handle
        type="target"
        position={Position.Top}
      />

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        AI Decision
      </div>

      <div className="text-sm font-medium text-slate-900">
        {data.prompt}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        style={{ top: "35%" }}
      />

      <span className="absolute -right-10 top-[25%] text-xs font-semibold text-green-600">
        YES
      </span>

      <Handle
        type="source"
        position={Position.Right}
        id="no"
        style={{ top: "65%" }}
      />

      <span className="absolute -right-10 top-[55%] text-xs font-semibold text-red-600">
        NO
      </span>
    </div>
  );
}