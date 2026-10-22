/**
 * Construye la API Express: permite solicitudes del frontend, interpreta JSON y conecta las rutas. El manejador de errores va al final para recibir fallos de las rutas anteriores.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { routinesRouter } from "./routes/routines.js";
import { sessionsRouter } from "./routes/sessions.js";
import { progressRouter } from "./routes/progress.js";
import { exercisesRouter } from "./routes/exercises.js";
import { errorHandler } from "./middleware/error-handler.js";
import {welcomeRouter} from './routes/welcome.js';
import {requireAuth} from './middleware/auth.js';
import {requireActiveAccount} from './middleware/active-account.js';

export const app = express();
// Capacitor sirve los archivos instalados desde https://localhost dentro de Android.
// Conservamos una lista explícita para no abrir la API a cualquier sitio.
app.use(cors({ origin: [config.frontendUrl, 'https://localhost'] }));
// Las fotos se comprimen en el navegador a un máximo de 650.000 caracteres Base64.
// El límite de 1 MB deja margen para el resto de los campos del perfil en el JSON.
app.use(express.json({ limit: '1mb' }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "smartgymbro-api" }));
app.use('/api',(req,res,next)=>{
  if(['/auth/register','/auth/login'].includes(req.path))return next();
  requireAuth(req,res,()=>requireActiveAccount(req,res,next));
});
app.use("/api/auth", authRouter);
app.use("/api/routines", routinesRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/exercises", exercisesRouter);
app.use('/api/welcome',welcomeRouter);
app.use(errorHandler);
