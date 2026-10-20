/**
 * Catálogo compartido de ejercicios: exige autenticación, valida nuevos ejercicios y permite filtrar el listado por tipo y grupo muscular.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Router } from "express";
import { z } from "zod";
import { Exercise } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { sequelize } from '../db.js';

export const exercisesRouter = Router();
exercisesRouter.use(requireAuth);

// POST /: Crea un ejercicio tras validar su forma y comprobar duplicados sin distinguir mayúsculas.
exercisesRouter.post('/', async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(255),
    muscleGroup: z.string().trim().min(2).max(255),
    equipment: z.string().trim().min(2).max(255),
    movementPattern: z.string().trim().max(255).nullable().optional(),
    trainingType: z.enum(['POWER', 'AEROBIC', 'ANAEROBIC']),
  }).parse(req.body);
  const existing = await Exercise.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), input.name.toLowerCase()) });
  if (existing) return res.status(409).json({ message: 'Ya existe un ejercicio con ese nombre. Podés seleccionarlo del catálogo.' });
  const exercise = await Exercise.create({ ...input, movementPattern: input.movementPattern || null });
  res.status(201).json(exercise);
});

// GET /: Lista el catálogo aplicando filtros opcionales y un orden estable para la interfaz.
exercisesRouter.get("/", async (req, res) => {
  const filters = z.object({
    trainingType: z.enum(["POWER", "AEROBIC", "ANAEROBIC"]).optional(),
    muscleGroup: z.string().min(1).optional(),
  }).parse(req.query);
  const exercises = await Exercise.findAll({
    where: filters,
    order: [["trainingType", "ASC"], ["muscleGroup", "ASC"], ["name", "ASC"]],
  });
  res.json(exercises);
});
