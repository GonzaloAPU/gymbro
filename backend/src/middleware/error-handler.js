export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error?.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ message: "El email ya esta registrado" });
  }
  if (error?.name === "SequelizeValidationError") {
    return res.status(400).json({ message: "Datos invalidos", issues: error.errors });
  }
  if (error?.name === "ZodError") {
    return res.status(400).json({ message: "Datos invalidos", issues: error.issues });
  }
  res.status(error.status || 500).json({ message: error.message || "Error interno" });
}
