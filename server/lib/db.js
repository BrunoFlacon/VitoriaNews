// Shared pg Pool singleton for the local "functions" runtime.
// Mirrors the connection config used by server/index.js.
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.LOCAL_DB_HOST || "localhost",
  port: parseInt(process.env.LOCAL_DB_PORT || "5433"),
  database: process.env.LOCAL_DB_NAME || "ghtkdkauseesambzqfrd",
  user: process.env.LOCAL_DB_USER || "postgres",
  password: process.env.LOCAL_DB_PASS || "123456",
  max: 10,
});
