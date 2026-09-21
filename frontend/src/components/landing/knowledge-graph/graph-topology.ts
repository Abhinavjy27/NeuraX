// Topology algorithms for Trinetra Knowledge Graph:
// - Real degree calculation
// - Multi-edge curvature assignment
// - BFS shortest path to root
// - Human-readable relationship formatting

import { KnowledgeNode, KnowledgeEdge, getNodeId, getEdgeKey } from './types';

export interface TopologyAnalysis {
  nodeDegrees: Map<string, number>;
  adjacency: Map<string, Set<string>>;
  edgeMap: Map<string, KnowledgeEdge[]>;
}

// Analyze graph topology: degrees and adjacency
export function analyzeTopology(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): TopologyAnalysis {
  const nodeDegrees = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const edgeMap = new Map<string, KnowledgeEdge[]>();

  nodes.forEach((n) => {
    nodeDegrees.set(n.id, 0);
    adjacency.set(n.id, new Set<string>());
  });

  edges.forEach((edge) => {
    const s = getNodeId(edge.source);
    const t = getNodeId(edge.target);

    if (s && t) {
      nodeDegrees.set(s, (nodeDegrees.get(s) || 0) + 1);
      nodeDegrees.set(t, (nodeDegrees.get(t) || 0) + 1);

      if (!adjacency.has(s)) adjacency.set(s, new Set());
      if (!adjacency.has(t)) adjacency.set(t, new Set());
      adjacency.get(s)!.add(t);
      adjacency.get(t)!.add(s);

      // Group edges between identical node pairs
      const pairKey = s < t ? `${s}::${t}` : `${t}::${s}`;
      if (!edgeMap.has(pairKey)) {
        edgeMap.set(pairKey, []);
      }
      edgeMap.get(pairKey)!.push(edge);
    }
  });

  return { nodeDegrees, adjacency, edgeMap };
}

// Assign curvature to multiple edges between same nodes to prevent rendering on top of each other
export function assignCurvature(edges: KnowledgeEdge[]): KnowledgeEdge[] {
  const pairGroups = new Map<string, KnowledgeEdge[]>();

  edges.forEach((edge) => {
    const s = getNodeId(edge.source);
    const t = getNodeId(edge.target);
    const pairKey = s < t ? `${s}::${t}` : `${t}::${s}`;
    if (!pairGroups.has(pairKey)) {
      pairGroups.set(pairKey, []);
    }
    pairGroups.get(pairKey)!.push(edge);
  });

  pairGroups.forEach((group) => {
    const count = group.length;
    if (count === 1) {
      group[0].curvature = 0;
    } else {
      const step = 0.22;
      group.forEach((edge, idx) => {
        // Calculate balanced symmetrical curvatures: e.g. -0.22, 0.22, -0.44, 0.44
        const s = getNodeId(edge.source);
        const t = getNodeId(edge.target);
        const isCanonicalOrder = s < t;
        
        let curve = 0;
        if (count === 2) {
          curve = idx === 0 ? 0.2 : -0.2;
        } else {
          const mid = (count - 1) / 2;
          curve = (idx - mid) * step;
        }

        // Adjust sign if direction is flipped
        edge.curvature = isCanonicalOrder ? curve : -curve;
      });
    }
  });

  return edges;
}

// Find shortest path from root node to target node using BFS
export function findShortestPathToRoot(
  rootId: string,
  targetId: string,
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): { pathNodeIds: Set<string>; pathEdgeKeys: Set<string> } {
  const pathNodeIds = new Set<string>();
  const pathEdgeKeys = new Set<string>();

  if (!rootId || !targetId || rootId === targetId) {
    if (targetId) pathNodeIds.add(targetId);
    return { pathNodeIds, pathEdgeKeys };
  }

  // Build adjacency list with edge tracking
  interface NeighborStep {
    neighborId: string;
    edge: KnowledgeEdge;
  }
  const adj = new Map<string, NeighborStep[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((edge) => {
    const s = getNodeId(edge.source);
    const t = getNodeId(edge.target);
    if (s && t) {
      if (!adj.has(s)) adj.set(s, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(s)!.push({ neighborId: t, edge });
      adj.get(t)!.push({ neighborId: s, edge });
    }
  });

  // BFS Queue: [currentId, pathOfSteps]
  const queue: Array<{ currentId: string; path: Array<{ nodeId: string; edge: KnowledgeEdge }> }> = [
    { currentId: targetId, path: [] },
  ];
  const visited = new Set<string>([targetId]);

  while (queue.length > 0) {
    const { currentId, path } = queue.shift()!;

    if (currentId === rootId) {
      pathNodeIds.add(targetId);
      pathNodeIds.add(rootId);
      path.forEach((step) => {
        pathNodeIds.add(step.nodeId);
        pathEdgeKeys.add(getEdgeKey(step.edge));
      });
      return { pathNodeIds, pathEdgeKeys };
    }

    const neighbors = adj.get(currentId) || [];
    for (const { neighborId, edge } of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({
          currentId: neighborId,
          path: [...path, { nodeId: neighborId, edge }],
        });
      }
    }
  }

  // If no path found, at least include the target node
  pathNodeIds.add(targetId);
  return { pathNodeIds, pathEdgeKeys };
}

// Convert raw relation type to human-readable phrase
export function formatReadableRelation(
  relation: string,
  isSource: boolean,
  otherLabel: string
): string {
  const rel = (relation || 'RELATED_TO').toUpperCase();
  switch (rel) {
    case 'WORKS_AT':
      return isSource ? `Works at → ${otherLabel}` : `Employer of ← ${otherLabel}`;
    case 'STUDIED_AT':
      return isSource ? `Studied at → ${otherLabel}` : `Alma mater of ← ${otherLabel}`;
    case 'LIVES_IN':
      return isSource ? `Lives in → ${otherLabel}` : `Home of ← ${otherLabel}`;
    case 'USES_PLATFORM':
      return isSource ? `Has profile on → ${otherLabel}` : `User profile ← ${otherLabel}`;
    case 'CONTRIBUTES_TO':
      return isSource ? `Contributes to → ${otherLabel}` : `Maintained by ← ${otherLabel}`;
    case 'KNOWN_FOR':
      return isSource ? `Known for → ${otherLabel}` : `Attributed to ← ${otherLabel}`;
    default:
      const cleanRel = rel.replace(/_/g, ' ').toLowerCase();
      return isSource ? `${cleanRel} → ${otherLabel}` : `${cleanRel} ← ${otherLabel}`;
  }
}
