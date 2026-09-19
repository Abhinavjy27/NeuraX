import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import * as d3 from "d3";
import { motion } from "framer-motion";

// ── Mock graph data (replace with real API data) ───────────────────────────
const MOCK_NODES = [
  { id: "person", label: "Subject", type: "person", color: "#00f5ff" },
  { id: "github", label: "GitHub", type: "account", color: "#9b59ff" },
  { id: "linkedin", label: "LinkedIn", type: "account", color: "#9b59ff" },
  { id: "twitter", label: "Twitter/X", type: "account", color: "#9b59ff" },
  { id: "google", label: "Google", type: "org", color: "#ffab40" },
  { id: "pycon", label: "PyCon 2025", type: "event", color: "#ff2d78" },
  { id: "paper1", label: "Paper: OSINT", type: "publication", color: "#00e676" },
];

const MOCK_LINKS = [
  { source: "person", target: "github", label: "HAS_ACCOUNT" },
  { source: "person", target: "linkedin", label: "HAS_ACCOUNT" },
  { source: "person", target: "twitter", label: "HAS_ACCOUNT" },
  { source: "person", target: "google", label: "WORKS_AT" },
  { source: "person", target: "pycon", label: "SPOKE_AT" },
  { source: "person", target: "paper1", label: "AUTHORED" },
];

export default function GraphPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = 800, height = 500;

    const svg = d3.select(svgRef.current)
      .attr("width", width).attr("height", height);

    svg.selectAll("*").remove();

    // Defs: arrow markers
    const defs = svg.append("defs");
    defs.append("marker").attr("id", "arrow").attr("viewBox", "0 -5 10 10")
      .attr("refX", 20).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#44445a");

    const simulation = d3.forceSimulation(MOCK_NODES as any)
      .force("link", d3.forceLink(MOCK_LINKS).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g").selectAll("line")
      .data(MOCK_LINKS).join("line")
      .attr("stroke", "#1e1e3f").attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    const linkLabel = svg.append("g").selectAll("text")
      .data(MOCK_LINKS).join("text")
      .attr("fill", "#44445a").attr("font-size", "9px")
      .attr("text-anchor", "middle").text((d) => d.label);

    const node = svg.append("g").selectAll("circle")
      .data(MOCK_NODES).join("circle")
      .attr("r", (d) => d.type === "person" ? 20 : 12)
      .attr("fill", (d) => `${d.color}22`)
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 2)
      .call(d3.drag<any, any>()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    const label = svg.append("g").selectAll("text")
      .data(MOCK_NODES).join("text")
      .attr("fill", "#e8e8f0").attr("font-size", "11px").attr("font-family", "Inter")
      .attr("text-anchor", "middle").attr("dy", "0.35em")
      .text((d) => d.label);

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      linkLabel.attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y + 28);
    });

    return () => { simulation.stop(); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 0" }}>
      <div className="container">
        <motion.div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
            🕸️ <span className="gradient-text">Knowledge Graph</span>
          </h1>
          <Link to={`/results/${jobId}`}>
            <button className="btn btn-ghost">← Back to Report</button>
          </Link>
        </motion.div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {[
            { color: "#00f5ff", label: "Person" },
            { color: "#9b59ff", label: "Account" },
            { color: "#ffab40", label: "Organization" },
            { color: "#ff2d78", label: "Event" },
            { color: "#00e676", label: "Publication" },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>

        <motion.div className="glass glow-purple" style={{ padding: "1.5rem", overflow: "hidden" }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <svg ref={svgRef} style={{ width: "100%", borderRadius: "var(--radius)" }} />
        </motion.div>
      </div>
    </div>
  );
}
