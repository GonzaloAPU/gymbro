/**
 * Crea la conexión compartida de Sequelize con PostgreSQL. DATABASE_URL indica servidor, puerto y credenciales; underscored traduce nombres como userId a columnas user_id.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import "dotenv/config";
import { Sequelize } from "sequelize";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no esta configurada");
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.SQL_LOGGING === "true" ? console.log : false,
  define: {
    underscored: true,
  },
});
