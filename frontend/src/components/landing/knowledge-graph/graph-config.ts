// Visual System configuration, palettes, and canvas drawing helpers for Trinetra Knowledge Graph
import { KnowledgeNode, KnowledgeEdge, NodeType, RelationType } from './types';

export interface NodeVisualConfig {
  color: string;
  fill: string;
  stroke: string;
  label: string;
  shapeName: string;
}

export interface EdgeVisualConfig {
  color: string;
  lineDash?: number[];
  label: string;
}

export const NODE_CONFIGS: Record<string, NodeVisualConfig> = {
  person: {
    color: '#6366f1',
    fill: 'rgba(99, 102, 241, 0.18)',
    stroke: '#818cf8',
    label: 'Person',
    shapeName: 'Double Ring',
  },
  organization: {
    color: '#0d9488',
    fill: 'rgba(13, 148, 136, 0.16)',
    stroke: '#14b8a6',
    label: 'Organization',
    shapeName: 'Rounded Square',
  },
  platform: {
    color: '#e11d48',
    fill: 'rgba(225, 29, 72, 0.16)',
    stroke: '#f43f5e',
    label: 'Platform',
    shapeName: 'Hexagon',
  },
  location: {
    color: '#d97706',
    fill: 'rgba(217, 119, 6, 0.16)',
    stroke: '#f59e0b',
    label: 'Location',
    shapeName: 'Diamond',
  },
  project: {
    color: '#0284c7',
    fill: 'rgba(2, 132, 199, 0.16)',
    stroke: '#0ea5e9',
    label: 'Project',
    shapeName: 'Triangle',
  },
  event: {
    color: '#7c3aed',
    fill: 'rgba(124, 58, 237, 0.16)',
    stroke: '#8b5cf6',
    label: 'Event',
    shapeName: 'Dot Circle',
  },
};

export const UNKNOWN_NODE_CONFIG: NodeVisualConfig = {
  color: '#64748b',
  fill: 'rgba(100, 116, 139, 0.14)',
  stroke: '#94a3b8',
  label: 'Unknown Entity',
  shapeName: 'Circle',
};

export const EDGE_CONFIGS: Record<string, EdgeVisualConfig> = {
  WORKS_AT: {
    color: '#14b8a6',
    lineDash: [],
    label: 'WORKS_AT',
  },
  STUDIED_AT: {
    color: '#0ea5e9',
    lineDash: [],
    label: 'STUDIED_AT',
  },
  LIVES_IN: {
    color: '#f59e0b',
    lineDash: [3, 2.5],
    label: 'LIVES_IN',
  },
  USES_PLATFORM: {
    color: '#f43f5e',
    lineDash: [],
    label: 'USES_PLATFORM',
  },
  CONTRIBUTES_TO: {
    color: '#38bdf8',
    lineDash: [],
    label: 'CONTRIBUTES_TO',
  },
  KNOWN_FOR: {
    color: '#8b5cf6',
    lineDash: [2, 2.5],
    label: 'KNOWN_FOR',
  },
};

export const UNKNOWN_EDGE_CONFIG: EdgeVisualConfig = {
  color: '#64748b',
  lineDash: [],
  label: 'RELATED_TO',
};

export function getNodeConfig(type?: NodeType): NodeVisualConfig {
  if (!type) return UNKNOWN_NODE_CONFIG;
  const key = type.toLowerCase().trim();
  return NODE_CONFIGS[key] || UNKNOWN_NODE_CONFIG;
}

export function getEdgeConfig(relation?: RelationType): EdgeVisualConfig {
  if (!relation) return UNKNOWN_EDGE_CONFIG;
  const key = relation.toUpperCase().trim();
  return EDGE_CONFIGS[key] || UNKNOWN_EDGE_CONFIG;
}

// Clamped degree-based node radius - reduced for sleek, non-clumsy layout
export function getNodeRadius(node: KnowledgeNode): number {
  if (node.isRoot || node.id === 'person_root') {
    return 8; // Refined dominant root size (down from 14)
  }
  const deg = node.degree || 1;
  // Clamped between 3.6 and 5.8 (down from 5.5 to 11)
  return Math.min(5.8, Math.max(3.6, 3.4 + Math.sqrt(deg) * 0.75));
}

// Truncate long labels cleanly
export function truncateLabel(text: string, maxLen = 18): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

// ── CANVAS SHAPE DRAWING HELPERS ─────────────────────────────────────────────

export function drawNodeShape(
  ctx: CanvasRenderingContext2D,
  node: KnowledgeNode,
  x: number,
  y: number,
  radius: number,
  cfg: NodeVisualConfig,
  isRoot: boolean,
  isHighlighted: boolean,
  opacity = 1
): void {
  ctx.save();
  ctx.globalAlpha = opacity;

  // Restrained ambient shadow only for root or highlighted nodes — zero neon glow
  if (isRoot || isHighlighted) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 4;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = cfg.fill;
  ctx.strokeStyle = isHighlighted ? '#ffffff' : cfg.stroke;
  ctx.lineWidth = isHighlighted ? 1.4 : 0.85;

  const type = (node.type || '').toLowerCase().trim();

  if (isRoot || type === 'person') {
    // Person: Circular with double ring
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Inner concentric ring
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.65, 0, 2 * Math.PI);
    ctx.strokeStyle = isRoot ? '#c7d2fe' : cfg.color;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Subtle center aperture dot for root
    if (isRoot) {
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.25, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  } else if (type === 'organization') {
    // Organization: Rounded Square (sleek, compact)
    const s = radius * 1.35;
    const r = radius * 0.25;
    const hx = x - s / 2;
    const hy = y - s / 2;

    ctx.beginPath();
    ctx.moveTo(hx + r, hy);
    ctx.lineTo(hx + s - r, hy);
    ctx.quadraticCurveTo(hx + s, hy, hx + s, hy + r);
    ctx.lineTo(hx + s, hy + s - r);
    ctx.quadraticCurveTo(hx + s, hy + s, hx + s - r, hy + s);
    ctx.lineTo(hx + r, hy + s);
    ctx.quadraticCurveTo(hx, hy + s, hx, hy + s - r);
    ctx.lineTo(hx, hy + r);
    ctx.quadraticCurveTo(hx, hy, hx + r, hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'platform') {
    // Platform: Hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + radius * 1.02 * Math.cos(angle);
      const py = y + radius * 1.02 * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'location') {
    // Location: Diamond
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 1.15);
    ctx.lineTo(x + radius * 1.0, y);
    ctx.lineTo(x, y + radius * 1.15);
    ctx.lineTo(x - radius * 1.0, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'project') {
    // Project: Triangle
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 1.1);
    ctx.lineTo(x + radius * 1.05, y + radius * 0.9);
    ctx.lineTo(x - radius * 1.05, y + radius * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'event') {
    // Event: Circle with central dot
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.35, 0, 2 * Math.PI);
    ctx.fillStyle = cfg.color;
    ctx.fill();
  } else {
    // Fallback: Plain circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// ── NODE LABEL RENDERING WITH DARK HALO FOR EARTH VISIBILITY ───────────────

export function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  node: KnowledgeNode,
  x: number,
  y: number,
  radius: number,
  globalScale: number,
  isRoot: boolean,
  isHighlighted: boolean,
  opacity = 1
): void {
  // Zoom cutoff: if far out and not root and not highlighted, hide label
  if (globalScale < 0.65 && !isRoot && !isHighlighted) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  // Font size with gentle inverse scale clamping for crisp typography
  const rawSize = isRoot ? 8.8 : 7.6;
  const scaledSize = Math.max(2.6, Math.min(10.2, rawSize / Math.pow(globalScale, 0.45)));
  ctx.font = `${isRoot ? '600' : '500'} ${scaledSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const labelText = isHighlighted ? node.label : truncateLabel(node.label, isRoot ? 24 : 18);
  const textY = y + radius + 2.8 / globalScale;

  // Thin, clean translucent halo so text is ultra-crisp over the rotating 3D Earth
  ctx.strokeStyle = 'rgba(3, 7, 18, 0.92)';
  ctx.lineWidth = 1.8 / globalScale;
  ctx.lineJoin = 'round';
  ctx.strokeText(labelText, x, textY);

  // Clean, high-contrast text fill (no fuzzy neon)
  ctx.fillStyle = isRoot ? '#ffffff' : isHighlighted ? '#ffffff' : '#e2e8f0';
  ctx.fillText(labelText, x, textY);

  ctx.restore();
}

// ── EDGE LABEL RENDERING AT MIDPOINT ALONG EDGE ─────────────────────────────

export function drawEdgeLabel(
  ctx: CanvasRenderingContext2D,
  edge: KnowledgeEdge,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  globalScale: number,
  isHighlighted: boolean,
  opacity = 1
): void {
  const relation = edge.relation;
  if (!relation) return;

  // Anti-clutter gate: Only draw edge labels when highlighted (hovered, incident, or on path)
  // or on high zoom-in (globalScale >= 1.6). This removes 80% of visual noise!
  if (!isHighlighted && globalScale < 1.6) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  let angle = Math.atan2(targetY - sourceY, targetX - sourceX);
  // Ensure label is never upside down
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    angle += Math.PI;
  }

  const fontSize = Math.max(2.4, Math.min(8.2, 7.0 / Math.pow(globalScale, 0.45)));
  ctx.font = `500 ${fontSize}px "SF Mono", Menlo, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const cfg = getEdgeConfig(relation);

  // Crisp text halo
  ctx.strokeStyle = 'rgba(3, 7, 18, 0.95)';
  ctx.lineWidth = 1.8 / globalScale;
  ctx.lineJoin = 'round';
  ctx.strokeText(relation, 0, 0);

  ctx.fillStyle = isHighlighted ? '#ffffff' : cfg.color;
  ctx.fillText(relation, 0, 0);

  ctx.restore();
}
