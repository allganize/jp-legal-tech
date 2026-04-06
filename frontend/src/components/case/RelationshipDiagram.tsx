"use client";

import { useState, useMemo } from "react";

export interface PartyNode {
  id: string;
  label: string;
  type: "plaintiff" | "defendant" | "third_party" | "organization";
}

export interface PartyRelationship {
  from: string;
  to: string;
  label: string;
  type: "contract" | "employment" | "claim" | "payment" | "guarantee" | "other";
  source_text?: string;
}

export interface RelationshipDiagramData {
  nodes: PartyNode[];
  edges: PartyRelationship[];
  summary: string;
  error?: string;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  plaintiff: { fill: "#ecfdf5", stroke: "#059669", text: "#065f46" },
  defendant: { fill: "#fef2f2", stroke: "#dc2626", text: "#991b1b" },
  third_party: { fill: "#f5f5f4", stroke: "#78716c", text: "#44403c" },
  organization: { fill: "#eff6ff", stroke: "#2563eb", text: "#1e40af" },
};

const EDGE_COLORS: Record<string, string> = {
  contract: "#059669",
  employment: "#2563eb",
  claim: "#dc2626",
  payment: "#d97706",
  guarantee: "#7c3aed",
  other: "#78716c",
};

const NODE_W = 140;
const NODE_H = 44;

function computePositions(count: number, width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const positions: { x: number; y: number }[] = [];

  if (count <= 1) {
    positions.push({ x: cx, y: cy });
  } else if (count === 2) {
    // Left-right layout
    positions.push({ x: cx - 120, y: cy });
    positions.push({ x: cx + 120, y: cy });
  } else if (count === 3) {
    // Triangle layout
    positions.push({ x: cx, y: cy - 60 });
    positions.push({ x: cx - 120, y: cy + 50 });
    positions.push({ x: cx + 120, y: cy + 50 });
  } else {
    // Circular layout for 4+
    const radius = Math.min(width, height) * 0.32;
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }
  }
  return positions;
}

function curvedPath(
  x1: number, y1: number, x2: number, y2: number, idx: number
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Slight curve offset
  const offset = 20 + (idx % 3) * 10;
  const nx = -dy / len * offset;
  const ny = dx / len * offset;
  return `M ${x1} ${y1} Q ${mx + nx} ${my + ny} ${x2} ${y2}`;
}

export default function RelationshipDiagram({ data }: { data: RelationshipDiagramData }) {
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);

  const svgW = 500;
  const svgH = Math.max(280, data.nodes.length > 4 ? 360 : 280);

  const nodeMap = useMemo(() => {
    const map = new Map<string, number>();
    data.nodes.forEach((n, i) => map.set(n.id, i));
    return map;
  }, [data.nodes]);

  const positions = useMemo(
    () => computePositions(data.nodes.length, svgW, svgH),
    [data.nodes.length, svgW, svgH]
  );

  if (!data.nodes.length) {
    return (
      <div className="text-center py-8 text-stone-400">
        当事者関係を抽出できませんでした。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.summary && (
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 border-l-4 border-l-emerald-400">
          <p className="text-sm text-emerald-900">{data.summary}</p>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full max-w-[500px] mx-auto"
          style={{ minHeight: 240 }}
        >
          {/* Edges */}
          {data.edges.map((edge, i) => {
            const fromIdx = nodeMap.get(edge.from);
            const toIdx = nodeMap.get(edge.to);
            if (fromIdx === undefined || toIdx === undefined) return null;
            const p1 = positions[fromIdx];
            const p2 = positions[toIdx];
            const color = EDGE_COLORS[edge.type] || EDGE_COLORS.other;
            const path = curvedPath(p1.x, p1.y, p2.x, p2.y, i);
            const isSelected = selectedEdge === i;

            // Midpoint for label
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const offset = 20 + (i % 3) * 10;
            const lx = mx + (-dy / len) * offset * 0.5;
            const ly = my + (dx / len) * offset * 0.5;

            return (
              <g key={`edge-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={edge.type === "claim" ? "6 3" : undefined}
                  opacity={isSelected ? 1 : 0.7}
                  className="cursor-pointer"
                  onClick={() => setSelectedEdge(isSelected ? null : i)}
                />
                {/* Edge label */}
                <rect
                  x={lx - edge.label.length * 5}
                  y={ly - 8}
                  width={edge.label.length * 10 + 8}
                  height={16}
                  rx={4}
                  fill="white"
                  stroke={color}
                  strokeWidth={0.5}
                  opacity={0.95}
                  className="cursor-pointer"
                  onClick={() => setSelectedEdge(isSelected ? null : i)}
                />
                <text
                  x={lx + 4}
                  y={ly + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill={color}
                  className="cursor-pointer pointer-events-none"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {data.nodes.map((node, i) => {
            const pos = positions[i];
            const colors = NODE_COLORS[node.type] || NODE_COLORS.third_party;
            return (
              <g key={node.id}>
                <rect
                  x={pos.x - NODE_W / 2}
                  y={pos.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={colors.text}
                >
                  {node.label.length > 14
                    ? node.label.slice(0, 14) + "…"
                    : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Source citation for selected edge */}
      {selectedEdge !== null && data.edges[selectedEdge]?.source_text && (
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-3">
          <p className="text-xs text-stone-400 mb-1">
            「{data.edges[selectedEdge].label}」の原文引用:
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            {data.edges[selectedEdge].source_text}
          </p>
        </div>
      )}
    </div>
  );
}
