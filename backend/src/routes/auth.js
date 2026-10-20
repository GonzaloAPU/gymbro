/**
 * Registro, inicio de sesión y edición del perfil. bcrypt compara hashes sin almacenar la contraseña original; JWT identifica solicitudes posteriores. publicUser excluye el hash de las respuestas.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User, RoutineSchedule, RoutineDay, Routine } from "../models/index.js";
import { sequelize } from '../db.js';
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

// POST /register: Valida los campos, crea el hash bcrypt y devuelve un JWT con siete días de vigencia.
authRouter.post("/register", async (req, res) => {
  const input = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }).parse(req.body);
  const { password, ...profile } = input;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ ...profile, passwordHash });
  const token = jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: "7d" });
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /login: Busca el email y compara la contraseña con su hash; devuelve el mismo error para cuenta ausente o contraseña incorrecta.
authRouter.post("/login", async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: "Email o contrasena incorrectos" });
  }
  const token = jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: publicUser(user) });
});

// GET /me: Devuelve exclusivamente el perfil de la cuenta identificada por el token.
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findByPk(req.auth.sub);
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  res.json(publicUser(user));
});

// PATCH /me: Valida campos opcionales y guarda el perfil. Bloquea la fila del usuario para coordinar descansos y asignaciones simultáneas.
authRouter.patch("/me", requireAuth, async (req, res) => {
  const input = z.object({
    name: z.string().min(2).max(80).optional(),
    goal: z.string().max(160).nullable().optional(),
    heightCm: z.number().int().min(100).max(250).nullable().optional(),
    currentKg: z.number().positive().max(500).nullable().optional(),
    gymName: z.string().max(120).nullable().optional(),
    discipline: z.string().trim().max(120).nullable().optional(),
    photoUrl: z.string().max(750000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable().optional(),
    restDays: z.array(z.number().int().min(0).max(6)).max(7).refine(days => new Set(days).size === days.length).optional(),
  }).parse(req.body);
  const user = await sequelize.transaction(async transaction => {
    const user = await User.findByPk(req.auth.sub, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    if (input.restDays?.length) {
      const conflicts = await RoutineSchedule.count({ where: { weekday: input.restDays }, include: [{ model: RoutineDay, as: 'routineDay', required: true, include: [{ model: Routine, as: 'routine', required: true, where: { userId: user.id } }] }], transaction });
      if (conflicts) throw Object.assign(new Error('Ese día ya tiene rutinas asignadas. Quitá sus horarios antes de marcarlo como descanso.'), { status: 409 });
    }
    await user.update(input, { transaction });
    return user;
  });
  res.json(publicUser(user));
});

/** Convierte el modelo a un objeto y excluye passwordHash antes de enviarlo al navegador. */
function publicUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user.toJSON();
  return safeUser;
}
