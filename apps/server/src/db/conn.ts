import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
export const migrationClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
  { max: 1 }
);
export const postgresClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres"
);
export const dbConn = drizzle(postgresClient);
