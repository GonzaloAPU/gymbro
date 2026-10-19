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
