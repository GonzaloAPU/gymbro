/**
 * Consulta el progreso personal y los rankings de fuerza. El resumen mezcla historiales recientes con totales de toda la cuenta; el ranking compara series de sesiones completadas.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Router } from "express";
import { z } from "zod";
import { sequelize } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { BodyWeightHistory, Exercise, StrengthRecord, TrainingSession, User, PerformedSet, PerformedExercise } from "../models/index.js";
import { QueryTypes } from 'sequelize';

export const progressRouter = Router();
progressRouter.use(requireAuth);

// GET /leaderboard: SQL agrupa variantes conocidas de nombres, elige la mejor serie de cada usuario y calcula posiciones por peso.
progressRouter.get('/leaderboard', async (req, res) => {
  const quote = model => sequelize.getQueryInterface().queryGenerator.quoteTable(model.getTableName());
  // SQL: candidates selecciona series válidas; best elige una marca por usuario y categoría.
  // dense_rank asigna el mismo puesto si varias personas empatan en peso.
  const rows = await sequelize.query(`
    WITH candidates AS (
      SELECT u.id AS user_id, u.name, ps.weight_kg, ps.repetitions, ps.completed_at, ps.id,
        CASE lower(trim(e.name))
          WHEN 'press banca' THEN 'bench' WHEN 'press de banca' THEN 'bench'
          WHEN 'sentadilla' THEN 'squat' WHEN 'sentadilla con barra' THEN 'squat'
          WHEN 'peso muerto' THEN 'deadlift' WHEN 'peso muerto convencional' THEN 'deadlift'
          WHEN 'peso muerto rumano' THEN 'romanian'
        END AS category
      FROM ${quote(PerformedSet)} ps
      JOIN ${quote(PerformedExercise)} pe ON pe.id = ps.performed_exercise_id
      JOIN ${quote(Exercise)} e ON e.id = pe.exercise_id
      JOIN ${quote(TrainingSession)} s ON s.id = pe.session_id
      JOIN ${quote(User)} u ON u.id = s.user_id
      WHERE e.created_by_user_id IS NULL AND s.status = 'COMPLETED' AND ps.weight_kg > 0 AND ps.repetitions > 0
        AND u.deleted_at IS NULL AND s.deleted_at IS NULL AND pe.deleted_at IS NULL AND ps.deleted_at IS NULL AND e.deleted_at IS NULL
    ), best AS (
      SELECT *, row_number() OVER (PARTITION BY category, user_id ORDER BY weight_kg DESC, repetitions DESC, completed_at ASC, id ASC) AS personal_best
      FROM candidates WHERE category IS NOT NULL
    )
    SELECT category, user_id AS "userId", name, weight_kg AS "weightKg", repetitions, completed_at AS "achievedAt",
      dense_rank() OVER (PARTITION BY category ORDER BY weight_kg DESC) AS rank
    FROM best WHERE personal_best = 1
    ORDER BY category, weight_kg DESC, repetitions DESC, name ASC, user_id ASC
  `, { type: QueryTypes.SELECT });
  const definitions = [{key:'bench',name:'Press de banca'}, {key:'squat',name:'Sentadilla'}, {key:'deadlift',name:'Peso muerto'}, {key:'romanian',name:'Peso muerto rumano'}];
  res.json({ exercises: definitions.map(exercise => ({ ...exercise, users: rows.filter(row => row.category === exercise.key).map(row => ({ userId:row.userId, name:row.name, weightKg:Number(row.weightKg), repetitions:row.repetitions, achievedAt:row.achievedAt, rank:Number(row.rank), isCurrentUser:row.userId === req.auth.sub })) })) });
});

// GET /summary: Ejecuta consultas independientes en paralelo; los totales no dependen del límite de sesiones recientes.
progressRouter.get("/summary", async (req, res) => {
  const [sessions, weights, records, totalCalories, completedSessions] = await Promise.all([
    TrainingSession.findAll({ where: { userId: req.auth.sub, status: "COMPLETED" }, order: [["startedAt", "DESC"]], limit: 12 }),
    BodyWeightHistory.findAll({ where: { userId: req.auth.sub }, order: [["recordedAt", "DESC"]], limit: 30 }),
    StrengthRecord.findAll({ where: { userId: req.auth.sub }, include: [{ model: Exercise, as: "exercise", paranoid:false }], order: [["estimatedOneRm", "DESC"]], limit: 8 }),
    TrainingSession.sum('calories', { where: { userId: req.auth.sub, status: 'COMPLETED' } }),
    TrainingSession.count({ where: { userId: req.auth.sub, status: 'COMPLETED' } }),
  ]);
  res.json({ sessions, weights: weights.reverse(), records, totalCalories: Number(totalCalories || 0), completedSessions });
});

// POST /weight: Agrega una medición; el peso actual se obtiene del historial, sin columna duplicada.
progressRouter.post("/weight", async (req, res) => {
  const { weightKg, recordedAt } = z.object({ weightKg: z.number().positive().max(500), recordedAt: z.string().datetime().refine(value => new Date(value).getTime() <= Date.now(), 'La fecha no puede ser futura').optional() }).parse(req.body);
  const entry = await sequelize.transaction(async (transaction) => {
    // Serializa pesajes por usuario. No sobrescribe ni borra mediciones anteriores.
    const user = await User.findByPk(req.auth.sub, { transaction, lock:transaction.LOCK.UPDATE });
    if (!user) throw Object.assign(new Error('Usuario no encontrado'),{status:404});
    const date = recordedAt ? new Date(recordedAt) : new Date();
    const measurement = await BodyWeightHistory.create({ userId:req.auth.sub, weightKg, recordedAt:date }, { transaction });
    return measurement;
  });
  res.status(201).json(entry);
});
