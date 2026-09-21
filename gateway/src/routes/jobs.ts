import { Router, Request, Response } from "express";

export const jobsRouter = Router();

jobsRouter.get("/:jobId/status", (req: Request, res: Response) => {
  res.json({ jobId: req.params.jobId, status: "processing" });
});
