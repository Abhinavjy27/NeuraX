import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const PIPELINE_STEPS = [
  { id: "identity", icon: "🔍", label: "Identity Resolution" },
  { id: "scraping", icon: "🌐", label: "Multi-Platform Scraping" },
  { id: "vectordb", icon: "🧮", label: "Vector DB Indexing" },
  { id: "entity_resolution", icon: "🤖", label: "Entity Resolution Agent (GPT-4o)" },
  { id: "knowledge_graph", icon: "🕸️", label: "Knowledge Graph Builder" },
  { id: "evidence", icon: "📋", label: "Evidence & Confidence Layer" },
  { id: "output", icon: "📊", label: "Report Generation" },
];

type StepStatus = "waiting" | "active" | "done" | "error";

export default function Home() {
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [currentMessage, setCurrentMessage] = useState("");

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setImage(files[0]);
      setPreview(URL.createObjectURL(files[0]));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, maxFiles: 1,
  });

  async function handleAnalyze() {
    if (!image) return;
    setRunning(true);
    setStepStatuses({});

    try {
      const fd = new FormData();
      fd.append("image", image);
      fd.append("context", context);

      const { data } = await axios.post("/api/pipeline/analyze", fd);
      const jobId = data.jobId;

      // Connect WebSocket for live updates
      const ws = new WebSocket(`ws://localhost:3001?jobId=${jobId}`);

      ws.onmessage = (e) => {
        const event = JSON.parse(e.data);
        setCurrentMessage(event.message);

        if (event.step) {
          setStepStatuses((prev) => ({
            ...prev,
            [event.step]: event.type === "COMPLETE" ? "done" : "active",
          }));
          // Mark previous steps as done
          const idx = PIPELINE_STEPS.findIndex((s) => s.id === event.step);
          PIPELINE_STEPS.slice(0, idx).forEach((s) => {
            setStepStatuses((prev) => ({ ...prev, [s.id]: "done" }));
          });
        }

        if (event.type === "DONE" || event.type === "COMPLETE") {
          ws.close();
          navigate(`/results/${jobId}`);
        }
      };
    } catch (err) {
      setRunning(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "2rem 0" }}>
      {/* Header */}
      <div className="container" style={{ textAlign: "center", marginBottom: "3rem" }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            <span className="gradient-text">NeuraX</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
            Digital Identity Intelligence System · AI in Cybersecurity
          </p>
        </motion.div>
      </div>

      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left — Upload */}
        <motion.div className="glass glow-cyan" style={{ padding: "2rem" }}
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.2rem", fontWeight: 600 }}>
            🖼️ Input
          </h2>

          {/* Dropzone */}
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? "var(--accent-cyan)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            background: isDragActive ? "rgba(0,245,255,0.05)" : "transparent",
            marginBottom: "1.5rem",
          }}>
            <input {...getInputProps()} />
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.img key="preview" src={preview} alt="Preview"
                  style={{ maxHeight: 200, borderRadius: 8, objectFit: "cover" }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
              ) : (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📷</div>
                  <p style={{ color: "var(--text-secondary)" }}>
                    {isDragActive ? "Drop image here..." : "Drag & drop or click to upload"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    Consented images only
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Context */}
          <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Additional Context (optional)
          </label>
          <textarea value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. Software engineer, Bangalore, works at Google..."
            style={{
              width: "100%", padding: "0.75rem",
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", color: "var(--text-primary)",
              fontFamily: "var(--font-sans)", fontSize: "0.9rem", resize: "vertical",
              minHeight: 80, outline: "none",
            }} />

          <button className="btn btn-primary" onClick={handleAnalyze}
            disabled={!image || running}
            style={{ width: "100%", marginTop: "1.5rem", justifyContent: "center",
              opacity: !image || running ? 0.5 : 1 }}>
            {running ? "🔄 Analyzing..." : "🚀 Run Intelligence Pipeline"}
          </button>
        </motion.div>

        {/* Right — Pipeline Status */}
        <motion.div className="glass" style={{ padding: "2rem" }}
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.2rem", fontWeight: 600 }}>
            ⚡ Pipeline Status
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {PIPELINE_STEPS.map((step, i) => {
              const status = stepStatuses[step.id] || "waiting";
              return (
                <motion.div key={step.id} className={`pipeline-step ${status !== "waiting" ? status : ""}`}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <span style={{ fontSize: "1.2rem" }}>
                    {status === "done" ? "✅" : status === "active" ? "🔄" : step.icon}
                  </span>
                  <span style={{
                    fontSize: "0.9rem",
                    color: status === "done" ? "var(--success)"
                      : status === "active" ? "var(--accent-cyan)"
                      : "var(--text-muted)"
                  }}>
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {currentMessage && (
            <motion.div style={{
              marginTop: "1.5rem", padding: "0.75rem",
              background: "rgba(0,245,255,0.05)",
              borderRadius: "var(--radius)",
              border: "1px solid rgba(0,245,255,0.1)",
              color: "var(--accent-cyan)",
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
            }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {currentMessage}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
