// Resolves the local JWT (issued by server/index.js) into a user object.
// Mirrors `supabase.auth.getUser(token)` used by the Edge Functions.
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const JWT_SECRET = process.env.LOCAL_JWT_SECRET || "vitoria-news-local-dev-secret-2026";

export async function resolveUserFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Authorization required" };
  }
  const token = authHeader.replace("Bearer ", "");
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return { user: null, error: "Invalid authentication" };
  }
  if (!decoded.sub) return { user: null, error: "Invalid authentication" };

  const result = await pool.query(
    "SELECT id, email FROM auth.users WHERE id = $1 AND deleted_at IS NULL",
    [decoded.sub]
  );
  if (result.rows.length === 0) return { user: null, error: "Invalid authentication" };
  return {
    user: { id: result.rows[0].id, email: result.rows[0].email },
    error: null,
  };
}
