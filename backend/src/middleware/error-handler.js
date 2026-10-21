/** Devuelve códigos 400/409 para validaciones o conflictos y usa el estado del error para los demás fallos. */
/**
 * Traduce errores de validación, restricciones SQL y errores de negocio a respuestas HTTP JSON. Los cuatro parámetros identifican a este middleware como manejador de errores de Express.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error?.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ message: error.errors?.some(item => item.path === "email") ? "El email ya está registrado" : "Ese registro ya existe. Revisá los datos antes de volver a guardarlo." });
  }
  if (error?.name === "SequelizeValidationError") {
    return res.status(400).json({ message: "Datos invalidos", issues: error.errors });
  }
  if (error?.name === "ZodError") {
    return res.status(400).json({ message: "Datos invalidos", issues: error.issues });
  }
  res.status(error.status || 500).json({ message: error.message || "Error interno" });
}
