import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
};
