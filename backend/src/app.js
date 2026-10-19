import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { routinesRouter } from "./routes/routines.js";
import { sessionsRouter } from "./routes/sessions.js";
import { progressRouter } from "./routes/progress.js";
import { exercisesRouter } from "./routes/exercises.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();
app.use(cors({ origin: config.frontendUrl }));
// Profile photos are resized client-side to at most 650 KB of Base64 text.
app.use(express.json({ limit: '1mb' }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "smartgymbro-api" }));
app.use("/api/auth", authRouter);
app.use("/api/routines", routinesRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/exercises", exercisesRouter);
app.use(errorHandler);
