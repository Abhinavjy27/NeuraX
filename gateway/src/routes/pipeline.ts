import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { analysisQueue } from "../queue/bullmq";
import axios from "axios";

export const pipelineRouter = Router();

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * POST /api/pipeline/analyze
 * Accepts: multipart/form-data { image: File, context: string }
 * Returns: { jobId: string }
 */
pipelineRouter.post("/analyze", async (req: Request, res: Response) => {
  try {
    const jobId = uuidv4();

    // Forward to Python backend and queue the job
    await analysisQueue.add(
      "analyze",
      {
        jobId,
        imagePath: req.body.imagePath, // set after frontend uploads file
        context: req.body.context || "",
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      }
    );

    res.status(202).json({
      jobId,
      message: "Analysis queued",
      statusUrl: `/api/jobs/${jobId}/status`,
      wsChannel: `ws://localhost:3001?jobId=${jobId}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to queue analysis job" });
  }
});

/**
 * GET /api/pipeline/result/:jobId
 * Proxies final result from Python backend
 */
pipelineRouter.get("/result/:jobId", async (req: Request, res: Response) => {
  try {
    const { data } = await axios.get(
      `${PYTHON_API}/result/${req.params.jobId}`
    );
    res.json(data);
  } catch {
    res.status(404).json({ error: "Result not found" });
  }
});
