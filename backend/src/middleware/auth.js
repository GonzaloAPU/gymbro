import jwt from "jsonwebtoken";
import { config } from "../config.js";

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
