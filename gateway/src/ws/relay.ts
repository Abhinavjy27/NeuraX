import { WebSocketServer, WebSocket } from "ws";
import axios from "axios";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

// Map jobId → connected WebSocket clients
const clients = new Map<string, Set<WebSocket>>();

export function setupWebSocketRelay(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      ws.close(1008, "Missing jobId");
      return;
    }

    // Register client for this job
    if (!clients.has(jobId)) clients.set(jobId, new Set());
    clients.get(jobId)!.add(ws);

    console.log(`[WS] Client connected for job ${jobId}`);

    // Subscribe to Python SSE stream and relay to React
    const eventSource = subscribeToSSE(jobId, ws);

    ws.on("close", () => {
      clients.get(jobId)?.delete(ws);
      eventSource.abort();
    });
  });
}

/**
 * Subscribe to Python FastAPI Server-Sent Events for a job
 * and relay each event as a WebSocket message to the React client.
 */
function subscribeToSSE(jobId: string, ws: WebSocket) {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await axios.get(`${PYTHON_API}/stream/${jobId}`, {
        responseType: "stream",
        signal: controller.signal,
      });

      response.data.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        // Parse SSE format: "data: {...}\n\n"
        const lines = text.split("\n").filter((l: string) => l.startsWith("data:"));
        for (const line of lines) {
          const payload = line.replace("data: ", "").trim();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        }
      });

      response.data.on("end", () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "DONE" }));
          ws.close();
        }
      });
    } catch (err: any) {
      if (err.name !== "CanceledError") {
        console.error(`[WS] SSE relay error for job ${jobId}:`, err.message);
      }
    }
  })();

  return controller;
}
