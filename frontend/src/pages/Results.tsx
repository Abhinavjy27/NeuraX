import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";

interface EvidenceClaim {
  claim: string;
  source_url: string;
  confidence: number;
  verification_method: string;
  conflicts: { conflicting_claim: string; source_url: string; confidence: number }[];
}

interface IdentityResult {
  status: string;
  identity: { name: string; confidence: number };
  platforms_found: string[];
  graph_nodes: number;
  graph_edges: number;
  claims?: EvidenceClaim[];
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 0.85 ? "var(--success)" : value >= 0.6 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div className="confidence-bar" style={{ flex: 1 }}>
        <motion.div className="confidence-fill"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          initial={{ width: 0 }} animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color, minWidth: 40 }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function Results() {
  const { jobId } = useParams<{ jobId: string }>();

  const { data, isLoading } = useQuery<IdentityResult>({
    queryKey: ["result", jobId],
    queryFn: () => axios.get(`/api/pipeline/result/${jobId}`).then((r) => r.data),
    refetchInterval: (query) => query.state.data?.status === "complete" ? false : 2000,
  });

  if (isLoading || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔄</div>
          <p style={{ color: "var(--text-secondary)" }}>Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 0" }}>
      <div className="container">
        {/* Header */}
        <motion.div style={{ marginBottom: "2rem" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
                🧠 <span className="gradient-text">{data.identity?.name || "Identity"}</span>
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Digital Identity Report</p>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Link to={`/graph/${jobId}`}>
                <button className="btn btn-ghost">🕸️ View Knowledge Graph</button>
              </Link>
              <Link to="/">
                <button className="btn btn-ghost">← New Analysis</button>
              </Link>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Identity Card */}
          <motion.div className="glass glow-cyan" style={{ padding: "1.5rem" }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Identity Confidence
            </h3>
            <ConfidenceBar value={data.identity?.confidence || 0} />
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {data.platforms_found?.map((p) => (
                <span key={p} className="badge badge-cyan">{p}</span>
              ))}
            </div>
          </motion.div>

          {/* Graph Stats */}
          <motion.div className="glass glow-purple" style={{ padding: "1.5rem" }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Knowledge Graph
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { label: "Nodes", value: data.graph_nodes, icon: "⭕" },
                { label: "Edges", value: data.graph_edges, icon: "🔗" },
                { label: "Platforms", value: data.platforms_found?.length, icon: "🌐" },
                { label: "Status", value: data.status === "complete" ? "✅" : "🔄", icon: "" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius)", padding: "1rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-purple)" }}>{icon} {value}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Claims / Evidence */}
        {data.claims && data.claims.length > 0 && (
          <motion.div style={{ marginTop: "1.5rem" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontWeight: 600 }}>📋 Evidence Trail</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {data.claims.map((claim, i) => (
                <motion.div key={i} className="glass" style={{ padding: "1.25rem" }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}>
                  <p style={{ marginBottom: "0.75rem", fontWeight: 500 }}>{claim.claim}</p>
                  <ConfidenceBar value={claim.confidence} />
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="badge badge-purple">{claim.verification_method}</span>
                    <a href={claim.source_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: "var(--accent-cyan)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                      {claim.source_url}
                    </a>
                  </div>
                  {claim.conflicts.length > 0 && (
                    <div style={{ marginTop: "0.75rem", padding: "0.75rem",
                      background: "rgba(255,82,82,0.05)", borderRadius: "var(--radius)",
                      border: "1px solid rgba(255,82,82,0.2)" }}>
                      <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>
                        ⚠️ Conflict: {claim.conflicts[0].conflicting_claim}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
