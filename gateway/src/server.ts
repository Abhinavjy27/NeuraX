import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { pipelineRouter } from "./routes/pipeline";
import { jobsRouter } from "./routes/jobs";
import { setupWebSocketRelay } from "./ws/relay";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173" }));
app.use(morgan("dev"));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/pipeline", pipelineRouter);
app.use("/api/jobs", jobsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "neurax-gateway" });
});

// ── WebSocket relay (Python SSE → React WebSocket) ──────────────────────────
setupWebSocketRelay(wss);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.GATEWAY_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 NeuraX Gateway running on http://localhost:${PORT}`);
});

export { server };
