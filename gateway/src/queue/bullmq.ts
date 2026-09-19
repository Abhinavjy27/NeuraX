import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, // required by BullMQ
});

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

// ── Queue ───────────────────────────────────────────────────────────────────
export const analysisQueue = new Queue("neurax-analysis", { connection });

// ── Worker ──────────────────────────────────────────────────────────────────
// Picks up jobs and forwards them to Python FastAPI
export const analysisWorker = new Worker(
  "neurax-analysis",
  async (job) => {
    console.log(`[BullMQ] Processing job ${job.id}`);

    const response = await axios.post(`${PYTHON_API}/analyze`, {
      job_id: job.data.jobId,
      image_path: job.data.imagePath,
      context: job.data.context,
    });

    return response.data;
  },
  { connection, concurrency: 3 }
);

analysisWorker.on("completed", (job) => {
  console.log(`[BullMQ] ✅ Job ${job.id} completed`);
});

analysisWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err.message);
});
