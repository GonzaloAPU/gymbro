/**
 * Lee variables del entorno y define valores de desarrollo. process.env contiene la configuración del proceso; Number convierte el puerto de texto a número.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
};
