// Graph Node & Edge Data Types for Trinetra Knowledge Graph
// Strictly typed to safely handle ForceGraph2D's runtime mutation of link.source & link.target

export type NodeType =
  | 'person'
  | 'organization'
  | 'platform'
  | 'location'
  | 'project'
  | 'event'
  | string;

export type RelationType =
  | 'WORKS_AT'
  | 'STUDIED_AT'
  | 'LIVES_IN'
  | 'USES_PLATFORM'
  | 'CONTRIBUTES_TO'
  | 'KNOWN_FOR'
  | string;

export interface KnowledgeNode {
  id: string;
  label: string;
  type: NodeType;
  // Dynamic ForceGraph2D simulation coordinates and metrics
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  index?: number;
  degree?: number;
  isRoot?: boolean;
}

export interface KnowledgeEdge {
  source: string | KnowledgeNode;
  target: string | KnowledgeNode;
  relation?: RelationType;
  curvature?: number;
  index?: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  links: KnowledgeEdge[];
}

export interface ClaimItem {
  predicate: string;
  object: string;
  confidence?: number;
  source_url?: string;
}

export interface NodeNeighborhood {
  node: KnowledgeNode;
  neighbors: Set<string>;
  connectedEdgeKeys: Set<string>;
  degree: number;
}

// Accessor helper to safely extract string ID whether input is string or node object
export function getNodeId(node: string | KnowledgeNode | undefined | null): string {
  if (!node) return '';
  if (typeof node === 'object') {
    return node.id || '';
  }
  return String(node);
}

// Helper to safely build an edge key
export function getEdgeKey(edge: KnowledgeEdge): string {
  const s = getNodeId(edge.source);
  const t = getNodeId(edge.target);
  return `${s}->${t}:${edge.relation || ''}`;
}
