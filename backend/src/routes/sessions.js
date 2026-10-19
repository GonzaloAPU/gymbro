import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { PerformedExercise, PerformedSet, TrainingSession } from "../models/index.js";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.post("/", async (req, res) => {
  const { routineDayId } = z.object({ routineDayId: z.string().uuid().optional() }).parse(req.body);
  const session = await TrainingSession.create({ userId: req.auth.sub, routineDayId });
  res.status(201).json(session);
});

sessionsRouter.post("/:sessionId/exercises", async (req, res) => {
  const input = z.object({ exerciseId: z.string().uuid(), order: z.number().int().positive() }).parse(req.body);
  const session = await ownedSession(req.params.sessionId, req.auth.sub);
  const performed = await PerformedExercise.create({ sessionId: session.id, ...input });
  res.status(201).json(performed);
});

sessionsRouter.post("/:sessionId/exercises/:performedExerciseId/sets", saveSet);
sessionsRouter.put("/:sessionId/exercises/:performedExerciseId/sets/:setNumber", saveSet);

async function saveSet(req, res) {
  const session = await ownedSession(req.params.sessionId, req.auth.sub);
  if (!["ACTIVE", "PAUSED"].includes(session.status)) {
    throw Object.assign(new Error("La sesión ya está finalizada"), { status: 409 });
  }
  const performedExercise = await PerformedExercise.findOne({
    where: { id: req.params.performedExerciseId, sessionId: req.params.sessionId },
  });
  if (!performedExercise) {
    throw Object.assign(new Error("Ejercicio realizado no encontrado"), { status: 404 });
  }
  const input = z.object({
    setNumber: z.number().int().positive(),
    weightKg: z.number().nonnegative(),
    repetitions: z.number().int().positive(),
    durationSeconds: z.number().int().nonnegative().optional(),
    actualRestSeconds: z.number().int().nonnegative().optional(),
  }).parse(req.body);
  if (req.method === "PUT") {
    if (String(input.setNumber) !== req.params.setNumber) throw Object.assign(new Error("Número de serie inválido"), { status: 400 });
    const existing = await PerformedSet.findOne({ where: { performedExerciseId: performedExercise.id, setNumber: input.setNumber } });
    if (!existing) throw Object.assign(new Error("Serie no encontrada"), { status: 404 });
    await existing.update({ ...input, completedAt: new Date() });
    return res.json(existing);
  }
  const set = await PerformedSet.create({ performedExerciseId: performedExercise.id, ...input });
  res.status(201).json(set);
}

sessionsRouter.post("/:sessionId/finish", async (req, res) => {
  const input = z.object({ durationSeconds: z.number().int().nonnegative().optional() }).parse(req.body);
  const session = await ownedSession(req.params.sessionId, req.auth.sub, true);
  const finishedAt = new Date();
  const wallSeconds = Math.max(0, Math.round((finishedAt - session.startedAt) / 1000));
  const durationSeconds = Math.min(input.durationSeconds ?? wallSeconds, wallSeconds);
  const totalVolumeKg = session.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + Number(set.weightKg) * set.repetitions, 0), 0);
  const activeMinutes = durationSeconds / 60;
  const calories = Math.round(activeMinutes * 6.5 * 10) / 10;
  await session.update({ finishedAt, durationSeconds, totalVolumeKg, calories, status: "COMPLETED" });
  const updated = session;
  res.json(updated);
});

async function ownedSession(id, userId, includeSets = false) {
  const session = await TrainingSession.findOne({
    where: { id, userId },
    include: includeSets ? [{
      model: PerformedExercise,
      as: "exercises",
      include: [{ model: PerformedSet, as: "sets" }],
    }] : undefined,
  });
  if (!session) throw Object.assign(new Error("Sesion no encontrada"), { status: 404 });
  return session;
}
