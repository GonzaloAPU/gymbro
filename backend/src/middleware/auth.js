/**
 * Middleware de autenticación del servidor. Verifica la firma y vencimiento del JWT recibido por Authorization y expone sus datos en req.auth; sub identifica al usuario.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import jwt from "jsonwebtoken";
import { config } from "../config.js";

/** Extrae y verifica el token; next continúa hacia la ruta solo si la autenticación es válida. */
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Autenticacion requerida" });

  try {
    req.auth = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Token invalido o vencido" });
  }
}
