"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TurnNode } from "./storage";

/**
 * The parent → child arrows between turn cards.
 *
 * Extracted from the board page so the published reader draws the *same*
 * arrows rather than none — same reason `layoutRows` and `isAlternate` moved to
 * `board.ts`. A reader that omits them is not a simpler view of the plan, it is
 * a view that loses which card follows which.
 *
 * They are measured, not computed: cards size themselves to their content, so
 * there is no layout maths that would stay true. The measurement runs after
 * paint and again on resize, and because every card is a fixed-height grid
 * child the result is stable.
 */

export interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** An alternate of the same turn — drawn amber and dashed, as the hero is. */
  branch: boolean;
}

export function useTurnEdges(
  nodes: TurnNode[],
  /**
   * Anything else that changes card heights and so moves the arrows. The
   * editor passes its expanded-notes set: a note opening makes its card taller
   * and every edge touching it stale. Compared by identity, like a dep.
   */
  layoutKey?: unknown,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const [edges, setEdges] = useState<Edge[]>([]);

  const setCardRef = (id: string) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const origin = wrap.getBoundingClientRect();
      const rect = (id: string) =>
        cardRefs.current.get(id)?.getBoundingClientRect();
      const found: Edge[] = [];
      // The first child listed is the main line; any later sibling is a branch.
      const firstChild = new Map<string, string>();
      for (const n of nodes) {
        if (n.parentId && !firstChild.has(n.parentId))
          firstChild.set(n.parentId, n.id);
      }
      for (const n of nodes) {
        if (!n.parentId) continue;
        const from = rect(n.parentId);
        const to = rect(n.id);
        if (!from || !to) continue;
        found.push({
          x1: from.right - origin.left,
          y1: from.top - origin.top + from.height / 2,
          x2: to.left - origin.left,
          y2: to.top - origin.top + to.height / 2,
          branch: firstChild.get(n.parentId) !== n.id,
        });
      }
      setEdges(found);
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [nodes, layoutKey]);

  return { wrapRef, setCardRef, edges };
}

/**
 * The SVG layer. Absolutely positioned, so its parent needs `relative`.
 *
 * Marker ids are per-instance: the reader renders one board per opponent, and
 * duplicate ids in one document are invalid even where browsers forgive them.
 */
export function EdgeLayer({ edges }: { edges: Edge[] }) {
  const uid = useId().replace(/:/g, "");
  const main = `arrow-main-${uid}`;
  const branch = `arrow-branch-${uid}`;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <marker
          id={main}
          markerWidth="8"
          markerHeight="8"
          refX="6.5"
          refY="4"
          orient="auto"
        >
          <path d="M1 1 L7 4 L1 7 Z" fill="#b3ada4" />
        </marker>
        <marker
          id={branch}
          markerWidth="8"
          markerHeight="8"
          refX="6.5"
          refY="4"
          orient="auto"
        >
          <path d="M1 1 L7 4 L1 7 Z" fill="#d97706" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const dx = Math.max(24, (e.x2 - e.x1) * 0.5);
        const color = e.branch ? "#d97706" : "#b3ada4";
        return (
          <g key={i}>
            <circle cx={e.x1} cy={e.y1} r={3} fill={color} />
            <path
              d={`M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2 - 7} ${e.y2}`}
              fill="none"
              stroke={color}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeDasharray={e.branch ? "5 4" : undefined}
              markerEnd={`url(#${e.branch ? branch : main})`}
            />
          </g>
        );
      })}
    </svg>
  );
}
