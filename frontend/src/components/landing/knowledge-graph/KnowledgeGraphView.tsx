import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Target,
  RotateCcw,
  Layers,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  KnowledgeNode,
  KnowledgeEdge,
  ClaimItem,
  getNodeId,
  getEdgeKey,
} from './types';
import {
  getNodeConfig,
  getEdgeConfig,
  getNodeRadius,
  drawNodeShape,
  drawNodeLabel,
  drawEdgeLabel,
  NODE_CONFIGS,
  EDGE_CONFIGS,
} from './graph-config';
import {
  analyzeTopology,
  assignCurvature,
  findShortestPathToRoot,
  formatReadableRelation,
} from './graph-topology';
import styles from './knowledge-graph.module.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface KnowledgeGraphViewProps {
  personId: string | null;
  graphData: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; relation?: string }>;
  };
  graphStatus: 'idle' | 'loading' | 'ready' | 'error';
  onRetry?: () => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  personId,
  graphData,
  graphStatus,
  onRetry,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  // Dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 520,
  });

  // User Interaction State
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<KnowledgeEdge | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Filtering State
  const [hiddenNodeTypes, setHiddenNodeTypes] = useState<Set<string>>(new Set());
  const [hiddenRelationTypes, setHiddenRelationTypes] = useState<Set<string>>(new Set());

  // Legend & Guidance UI State
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Claims Data State
  const [claims, setClaims] = useState<ClaimItem[]>([]);

  // Motion Preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch real claims for the active candidate
  useEffect(() => {
    if (!personId) {
      setClaims([]);
      return;
    }
    let isMounted = true;
    fetch(`${API_BASE}/claims/${personId}`)
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setClaims(data);
        }
      })
      .catch(() => {
        if (isMounted) setClaims([]);
      });

    return () => {
      isMounted = false;
    };
  }, [personId]);

  // Identify root node ID
  const rootNodeId = useMemo(() => {
    const rawNodes = graphData.nodes || [];
    const rootCandidate =
      rawNodes.find((n) => n.id === 'person_root') ||
      rawNodes.find((n) => n.id === personId) ||
      rawNodes.find((n) => (n.type || '').toLowerCase() === 'person') ||
      rawNodes[0];
    return rootCandidate ? rootCandidate.id : '';
  }, [graphData.nodes, personId]);

  // Derive Canonical Processed Graph Data with degree and multi-edge curvatures
  const canonicalData = useMemo(() => {
    const rawNodes = graphData.nodes || [];
    const rawEdges = graphData.edges || [];

    // Analyze topology on raw edges
    const topology = analyzeTopology(rawNodes as any, rawEdges as any);

    const processedNodes: KnowledgeNode[] = rawNodes.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      type: n.type || 'unknown',
      isRoot: n.id === rootNodeId,
      degree: topology.nodeDegrees.get(n.id) || 0,
    }));

    // Clone edges and assign curvature for multi-edges between identical node pairs
    const clonedEdges: KnowledgeEdge[] = rawEdges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation || 'RELATED_TO',
    }));
    const curvedEdges = assignCurvature(clonedEdges);

    return {
      nodes: processedNodes,
      edges: curvedEdges,
      topology,
    };
  }, [graphData, rootNodeId]);

  // Determine present node types and relation types in actual graph data
  const presentTypes = useMemo(() => {
    const nodeTypes = new Set<string>();
    const relationTypes = new Set<string>();

    canonicalData.nodes.forEach((n) => {
      if (n.type) nodeTypes.add(n.type.toLowerCase().trim());
    });
    canonicalData.edges.forEach((e) => {
      if (e.relation) relationTypes.add(e.relation.toUpperCase().trim());
    });

    return {
      nodeTypes: Array.from(nodeTypes),
      relationTypes: Array.from(relationTypes),
    };
  }, [canonicalData]);

  // Filtered dataset for rendering based on legend toggles
  const filteredData = useMemo(() => {
    const activeNodes = canonicalData.nodes.filter(
      (n) => !hiddenNodeTypes.has((n.type || '').toLowerCase().trim())
    );
    const activeNodeIds = new Set(activeNodes.map((n) => n.id));

    const activeEdges = canonicalData.edges.filter((e) => {
      const sId = getNodeId(e.source);
      const tId = getNodeId(e.target);
      const rel = (e.relation || '').toUpperCase().trim();

      // Omit if relation is filtered out
      if (hiddenRelationTypes.has(rel)) return false;

      // Both source and target must be active
      return activeNodeIds.has(sId) && activeNodeIds.has(tId);
    });

    return {
      nodes: activeNodes,
      links: activeEdges,
    };
  }, [canonicalData, hiddenNodeTypes, hiddenRelationTypes]);

  // Focus node: either hovered or selected
  const focusNode = hoveredNode || selectedNode;

  // Compute direct neighborhood of focus node
  const focusedNeighborhood = useMemo(() => {
    if (!focusNode) return null;
    const focusId = focusNode.id;
    const neighbors = new Set<string>([focusId]);
    const incidentEdgeKeys = new Set<string>();

    canonicalData.edges.forEach((edge) => {
      const sId = getNodeId(edge.source);
      const tId = getNodeId(edge.target);
      if (sId === focusId || tId === focusId) {
        neighbors.add(sId);
        neighbors.add(tId);
        incidentEdgeKeys.add(getEdgeKey(edge));
      }
    });

    return { neighbors, incidentEdgeKeys };
  }, [focusNode, canonicalData.edges]);

  // Compute shortest path back to root for focus node
  const shortestPathInfo = useMemo(() => {
    if (!focusNode || focusNode.id === rootNodeId) {
      return { pathNodeIds: new Set<string>(), pathEdgeKeys: new Set<string>() };
    }
    return findShortestPathToRoot(
      rootNodeId,
      focusNode.id,
      canonicalData.nodes,
      canonicalData.edges
    );
  }, [focusNode, rootNodeId, canonicalData]);

  // Configure D3 forces for optimal spacing and breathing room so nodes don't clump
  useEffect(() => {
    if (fgRef.current && filteredData.nodes.length > 0) {
      try {
        fgRef.current.d3Force('charge')?.strength(-130);
        fgRef.current.d3Force('link')?.distance(65);
      } catch {
        // Safe fallback if internal d3 forces are not yet initialized
      }
    }
  }, [filteredData]);

  // Initial layout positioning: center root node gently on initial load
  useEffect(() => {
    if (fgRef.current && filteredData.nodes.length > 0) {
      // Small timeout to allow ForceGraph simulation to initialize
      const timer = setTimeout(() => {
        if (!fgRef.current) return;
        const root = filteredData.nodes.find((n) => n.isRoot);
        if (root && root.x !== undefined && root.y !== undefined) {
          fgRef.current.centerAt(root.x, root.y, 600);
        } else {
          fgRef.current.zoomToFit(600, 40);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [filteredData.nodes.length]);

  // Interaction handlers to auto-dismiss first-load guidance
  const markInteraction = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true);
  }, [hasInteracted]);

  // Node Hover Callback
  const handleNodeHover = useCallback(
    (node: any) => {
      markInteraction();
      setHoveredNode(node || null);
    },
    [markInteraction]
  );

  // Link Hover Callback
  const handleLinkHover = useCallback(
    (link: any) => {
      markInteraction();
      setHoveredEdge(link || null);
    },
    [markInteraction]
  );

  // Node Click Callback: select, center, zoom, open detail panel
  const handleNodeClick = useCallback(
    (node: any) => {
      markInteraction();
      setSelectedNode(node || null);
      if (node && fgRef.current) {
        if (node.x !== undefined && node.y !== undefined) {
          fgRef.current.centerAt(node.x, node.y, 700);
          fgRef.current.zoom(1.7, 700);
        }
      }
    },
    [markInteraction]
  );

  // Empty Canvas Click: clear selection, detail panel, path highlighting
  const handleBackgroundClick = useCallback(() => {
    markInteraction();
    setSelectedNode(null);
    setHoveredNode(null);
    setHoveredEdge(null);
  }, [markInteraction]);

  // Viewport Control Actions
  const handleZoomIn = () => {
    markInteraction();
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.35, 300);
    }
  };

  const handleZoomOut = () => {
    markInteraction();
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.35, 300);
    }
  };

  const handleZoomToFit = () => {
    markInteraction();
    if (fgRef.current) {
      fgRef.current.zoomToFit(500, 35);
    }
  };

  const handleRecenter = () => {
    markInteraction();
    if (fgRef.current) {
      const root = filteredData.nodes.find((n) => n.isRoot);
      if (root && root.x !== undefined && root.y !== undefined) {
        fgRef.current.centerAt(root.x, root.y, 600);
        fgRef.current.zoom(1.3, 600);
      } else {
        fgRef.current.zoomToFit(500, 35);
      }
    }
  };

  const handleResetFilters = () => {
    markInteraction();
    setHiddenNodeTypes(new Set());
    setHiddenRelationTypes(new Set());
  };

  const toggleNodeTypeFilter = (type: string) => {
    markInteraction();
    setHiddenNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleRelationTypeFilter = (rel: string) => {
    markInteraction();
    setHiddenRelationTypes((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  };

  // Node Canvas Object Renderer
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as KnowledgeNode;
      const x = n.x || 0;
      const y = n.y || 0;
      const radius = getNodeRadius(n);
      const isRoot = Boolean(n.isRoot || n.id === rootNodeId);

      // Determine highlight status
      const isDirectFocus = focusNode?.id === n.id;
      const isNeighbor = focusedNeighborhood?.neighbors.has(n.id) || false;
      const isOnPath = shortestPathInfo.pathNodeIds.has(n.id);
      const isHighlighted = isDirectFocus || isNeighbor || isOnPath;

      // Opacity calculation: dim unrelated nodes to ~22%
      let opacity = 1;
      if (focusNode) {
        opacity = isHighlighted ? 1 : 0.22;
      }

      const cfg = getNodeConfig(n.type);

      // Draw custom geometric shape with glow if highlighted or root
      drawNodeShape(ctx, n, x, y, radius, cfg, isRoot, isHighlighted, opacity);

      // Draw node label with inverse zoom scaling and dark text halo
      drawNodeLabel(ctx, n, x, y, radius, globalScale, isRoot, isHighlighted, opacity);
    },
    [focusNode, focusedNeighborhood, shortestPathInfo, rootNodeId]
  );

  // Custom hit-test pointer area to ensure easy mouse/touch targeting even with smaller nodes
  const paintNodePointerArea = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as KnowledgeNode;
    const x = n.x || 0;
    const y = n.y || 0;
    const radius = Math.max(9, getNodeRadius(n) * 1.8); // Generous hit area for comfortable clicking

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  // Edge Canvas Label Renderer
  const paintEdgeLabel = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const s = link.source;
      const t = link.target;
      if (!s || !t || typeof s !== 'object' || typeof t !== 'object') return;

      const edgeKey = getEdgeKey(link);
      const isHovered = hoveredEdge && getEdgeKey(hoveredEdge) === edgeKey;
      const isIncident = focusedNeighborhood?.incidentEdgeKeys.has(edgeKey) || false;
      const isOnPath = shortestPathInfo.pathEdgeKeys.has(edgeKey);
      const isHighlighted = Boolean(isHovered || isIncident || isOnPath);

      let opacity = 1;
      if (focusNode) {
        opacity = isHighlighted ? 1 : 0.22;
      }

      drawEdgeLabel(ctx, link, s.x, s.y, t.x, t.y, globalScale, isHighlighted, opacity);
    },
    [hoveredEdge, focusedNeighborhood, shortestPathInfo, focusNode]
  );

  // Link Color Accessor: calm slate by default, illuminated on hover/selection
  const getLinkColor = useCallback(
    (link: any) => {
      const edgeKey = getEdgeKey(link);
      const cfg = getEdgeConfig(link.relation);

      const isHovered = hoveredEdge && getEdgeKey(hoveredEdge) === edgeKey;
      const isIncident = focusedNeighborhood?.incidentEdgeKeys.has(edgeKey);
      const isOnPath = shortestPathInfo.pathEdgeKeys.has(edgeKey);

      if (isHovered || isIncident || isOnPath) {
        return cfg.color;
      }

      if (focusNode) {
        return 'rgba(51, 65, 85, 0.18)'; // Dimmed when another node is focused
      }

      // Default idle state: subtle, sophisticated slate line (no neon rainbow clutter)
      return 'rgba(100, 116, 139, 0.32)';
    },
    [focusNode, hoveredEdge, focusedNeighborhood, shortestPathInfo]
  );

  // Link Width Accessor: refined, slim lines
  const getLinkWidth = useCallback(
    (link: any) => {
      const edgeKey = getEdgeKey(link);
      const isHovered = hoveredEdge && getEdgeKey(hoveredEdge) === edgeKey;
      const isIncident = focusedNeighborhood?.incidentEdgeKeys.has(edgeKey);
      const isOnPath = shortestPathInfo.pathEdgeKeys.has(edgeKey);

      if (isHovered || isIncident || isOnPath) {
        return 1.8;
      }
      return 0.85;
    },
    [hoveredEdge, focusedNeighborhood, shortestPathInfo]
  );

  // Selected Node's Incident Relationships for Detail Panel
  const selectedNodeRelations = useMemo(() => {
    if (!selectedNode) return [];
    const id = selectedNode.id;
    const items: Array<{ relation: string; phrase: string; targetId: string }> = [];

    canonicalData.edges.forEach((edge) => {
      const sId = getNodeId(edge.source);
      const tId = getNodeId(edge.target);

      if (sId === id) {
        const otherNode = canonicalData.nodes.find((n) => n.id === tId);
        const label = otherNode ? otherNode.label : tId;
        items.push({
          relation: edge.relation || 'RELATED_TO',
          phrase: formatReadableRelation(edge.relation || 'RELATED_TO', true, label),
          targetId: tId,
        });
      } else if (tId === id) {
        const otherNode = canonicalData.nodes.find((n) => n.id === sId);
        const label = otherNode ? otherNode.label : sId;
        items.push({
          relation: edge.relation || 'RELATED_TO',
          phrase: formatReadableRelation(edge.relation || 'RELATED_TO', false, label),
          targetId: sId,
        });
      }
    });

    return items;
  }, [selectedNode, canonicalData]);

  // Filtered Claims matching Selected Node's label
  const selectedNodeClaims = useMemo(() => {
    if (!selectedNode || !claims || claims.length === 0) return [];
    const targetLabel = selectedNode.label.toLowerCase().trim();

    return claims.filter((claim) => {
      const obj = (claim.object || '').toLowerCase().trim();
      return obj === targetLabel || obj.includes(targetLabel) || targetLabel.includes(obj);
    });
  }, [selectedNode, claims]);

  const hasActiveFilters = hiddenNodeTypes.size > 0 || hiddenRelationTypes.size > 0;

  return (
    <div
      ref={containerRef}
      className={styles.graphWrapper}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }}
    >
      {/* Corner Reticle Brackets */}
      <div className={styles.reticleTL} aria-hidden="true" />
      <div className={styles.reticleTR} aria-hidden="true" />
      <div className={styles.reticleBL} aria-hidden="true" />
      <div className={styles.reticleBR} aria-hidden="true" />

      {/* Top Header / Meta Bar */}
      <div className={styles.graphHeader}>
        <div className={styles.graphMeta}>
          <span className={styles.graphMetaTitle}>Intelligence Topology</span>
          <div className={styles.graphMetaDot} />
          <span className={styles.graphMetaCounts}>
            {filteredData.nodes.length} nodes · {filteredData.links.length} relations
          </span>
          {hasActiveFilters && (
            <span className="text-[10px] text-amber-400 font-mono ml-1 font-semibold">
              [FILTERED]
            </span>
          )}
        </div>
      </div>

      {/* Floating Viewport Controls */}
      <div className={styles.controlToolbar} role="toolbar" aria-label="Graph Viewport Controls">
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleZoomToFit}
          title="Fit to View"
          aria-label="Fit to View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleRecenter}
          title="Center on Target Entity"
          aria-label="Center on Target Entity"
        >
          <Target className="w-3.5 h-3.5" />
        </button>

        <div className={styles.controlSeparator} />

        <button
          type="button"
          className={`${styles.controlBtn} ${isLegendOpen ? styles.controlBtnActive : ''}`}
          onClick={() => setIsLegendOpen((prev) => !prev)}
          title="Toggle Legend & Filter Controls"
          aria-label="Toggle Legend & Filter Controls"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            className={`${styles.controlBtn} text-amber-400`}
            onClick={handleResetFilters}
            title="Reset All Filters"
            aria-label="Reset All Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* First-Load Guidance Reticle Hint */}
      {!hasInteracted && graphStatus === 'ready' && filteredData.nodes.length > 0 && (
        <div className={styles.guidanceHint}>
          <Target className="w-3 h-3 text-indigo-400" />
          <span>
            <strong>Target Entity</strong> · Click a node to trace connections
          </span>
        </div>
      )}

      {/* Loading Overlay */}
      {graphStatus === 'loading' && (
        <div className={styles.stateContainer}>
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <p className={styles.stateText}>Synthesizing relational knowledge topology…</p>
        </div>
      )}

      {/* Empty State Overlay */}
      {graphStatus === 'ready' && canonicalData.nodes.length === 0 && (
        <div className={styles.stateContainer}>
          <Info className="w-6 h-6 text-slate-400" />
          <p className={styles.stateText}>No graph available for this target</p>
        </div>
      )}

      {/* Error State Overlay */}
      {graphStatus === 'error' && (
        <div className={styles.stateContainer}>
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <p className={`${styles.stateText} ${styles.errorText}`}>
            Failed to retrieve knowledge topology for this identity.
          </p>
          {onRetry && (
            <button type="button" className={styles.retryBtn} onClick={onRetry}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Query</span>
            </button>
          )}
        </div>
      )}

      {/* Canvas Area */}
      <div className={styles.canvasArea}>
        {graphStatus === 'ready' && filteredData.nodes.length > 0 && (
          <ForceGraph2D
            ref={fgRef}
            graphData={filteredData}
            width={dimensions.width}
            height={dimensions.height}
            // Canvas MUST be transparent to reveal rotating 3D Earth behind console!
            backgroundColor="rgba(0,0,0,0)"
            // Node Rendering
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintNodePointerArea}
            // Link Rendering
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={paintEdgeLabel}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkCurvature={(link: any) => link.curvature || 0}
            // Directional Arrows: subtle, clean arrowheads
            linkDirectionalArrowLength={3.2}
            linkDirectionalArrowRelPos={0.97}
            linkDirectionalArrowColor={getLinkColor}
            // Directional Particles: only show on focused or hovered paths to prevent noisy visual clutter
            linkDirectionalParticles={prefersReducedMotion ? 0 : (focusNode || hoveredEdge ? 1 : 0)}
            linkDirectionalParticleSpeed={0.0025}
            linkDirectionalParticleWidth={1.2}
            linkDirectionalParticleColor={getLinkColor}
            // Event Handlers
            onNodeHover={handleNodeHover}
            onLinkHover={handleLinkHover}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            // Physics Stabilization
            d3AlphaDecay={0.025}
            d3VelocityDecay={0.35}
            cooldownTicks={prefersReducedMotion ? 0 : 140}
          />
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && !selectedNode && mousePos && (
        <div
          className={styles.hoverTooltip}
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: getNodeConfig(hoveredNode.type).color }}
            />
            <span className={styles.tooltipLabel}>{hoveredNode.label}</span>
          </div>
          <div className={styles.tooltipMeta}>
            <span className="capitalize">{hoveredNode.type}</span>
            <span>·</span>
            <span>{hoveredNode.degree || 0} connection{(hoveredNode.degree || 0) === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}

      {/* Dynamic Graph Legend & Interactive Filters */}
      {isLegendOpen && graphStatus === 'ready' && canonicalData.nodes.length > 0 && (
        <div className={styles.legendContainer}>
          <div className={styles.legendHeader}>
            <span className={styles.legendTitle}>
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Legend & Filters</span>
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.legendActionBtn}
                onClick={handleResetFilters}
              >
                Reset
              </button>
            )}
          </div>

          <div className={styles.legendGroups}>
            {/* Node Types Legend (Only types present in dataset!) */}
            {presentTypes.nodeTypes.length > 0 && (
              <div className={styles.legendGroup}>
                <span className={styles.legendGroupLabel}>Entities</span>
                <div className={styles.legendItemsList}>
                  {presentTypes.nodeTypes.map((type) => {
                    const cfg = NODE_CONFIGS[type] || {
                      color: '#94a3b8',
                      label: type,
                      shapeName: 'Circle',
                    };
                    const isFiltered = hiddenNodeTypes.has(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`${styles.legendItem} ${isFiltered ? styles.legendItemFiltered : ''}`}
                        onClick={() => toggleNodeTypeFilter(type)}
                        title={`Click to ${isFiltered ? 'show' : 'hide'} ${cfg.label} nodes`}
                      >
                        <span
                          className={styles.legendNodeDot}
                          style={{ background: cfg.color }}
                        />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relation Types Legend (Only relations present in dataset!) */}
            {presentTypes.relationTypes.length > 0 && (
              <div className={styles.legendGroup}>
                <span className={styles.legendGroupLabel}>Relations</span>
                <div className={styles.legendItemsList}>
                  {presentTypes.relationTypes.map((rel) => {
                    const cfg = EDGE_CONFIGS[rel] || {
                      color: '#64748b',
                      lineDash: [],
                      label: rel,
                    };
                    const isFiltered = hiddenRelationTypes.has(rel);
                    const isDashed = cfg.lineDash && cfg.lineDash.length > 0 && cfg.lineDash[0] === 4;
                    const isDotted = cfg.lineDash && cfg.lineDash.length > 0 && cfg.lineDash[0] === 2;

                    return (
                      <button
                        key={rel}
                        type="button"
                        className={`${styles.legendItem} ${isFiltered ? styles.legendItemFiltered : ''}`}
                        onClick={() => toggleRelationTypeFilter(rel)}
                        title={`Click to ${isFiltered ? 'show' : 'hide'} ${rel} relations`}
                      >
                        <span
                          className={`${styles.legendEdgeLine} ${
                            isDashed
                              ? styles.legendEdgeLineDashed
                              : isDotted
                              ? styles.legendEdgeLineDotted
                              : ''
                          }`}
                          style={{
                            borderColor: cfg.color,
                            backgroundColor: isDashed || isDotted ? 'transparent' : cfg.color,
                          }}
                        />
                        <span>{rel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Node Detail Panel */}
      {selectedNode && (
        <div className={styles.detailPanel}>
          {/* Detail Panel Header */}
          <div className={styles.detailPanelHeader}>
            <div className={styles.detailHeaderContent}>
              <div className="flex items-center gap-2">
                <span
                  className={styles.detailTypeBadge}
                  style={{
                    backgroundColor: `${getNodeConfig(selectedNode.type).color}22`,
                    color: getNodeConfig(selectedNode.type).color,
                    border: `1px solid ${getNodeConfig(selectedNode.type).color}44`,
                  }}
                >
                  {selectedNode.type}
                </span>
                {selectedNode.isRoot && (
                  <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 px-1.5 py-0.5 rounded">
                    ROOT TARGET
                  </span>
                )}
              </div>
              <h4 className={styles.detailNodeTitle}>{selectedNode.label}</h4>
            </div>
            <button
              type="button"
              className={styles.detailCloseBtn}
              onClick={() => setSelectedNode(null)}
              title="Close detail panel"
              aria-label="Close detail panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detail Panel Body */}
          <div className={styles.detailPanelBody}>
            {/* Relationships Section */}
            <div>
              <div className={styles.detailSectionTitle}>
                <span>Relational Context</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {selectedNodeRelations.length} edge{selectedNodeRelations.length === 1 ? '' : 's'}
                </span>
              </div>
              {selectedNodeRelations.length > 0 ? (
                <div className={styles.detailRelationsList}>
                  {selectedNodeRelations.map((rel, idx) => (
                    <div key={idx} className={styles.detailRelationItem}>
                      <span className="text-slate-200">{rel.phrase}</span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold shrink-0"
                        style={{
                          backgroundColor: `${getEdgeConfig(rel.relation).color}1a`,
                          color: getEdgeConfig(rel.relation).color,
                          border: `1px solid ${getEdgeConfig(rel.relation).color}33`,
                        }}
                      >
                        {rel.relation}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic">
                  No direct relational edges connected to this entity.
                </p>
              )}
            </div>

            {/* Evidentiary Claims Section */}
            {selectedNodeClaims.length > 0 && (
              <div>
                <div className={styles.detailSectionTitle}>
                  <span>Corroborating Claims</span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    {selectedNodeClaims.length} verified
                  </span>
                </div>
                <div className={styles.detailClaimsList}>
                  {selectedNodeClaims.map((claim, idx) => (
                    <div key={idx} className={styles.detailClaimCard}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={styles.detailClaimPredicate}>{claim.predicate}</span>
                        {claim.confidence !== undefined && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {(claim.confidence * 100).toFixed(0)}% conf
                          </span>
                        )}
                      </div>
                      <p className={styles.detailClaimObject}>{claim.object}</p>
                      {claim.source_url && (
                        <div className={styles.detailClaimFooter}>
                          <a
                            href={claim.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.detailSourceLink}
                          >
                            <span>Source citation</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphView;
