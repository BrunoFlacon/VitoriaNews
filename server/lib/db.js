// Shared pg Pool singleton for the local "functions" runtime.
// Reads from .env via dotenv — change SUPABASE_URL/LOCAL_DB_* there.
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load .env from project root (one level up from server/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.LOCAL_DB_HOST || "localhost",
  port: parseInt(process.env.LOCAL_DB_PORT || "5433"),
  database: process.env.LOCAL_DB_NAME || "social_canvas",
  user: process.env.LOCAL_DB_USER || "postgres",
  password: process.env.LOCAL_DB_PASS || "123456",
  max: 10,
});
