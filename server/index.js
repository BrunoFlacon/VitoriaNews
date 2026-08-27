import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Local "Edge Functions" runtime (ported from supabase/functions)
import { getFunction } from "./functions/registry.js";
import { createSupabaseShim } from "./lib/supabaseShim.js";
import { resolveUserFromAuth } from "./lib/functionsAuth.js";
import { handleWebhook, ensureWebhookTable } from "./lib/webhooks.js";
import { corsHeaders as fnCors } from "./lib/fnShared.js";

const { Pool } = pg;
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.LOCAL_DB_HOST || "localhost",
  port: parseInt(process.env.LOCAL_DB_PORT || "5433"),
  database: process.env.LOCAL_DB_NAME || "social_canvas",
  user: process.env.LOCAL_DB_USER || "postgres",
  password: process.env.LOCAL_DB_PASS || "123456",
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 as ok");
    res.json({ status: "ok", db: result.rows[0].ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Image Proxy (bypasses Supabase Storage 402) ──────────────────
// In local mode (VITE_USE_LOCAL_DB=true), all Supabase storage URLs
// and CDN URLs are proxied through this endpoint instead of going
// directly to Supabase (which returns 402 Payment Required).
//
// Flow:
//   1. Supabase storage URL → check local cache → try platform API
//   2. External CDN URL     → fetch directly (bypasses media-relay)
//   3. Fallback → 204 No Content (frontend shows initials, not "?")
app.get("/api/proxy-image", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || typeof imageUrl !== "string") {
    return res.status(400).end();
  }

  try {
    // CASE 1: Supabase Storage URL
    // Format: https://*.supabase.co/storage/v1/object/public/{bucket}/{path}
    const storageMatch = imageUrl.match(/\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (storageMatch) {
      const bucket = storageMatch[1];
      const filePath = decodeURIComponent(storageMatch[2]);

      // 1a. Check local cache first
      const localPath = path.resolve(STORAGE_BASE, bucket, filePath);
      if (localPath.startsWith(path.resolve(STORAGE_BASE)) && fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        const contentType = getMimeType(localPath);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Content-Length", stat.size);
        fs.createReadStream(localPath).pipe(res);
        return;
      }

      // 1b. WhatsApp profile-photos → try Graph API using stored WABA token
      if (bucket === "profile-photos" && filePath.startsWith("whatsapp/")) {
        const waId = filePath.split("/")[1]?.replace(/\.\w+$/, "");
        if (waId) {
          const photo = await fetchPlatformPhoto("whatsapp", waId);
          if (photo) {
            cacheLocally(localPath, photo.data);
            res.setHeader("Content-Type", photo.contentType);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.end(photo.data);
          }
        }
      }

      // 1c. Instagram profile photos (media/profiles/instagram/) → Graph API
      if ((bucket === "profile-photos" || bucket === "media") && filePath.includes("profiles/instagram/")) {
        const igId = filePath.split("/").pop()?.replace(/\.\w+$/, "");
        if (igId) {
          const photo = await fetchPlatformPhoto("instagram", igId);
          if (photo) {
            cacheLocally(localPath, photo.data);
            res.setHeader("Content-Type", photo.contentType);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.end(photo.data);
          }
        }
      }

      // 1d. Threads profile photos (media/profiles/threads/) → Graph API
      if ((bucket === "profile-photos" || bucket === "media") && filePath.includes("profiles/threads/")) {
        const threadsId = filePath.split("/").pop()?.replace(/\.\w+$/, "");
        if (threadsId) {
          const photo = await fetchPlatformPhoto("threads", threadsId);
          if (photo) {
            cacheLocally(localPath, photo.data);
            res.setHeader("Content-Type", photo.contentType);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.end(photo.data);
          }
        }
      }

      // 1e. Facebook profile photos (media/profiles/facebook/) → Graph API
      if ((bucket === "profile-photos" || bucket === "media") && filePath.includes("profiles/facebook/")) {
        const fbId = filePath.split("/").pop()?.replace(/\.\w+$/, "");
        if (fbId) {
          const photo = await fetchPlatformPhoto("facebook", fbId);
          if (photo) {
            cacheLocally(localPath, photo.data);
            res.setHeader("Content-Type", photo.contentType);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.end(photo.data);
          }
        }
      }

      // Not found in cache or API — 204 No Content (triggers initials fallback)
      return res.status(204).end();
    }

    // CASE 2: External CDN URL (fbcdn, googleusercontent, etc.)
    // Fetch directly instead of going through Supabase media-relay
    const decodedUrl = decodeURIComponent(imageUrl);
    if (decodedUrl.startsWith("http://") || decodedUrl.startsWith("https://")) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const resp = await fetch(decodedUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": "https://www.facebook.com/",
          },
          // Follow redirects (e.g., fbcdn redirects)
          redirect: "follow",
        });

        clearTimeout(timeout);

        if (resp.ok) {
          const buffer = Buffer.from(await resp.arrayBuffer());
          const contentType = resp.headers.get("content-type") || getMimeType(decodedUrl) || "image/jpeg";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("Access-Control-Allow-Origin", "*");
          return res.end(buffer);
        }
      } catch {
        clearTimeout(timeout);
      }
    }

    // All strategies exhausted — 204 No Content
    return res.status(204).end();
  } catch (err) {
    console.error("[proxy-image]", err.message);
    return res.status(204).end();
  }
});

// ─── Helpers for Image Proxy ──────────────────────────────────────

function cacheLocally(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data);
  } catch (e) {
    // Non-critical: cache miss is OK
  }
}

async function fetchPlatformPhoto(platform, platformUserId) {
  try {
    // Query social_connections for a matching platform user ID or any connection with a token
    const result = await pool.query(
      `SELECT access_token, phone_number_id FROM social_connections
       WHERE platform = $1 AND is_connected = true AND access_token IS NOT NULL
       ORDER BY
         CASE WHEN platform_user_id = $2 THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 1`,
      [platform, platformUserId]
    );
    if (result.rows.length === 0) return null;

    const { access_token, phone_number_id } = result.rows[0];
    if (!access_token) return null;

    let photoUrl = null;

    if (platform === "whatsapp") {
      // WhatsApp: try business profile endpoint with phone_number_id
      if (phone_number_id) {
        try {
          const bpRes = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}/whatsapp_business_profile?fields=profile_picture_url&access_token=${access_token}`
          );
          if (bpRes.ok) {
            const bpData = await bpRes.json();
            photoUrl = bpData.data?.[0]?.profile_picture_url || bpData.profile_picture_url;
          }
        } catch {}
      }

      // Fallback: try the phone number node directly
      if (!photoUrl && phone_number_id) {
        try {
          const pnRes = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}?fields=profile_photo_url&access_token=${access_token}`
          );
          if (pnRes.ok) {
            const pnData = await pnRes.json();
            photoUrl = pnData.profile_photo_url;
          }
        } catch {}
      }

      // Last resort: try platform user as a page/account
      if (!photoUrl && platformUserId) {
        try {
          const pageRes = await fetch(
            `https://graph.facebook.com/v21.0/${platformUserId}/picture?redirect=false&type=large&access_token=${access_token}`
          );
          if (pageRes.ok) {
            const pageData = await pageRes.json();
            photoUrl = pageData.data?.url;
          }
        } catch {}
      }
    } else if (platform === "facebook" || platform === "instagram" || platform === "threads") {
      // Facebook/Instagram/Threads: try the /picture endpoint
      try {
        const picRes = await fetch(
          `https://graph.facebook.com/v21.0/${platformUserId}/picture?redirect=false&type=large&access_token=${access_token}`
        );
        if (picRes.ok) {
          const picData = await picRes.json();
          photoUrl = picData.data?.url;
        }
      } catch {}
    }

    if (!photoUrl) return null;

    // Download the actual image from the resolved URL
    const imgRes = await fetch(photoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.facebook.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!imgRes.ok) return null;

    const data = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    return { data, contentType };
  } catch (err) {
    console.warn(`[proxy-image:${platform}]`, err.message);
    return null;
  }
}

// ─── Local Storage (file system) ───────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_BASE = path.join(__dirname, "storage");

// Ensure base storage directory exists
if (!fs.existsSync(STORAGE_BASE)) {
  fs.mkdirSync(STORAGE_BASE, { recursive: true });
}

// Multer disk storage — files go to STORAGE_BASE/<bucket>/<dir(s)>
// Express 5 + path-to-regexp v8: *filePath captures the rest as ARRAY of segments.
// Use filePathSegments() helper to convert to string path.
const fpStr = (req) => {
  const fp = req.params.filePath;
  return Array.isArray(fp) ? fp.join("/") : (fp || "");
};

// ─── Physical media file cleanup ────────────────────────────────
// The local DB and the Express server are separate processes, so a DB
// trigger cannot delete files from the server's disk. We delete the
// physical file here, in the application layer, whenever a `media`
// row is removed.
function extractMediaRelPath(record) {
  if (!record) return null;
  // 1. Explicit storage path
  if (record.storage_path) return String(record.storage_path).replace(/^\/+/, "");
  const url = record.file_url || "";
  if (!url) return null;
  // 2. Relative path already (e.g. "user-uuid/file.png")
  if (!/^https?:\/\//i.test(url)) return url.replace(/^\/+/, "");
  // 3. Supabase URL: .../object/(public|sign|authenticated)/media/<path>
  const m = url.match(/\/object\/(?:public|sign|authenticated)\/media\/(.+?)(?:\?|$)/);
  if (m) return decodeURIComponent(m[1]).replace(/^\/+/, "");
  return null;
}

function deleteMediaFileOnDisk(record) {
  const rel = extractMediaRelPath(record);
  if (!rel) return;
  const full = path.resolve(STORAGE_BASE, "media", rel);
  const base = path.resolve(STORAGE_BASE);
  if (!full.startsWith(base) || !fs.existsSync(full)) return;
  try {
    fs.unlinkSync(full);
    // Clean empty parent directories
    let dir = path.dirname(full);
    while (dir.startsWith(base) && dir !== base) {
      try {
        const entries = fs.readdirSync(dir);
        if (entries.length === 0) {
          fs.rmdirSync(dir);
          dir = path.dirname(dir);
        } else break;
      } catch {
        break;
      }
    }
  } catch {
    /* ignore cleanup errors */
  }
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket;
    const filePath = fpStr(req);
    const dir = path.join(STORAGE_BASE, bucket, path.dirname(filePath));
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      return cb(e, dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const filePath = fpStr(req);
    cb(null, path.basename(filePath));
  },
});

const storageUpload = multer({
  storage: multerStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogv": "video/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".css": "text/css",
  ".js": "application/javascript",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

// ─── Storage API Routes (MUST be before generic /api/:table) ─────

// List files in a bucket (optional ?prefix=)
app.get("/api/storage/:bucket", async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const prefix = req.query.prefix || "";
    const bucketDir = path.join(STORAGE_BASE, bucket, prefix);
    const resolved = path.resolve(bucketDir);

    if (!resolved.startsWith(path.resolve(STORAGE_BASE))) {
      return res.status(403).json({ error: "Access denied", data: null });
    }

    if (!fs.existsSync(resolved)) {
      return res.json({ data: [], error: null });
    }

    const files = [];

    function walk(dir, relativePath) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath
          ? path.join(relativePath, entry.name).replace(/\\/g, "/")
          : entry.name;
        if (entry.isDirectory()) {
          walk(fullPath, relPath);
        } else {
          let stat;
          try {
            stat = fs.statSync(fullPath);
          } catch {
            continue;
          }
          files.push({
            name: relPath,
            bucket_id: bucket,
            owner: "",
            id: relPath,
            updated_at: stat.mtime.toISOString(),
            created_at: stat.birthtime.toISOString(),
            last_accessed_at: stat.atime.toISOString(),
            metadata: {
              size: stat.size,
              mimetype: getMimeType(relPath),
            },
          });
        }
      }
    }

    walk(resolved, prefix);
    res.json({ data: files, error: null });
  } catch (err) {
    res.status(500).json({ error: err.message, data: null });
  }
});

// Batch delete  POST /api/storage/batch-delete  body: { bucket, paths: [...] }
// MUST be defined BEFORE the parameterized POST /api/storage/:bucket/* route
app.post("/api/storage/batch-delete", async (req, res) => {
  try {
    const { bucket, paths } = req.body;
    if (!bucket || !Array.isArray(paths)) {
      return res.status(400).json({ error: "bucket and paths[] required", data: null });
    }

    const results = [];
    for (const filePath of paths) {
      const fullPath = path.resolve(STORAGE_BASE, bucket, filePath);
      if (fullPath.startsWith(path.resolve(STORAGE_BASE)) && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        results.push({ bucket_id: bucket, name: filePath });
      }
    }
    res.json({ data: results, error: null });
  } catch (err) {
    res.status(500).json({ error: err.message, data: null });
  }
});

// Upload file  POST /api/storage/:bucket/*filePath
// path-to-regexp v8: *filePath captures the rest as ARRAY in req.params.filePath → use fpStr(req)
app.post("/api/storage/:bucket/*filePath", (req, res) => {
  storageUpload.single("file")(req, res, (err) => {
    if (err) {
      return res
        .status(400)
        .json({ error: err.message, data: null });
    }
    const bucket = req.params.bucket;
    const filePath = fpStr(req);
    res.json({
      data: {
        id: filePath,
        path: filePath,
        fullPath: `${bucket}/${filePath}`,
      },
      error: null,
    });
  });
});

// Serve / download file  GET /api/storage/:bucket/*filePath
app.get("/api/storage/:bucket/*filePath", async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const filePath = fpStr(req);
    const fullPath = path.resolve(STORAGE_BASE, bucket, filePath);

    if (!fullPath.startsWith(path.resolve(STORAGE_BASE))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const contentType = getMimeType(fullPath);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.setHeader("Accept-Ranges", "bytes");
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
      return;
    }

    // File not on disk — 204 No Content (frontend handles with initials)
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file  DELETE /api/storage/:bucket/*filePath
app.delete("/api/storage/:bucket/*filePath", async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const filePath = fpStr(req);
    const fullPath = path.resolve(STORAGE_BASE, bucket, filePath);

    if (!fullPath.startsWith(path.resolve(STORAGE_BASE))) {
      return res.status(403).json({ error: "Access denied", data: null });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found", data: null });
    }

    fs.unlinkSync(fullPath);

    // Clean up empty parent directories
    let dir = path.dirname(fullPath);
    while (dir.startsWith(path.resolve(STORAGE_BASE)) && dir !== path.resolve(STORAGE_BASE)) {
      try {
        const entries = fs.readdirSync(dir);
        if (entries.length === 0) {
          fs.rmdirSync(dir);
          dir = path.dirname(dir);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    res.json({
      data: [{ bucket_id: bucket, name: filePath }],
      error: null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, data: null });
  }
});

const JWT_SECRET = process.env.LOCAL_JWT_SECRET || "social-canvas-hub-local-dev-secret-2026";
const JWT_EXPIRES_IN = "24h";

// ─── Local "Edge Functions" runtime ─────────────────────────────
// Mirrors supabase.functions.invoke(name, { body }). Ported Edge Functions live in
// server/functions/<name>.js and are registered in server/functions/registry.js.
app.options("/api/functions/:name", (req, res) => res.status(204).set(fnCors).end());

app.all("/api/functions/:name", async (req, res) => {
  const name = req.params.name;
  const handler = getFunction(name);
  if (!handler) {
    return res.status(404).set(fnCors).json({ error: `Função local '${name}' não implementada.` });
  }
  try {
    const authHeader = req.headers.authorization || "";
    const { user, error } = await resolveUserFromAuth(authHeader);
    if (error) return res.status(401).set(fnCors).json({ error });

    const supabase = createSupabaseShim();
    const ctx = {
      body: req.body && typeof req.body === "object" ? req.body : {},
      query: req.query || {},
      user,
      supabase,
      headers: req.headers,
    };
    const result = await handler(ctx);
    return res
      .status(result.status || 200)
      .set(result.headers || fnCors)
      .json(result.body);
  } catch (err) {
    console.error(`[functions:${name}]`, err);
    return res.status(500).set(fnCors).json({ error: err?.message || String(err) });
  }
});

// ─── Inbound webhooks (require a public tunnel to be reachable) ──
app.use("/api/webhooks", express.raw({ type: "*/*", limit: "5mb" }));
app.all("/api/webhooks/:platform", (req, res) => handleWebhook(req.params.platform, req, res));

// ─── Auth endpoints ───────────────────────────────────────────────

// Sign Up
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, options } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email e password obrigatorios" });

  try {
    const existing = await pool.query("SELECT id FROM auth.users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email ja cadastrado", message: "User already registered" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const hashed = await bcrypt.hash(password, 10);
    const name = options?.data?.name || email.split("@")[0];

    await pool.query(
      `INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_sent_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $4, $4, 'authenticated', 'authenticated', $4)`,
      [id, email, hashed, now, JSON.stringify({ provider: "email" }), JSON.stringify({ name })]
    );

    // Create profile
    const profileId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO public.profiles (id, user_id, email, name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'admin_master', $5, $5)
       ON CONFLICT (user_id) DO UPDATE SET email = $3, name = $4`,
      [profileId, id, email, name, now]
    );

    const token = jwt.sign(
      { sub: id, email, role: "authenticated", aud: "authenticated", iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const user = { id, email, role: "authenticated", aud: "authenticated", created_at: now };
    const session = {
      access_token: token,
      refresh_token: token,
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: "bearer",
      user,
    };

    res.status(201).json({ data: { user, session }, error: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign In
app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email e password obrigatorios" });

  try {
    const result = await pool.query(
      "SELECT id, email, encrypted_password, raw_user_meta_data, created_at, role, aud FROM auth.users WHERE email = $1 AND deleted_at IS NULL",
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Credenciais invalidas", message: "Invalid login credentials" });
    }

    const row = result.rows[0];
    const valid = await bcrypt.compare(password, row.encrypted_password);
    if (!valid) {
      return res.status(400).json({ error: "Credenciais invalidas", message: "Invalid login credentials" });
    }

    // Update last_sign_in_at
    await pool.query("UPDATE auth.users SET last_sign_in_at = $1 WHERE id = $2", [new Date().toISOString(), row.id]);

    const token = jwt.sign(
      { sub: row.id, email: row.email, role: "authenticated", aud: "authenticated", iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const user = {
      id: row.id,
      email: row.email,
      role: "authenticated",
      aud: "authenticated",
      created_at: row.created_at,
      user_metadata: row.raw_user_meta_data,
    };
    const session = {
      access_token: token,
      refresh_token: token,
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: "bearer",
      user,
    };

    res.json({ data: { user, session }, error: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User from token
app.get("/api/auth/user", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.json({ data: { user: null }, error: null });
  }
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    const result = await pool.query(
      "SELECT id, email, raw_user_meta_data, created_at, role, aud FROM auth.users WHERE id = $1",
      [decoded.sub]
    );
    if (result.rows.length === 0) return res.json({ data: { user: null }, error: null });

    const row = result.rows[0];
    const user = {
      id: row.id,
      email: row.email,
      role: "authenticated",
      aud: "authenticated",
      created_at: row.created_at,
      user_metadata: row.raw_user_meta_data,
    };
    res.json({ data: { user }, error: null });
  } catch {
    res.json({ data: { user: null }, error: null });
  }
});

// Sign Out (stateless com JWT - apenas confirma)
app.post("/api/auth/signout", async (req, res) => {
  res.json({ error: null });
});

// Sign In with OTP (mock para dev local)
app.post("/api/auth/signinwithotp", async (req, res) => {
  res.json({ data: null, error: new Error("OTP nao disponivel em modo local") });
});

// Verify OTP (mock para dev local)
app.post("/api/auth/verifyotp", async (req, res) => {
  res.json({ data: null, error: new Error("OTP nao disponivel em modo local") });
});

// ─── Local DB Console (read-only, dev only) ─────────────────────
// Simple browser-based SQL console bound to localhost.
app.get("/api/db/tables", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.table_name, c.reltuples::bigint AS approx_rows
      FROM information_schema.tables t
      JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    // exact counts per table (sequential but safe for small DBs)
    const tables = [];
    for (const row of result.rows) {
      try {
        const c = await pool.query(`SELECT COUNT(*)::int AS n FROM "${row.table_name.replace(/"/g, '""')}"`);
        tables.push({ name: row.table_name, rows: c.rows[0].n });
      } catch {
        tables.push({ name: row.table_name, rows: row.approx_rows });
      }
    }
    res.json({ tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const BLOCKED_SQL = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|VACUUM|ANALYZE|DO\b)/i;

app.post("/api/db/query", async (req, res) => {
  try {
    const sql = (req.body?.sql || "").trim();
    if (!sql) return res.status(400).json({ error: "SQL vazio" });
    if (BLOCKED_SQL.test(sql)) {
      return res.status(403).json({ error: "Somente consultas SELECT são permitidas (modo read-only)" });
    }
    const started = Date.now();
    const result = await pool.query(sql);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/db-console", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>DB Console — Social Canvas Hub</title>
<style>
  body { font-family: system-ui, Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
  header { padding: 14px 20px; background: #1e293b; border-bottom: 1px solid #334155; }
  header h1 { margin: 0; font-size: 16px; color: #38bdf8; }
  header span { color: #64748b; font-size: 12px; margin-left: 10px; }
  main { padding: 20px; max-width: 1200px; margin: 0 auto; }
  .row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  textarea { width: 100%; height: 120px; background: #0b1220; color: #7dd3fc; border: 1px solid #334155;
    border-radius: 8px; padding: 10px; font-family: Consolas, monospace; font-size: 13px; resize: vertical; }
  button { background: #0284c7; color: white; border: 0; border-radius: 6px; padding: 8px 18px; cursor: pointer; font-weight: 600; }
  button:hover { background: #0369a1; }
  table { border-collapse: collapse; width: 100%; background: #1e293b; border-radius: 8px; overflow: hidden; }
  th, td { border: 1px solid #334155; padding: 6px 10px; font-size: 12px; text-align: left; white-space: nowrap; }
  th { background: #334155; color: #93c5fd; position: sticky; top: 0; }
  td { max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
  .wrap { max-width: 400px; white-space: normal; word-break: break-word; }
  #msg { font-size: 12px; margin-top: 8px; }
  .ok { color: #4ade80; } .err { color: #f87171; }
  .tbl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .chip { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 4px 12px;
    font-size: 12px; cursor: pointer; }
  .chip:hover { border-color: #38bdf8; }
  .chip b { color: #38bdf8; }
  .tables { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin-bottom: 18px; }
  .tcard { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
  .tcard:hover { border-color: #38bdf8; }
  .tcard .tname { font-weight: 600; font-size: 13px; color: #e2e8f0; }
  .tcard .trows { font-size: 11px; color: #64748b; }
  .scroll { max-height: 500px; overflow: auto; border-radius: 8px; }
  pre { background: #0b1220; padding: 12px; border-radius: 8px; overflow: auto; font-size: 12px; }
</style>
</head>
<body>
<header><h1>DB Console — PostgreSQL local (5433)<span>somente leitura · SELECT</span></h1></header>
<main>
  <div id="tables" class="tables"></div>
  <div class="row">
    <textarea id="sql" placeholder="Digite uma consulta SELECT...&#10;Ex: SELECT * FROM social_connections LIMIT 5"></textarea>
  </div>
  <div class="row">
    <button onclick="runQuery()">Executar (Ctrl+Enter)</button>
    <button onclick="clearResult()" style="background:#475569">Limpar</button>
  </div>
  <div id="msg"></div>
  <div id="result"></div>
</main>
<script>
const tablesEl = document.getElementById('tables');
const sqlEl = document.getElementById('sql');
const msgEl = document.getElementById('msg');
const resultEl = document.getElementById('result');

async function loadTables() {
  const r = await fetch('/api/db/tables');
  const data = await r.json();
  if (data.tables) {
    tablesEl.innerHTML = data.tables.map(t =>
      '<div class="tcard" onclick="loadTable(' + JSON.stringify(t.name) + ')">' +
      '<div class="tname">' + escapeHtml(t.name) + '</div>' +
      '<div class="trows">' + t.rows + ' registros</div></div>'
    ).join('');
  }
}

async function loadTable(name) {
  sqlEl.value = 'SELECT * FROM "' + name + '" LIMIT 50';
  runQuery();
}

async function runQuery() {
  const sql = sqlEl.value.trim();
  if (!sql) return;
  msgEl.className = ''; msgEl.textContent = 'Executando...';
  try {
    const r = await fetch('/api/db/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    const data = await r.json();
    if (!r.ok) { msgEl.className = 'err'; msgEl.textContent = 'ERRO: ' + data.error; return; }
    msgEl.className = 'ok';
    msgEl.textContent = data.rowCount + ' linha(s) · ' + data.elapsedMs + 'ms';
    if (data.rows && data.rows.length > 0) {
      const cols = Object.keys(data.rows[0]);
      let html = '<div class="scroll"><table><thead><tr>';
      html += cols.map(c => '<th>' + escapeHtml(c) + '</th>').join('');
      html += '</tr></thead><tbody>';
      data.rows.forEach(row => {
        html += '<tr>' + cols.map(c => {
          let v = row[c];
          if (v === null) v = 'NULL';
          else if (typeof v === 'object') v = JSON.stringify(v);
          else v = String(v);
          const isLong = v.length > 60;
          return '<td class="' + (isLong ? 'wrap' : '') + '">' + escapeHtml(v) + '</td>';
        }).join('') + '</tr>';
      });
      html += '</tbody></table></div>';
      resultEl.innerHTML = html;
    } else {
      resultEl.innerHTML = '<pre>Sem resultados</pre>';
    }
  } catch (e) {
    msgEl.className = 'err'; msgEl.textContent = 'ERRO: ' + e.message;
  }
}

function clearResult() { resultEl.innerHTML = ''; msgEl.textContent = ''; }
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
sqlEl.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') runQuery();
});
loadTables();
</script>
</body>
</html>`);
});

// List tables
app.get("/api/tables", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: SELECT * FROM table
app.get("/api/:table", async (req, res) => {
  const { table } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const query = buildSelect(table, req.query);
    const result = await pool.query(query.sql, query.params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: SELECT by ID
app.get("/api/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const result = await pool.query(
      `SELECT * FROM public.${safeIdent(table)} WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Raw query (for complex operations - MUST be before generic /api/:table)
app.post("/api/query", async (req, res) => {
  const { sql, params } = req.body;
  if (!sql || typeof sql !== "string") return res.status(400).json({ error: "sql required" });

  try {
    const result = await pool.query(sql, params || []);
    res.json({ rows: result.rows, rowCount: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RPC (Remote Procedure Calls) ───────────────────────────────────
// Replaces Supabase's supabase.rpc(fn, params) for local mode.
// Each known function is translated to direct SQL with the user_id from JWT.
app.post("/api/rpc/:name", async (req, res) => {
  const { name } = req.params;
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    switch (name) {
      case "mark_conversation_read":
        await pool.query(
          `UPDATE public.whatsapp_conversations
           SET unread_count = 0, last_read_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [req.body.p_conversation_id, userId]
        );
        return res.json({ data: null });

      case "toggle_pin_conversation": {
        const pinResult = await pool.query(
          `UPDATE public.whatsapp_conversations
           SET is_pinned = NOT is_pinned
           WHERE id = $1 AND user_id = $2
           RETURNING is_pinned`,
          [req.body.p_conversation_id, userId]
        );
        return res.json({ data: pinResult.rows[0]?.is_pinned ?? false });
      }

      case "mute_conversation":
        await pool.query(
          `UPDATE public.whatsapp_conversations
           SET muted_until = NOW() + ($3 || ' hours')::INTERVAL
           WHERE id = $1 AND user_id = $2`,
          [req.body.p_conversation_id, userId, req.body.p_duration_hours || 8]
        );
        return res.json({ data: null });

      case "toggle_disappearing_mode": {
        const dispResult = await pool.query(
          `UPDATE public.whatsapp_conversations
           SET disappearing_mode = NOT disappearing_mode,
               disappearing_duration = $3
           WHERE id = $1 AND user_id = $2
           RETURNING disappearing_mode`,
          [req.body.p_conversation_id, userId, req.body.p_duration || 86400]
        );
        return res.json({ data: dispResult.rows[0]?.disappearing_mode ?? false });
      }

      case "touch_presence":
        await pool.query(
          `INSERT INTO public.member_presence (user_id, account_id, status, last_seen_at)
           VALUES ($1, NULL, $2, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET status = $2, last_seen_at = NOW()`,
          [userId, req.body.p_status || "online"]
        );
        return res.json({ data: null });

      case "increment_quick_reply_usage":
        if (req.body.row_id) {
          await pool.query(
            `UPDATE public.quick_replies SET usage_count = usage_count + 1 WHERE id = $1`,
            [req.body.row_id]
          );
        }
        return res.json({ data: null });

      default:
        // Try to execute the function directly via SQL
        try {
          const paramKeys = Object.keys(req.body || {}).filter(k => k !== "id" && k !== "created_at");
          const paramPlaceholders = paramKeys.map((_, i) => `$${i + 1}`).join(", ");
          const paramValues = paramKeys.map(k => req.body[k]);
          const fnResult = await pool.query(
            `SELECT * FROM public.${name}(${paramPlaceholders})`,
            paramValues
          );
          return res.json({ data: fnResult.rows[0] || null });
        } catch (fallbackErr) {
          return res.status(404).json({ error: `RPC '${name}' não reconhecida: ${fallbackErr.message}` });
        }
    }
  } catch (err) {
    console.error(`[rpc:${name}]`, err);
    return res.status(500).json({ error: err.message });
  }
});

// Specific UPSERT for api_credentials (unique constraint on user_id + platform)
app.post("/api/api_credentials", async (req, res) => {
  const allowed = await validateTable("api_credentials");
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const { user_id, platform, credentials, ...rest } = req.body;
    if (!user_id || !platform) {
      return res.status(400).json({ error: "user_id and platform are required" });
    }
    const result = await pool.query(
      `INSERT INTO public.api_credentials (user_id, platform, credentials)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, platform)
       DO UPDATE SET credentials = $3, updated_at = now()
       RETURNING *`,
      [user_id, platform, JSON.stringify(credentials || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[api_credentials POST]", err.message, err.stack?.split("\n")[1]);
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: INSERT
app.post("/api/:table", async (req, res) => {
  const { table } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const { columns, values, placeholders } = buildInsert(table, req.body);
    const result = await pool.query(
      `INSERT INTO public.${safeIdent(table)} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: UPDATE by ID
app.patch("/api/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const { sets, values } = buildUpdate(table, req.body, id);
    const result = await pool.query(
      `UPDATE public.${safeIdent(table)} SET ${sets} WHERE id = $1 RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: UPDATE with query filters
app.patch("/api/:table", async (req, res) => {
  const { table } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const bodyKeys = Object.keys(req.body).filter(k => k !== "id" && k !== "created_at");

    // Parse filters like buildSelect does
    const whereClauses = [];
    const values = [...bodyKeys.map(k => req.body[k])];
    let idx = bodyKeys.length + 1;

    function addFilters(obj, op) {
      if (!obj) return;
      for (const [key, val] of Object.entries(JSON.parse(obj))) {
        whereClauses.push(`${safeIdent(key)} ${op} $${idx++}`);
        values.push(val);
      }
    }

    addFilters(req.query.eq, "=");
    addFilters(req.query.neq, "<>");
    addFilters(req.query.gt, ">");
    addFilters(req.query.gte, ">=");
    addFilters(req.query.lt, "<");
    addFilters(req.query.lte, "<=");
    addFilters(req.query.like, "LIKE");

    if (req.query.in) {
      for (const [key, vals] of Object.entries(JSON.parse(req.query.in))) {
        if (Array.isArray(vals) && vals.length > 0) {
          const placeholders = vals.map(() => `$${idx++}`).join(", ");
          whereClauses.push(`${safeIdent(key)} IN (${placeholders})`);
          values.push(...vals);
        }
      }
    }

    if (req.query.is) {
      for (const [key, val] of Object.entries(JSON.parse(req.query.is))) {
        if (val === null) whereClauses.push(`${safeIdent(key)} IS NULL`);
        else whereClauses.push(`${safeIdent(key)} IS NOT NULL`);
      }
    }

    if (whereClauses.length === 0) return res.status(400).json({ error: "Filtro obrigatorio (ex: ?eq={\"user_id\":\"xxx\"})" });

    const setClauses = bodyKeys.map((k, i) => `${safeIdent(k)} = $${i + 1}`);

    const result = await pool.query(
      `UPDATE public.${safeIdent(table)} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")} RETURNING *`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: DELETE by ID
app.delete("/api/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    // Fetch the row first so we can clean up its physical file (media)
    let recordToDelete = null;
    if (table === "media") {
      const r = await pool.query(`SELECT * FROM public."media" WHERE id = $1`, [id]);
      recordToDelete = r.rows[0] || null;
    }

    const result = await pool.query(
      `DELETE FROM public.${safeIdent(table)} WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

    if (recordToDelete) deleteMediaFileOnDisk(recordToDelete);

    res.json({ deleted: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic CRUD: DELETE with query filters
app.delete("/api/:table", async (req, res) => {
  const { table } = req.params;
  const allowed = await validateTable(table);
  if (!allowed) return res.status(400).json({ error: "Invalid table" });

  try {
    const whereClauses = [];
    const values = [];
    let idx = 1;

    function addFilters(obj, op) {
      if (!obj) return;
      for (const [key, val] of Object.entries(JSON.parse(obj))) {
        whereClauses.push(`${safeIdent(key)} ${op} $${idx++}`);
        values.push(val);
      }
    }

    addFilters(req.query.eq, "=");
    addFilters(req.query.neq, "<>");

    if (whereClauses.length === 0) return res.status(400).json({ error: "Filtro obrigatorio (ex: ?eq={\"user_id\":\"xxx\"})" });

    // Fetch the rows first so we can clean up their physical files (media)
    let recordsToDelete = [];
    if (table === "media") {
      const r = await pool.query(
        `SELECT * FROM public."media" WHERE ${whereClauses.join(" AND ")}`,
        values
      );
      recordsToDelete = r.rows;
    }

    const result = await pool.query(
      `DELETE FROM public.${safeIdent(table)} WHERE ${whereClauses.join(" AND ")} RETURNING id`,
      values
    );

    recordsToDelete.forEach(deleteMediaFileOnDisk);

    res.json({ deleted: result.rows.map(r => r.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Helpers ----------

function safeIdent(name) {
  return '"' + name.replace(/[^a-zA-Z0-9_]/g, "") + '"';
}

function extractUserId(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.user_id || decoded.sub || null;
  } catch {
    return null;
  }
}

async function validateTable(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return false;
  const result = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
    [name]
  );
  return result.rows.length > 0;
}

// Converte filtro PostgREST-style (ex: "scheduled_at.gte.2026-06-08") para SQL
function pgFilterToSql(filter) {
  filter = filter.trim();
  // and(...) / or(...) grouping
  if (/^(and|or)\(.*\)$/i.test(filter)) {
    const isAnd = filter.toLowerCase().startsWith('and');
    const inner = filter.slice(isAnd ? 4 : 3, -1);
    const parts = splitPgOr(inner);
    const clauses = parts.map(p => pgFilterToSql(p.trim()));
    return '(' + clauses.join(isAnd ? ' AND ' : ' OR ') + ')';
  }
  // column.op.value
  const m = filter.match(/^(.+?)\.([a-z]+)\.(.+)$/);
  if (!m) return filter; // fallback — trata como raw SQL
  const col = safeIdent(m[1]);
  const op = m[2];
  let val = m[3];
  const opMap = { eq:'=', neq:'<>', gt:'>', gte:'>=', lt:'<', lte:'<=', like:'LIKE', ilike:'ILIKE' };
  if (op === 'is') return `${col} IS ${val === 'null' ? 'NULL' : 'NOT NULL'}`;
  if (op === 'in') return `${col} IN (${val.split(',').map(v => `'${v.replace(/'/g,"''")}'`).join(',')})`;
  const sqlOp = opMap[op] || '=';
  return `${col} ${sqlOp} '${val.replace(/'/g,"''")}'`;
}

// Divide string por vírgulas respeitando parênteses aninhados
function splitPgOr(str) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

function parsePostgrestOr(orStr) {
  const parts = splitPgOr(orStr.trim());
  const clauses = parts.map(p => pgFilterToSql(p.trim()));
  return clauses.join(' OR ');
}

function buildSelect(table, query) {
  const sql = [`SELECT * FROM public.${safeIdent(table)}`];
  const params = [];
  let idx = 1;

  if (query.select) {
    let raw = query.select.replace(/\s+/g, " ").trim();
    // Remove nested subqueries como "permissions(name)" ou "social_connections(platform, name)"
    raw = raw.replace(/\w+\s*\([^)]*\)/g, "").trim();
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    const plainCols = parts.filter(p => /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?(\s+as\s+[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(p));
    if (plainCols.length > 0) {
      const cols = plainCols.map(c => safeIdent(c)).join(", ");
      sql[0] = `SELECT ${cols} FROM public.${safeIdent(table)}`;
    }
  }

  function addFilter(obj, op) {
    if (!obj) return;
    for (const [key, val] of Object.entries(JSON.parse(obj))) {
      sql.push(`AND ${safeIdent(key)} ${op} $${idx++}`);
      params.push(val);
    }
  }

  addFilter(query.eq, "=");
  addFilter(query.neq, "<>");
  addFilter(query.gt, ">");
  addFilter(query.gte, ">=");
  addFilter(query.lt, "<");
  addFilter(query.lte, "<=");
  addFilter(query.like, "LIKE");

  if (query.is) {
    for (const [key, val] of Object.entries(JSON.parse(query.is))) {
      if (val === null) sql.push(`AND ${safeIdent(key)} IS NULL`);
      else sql.push(`AND ${safeIdent(key)} IS NOT NULL`);
    }
  }

  if (query.in) {
    for (const [key, vals] of Object.entries(JSON.parse(query.in))) {
      const arr = Array.isArray(vals) ? vals : [vals];
      const placeholders = arr.map(() => `$${idx++}`);
      params.push(...arr);
      sql.push(`AND ${safeIdent(key)} IN (${placeholders.join(",")})`);
    }
  }

  if (query.or) {
    sql.push(`AND (${parsePostgrestOr(query.or)})`);
  }

  if (query.not) {
    const notArr = JSON.parse(query.not);
    for (const item of notArr) {
      if (item.op === "is") {
        // IS NULL / IS NOT NULL não aceitam placeholder $1 no PostgreSQL
        const suffix = item.val === null ? "NULL" : "NOT NULL";
        sql.push(`AND NOT (${safeIdent(item.col)} IS ${suffix})`);
      } else {
        sql.push(`AND NOT (${safeIdent(item.col)} = $${idx++})`);
        params.push(item.val);
      }
    }
  }

  if (sql.length > 1) sql[0] += " WHERE 1=1 ";

  if (query.order) {
    const dir = query.asc === "false" ? "DESC" : "ASC";
    sql.push(`ORDER BY ${safeIdent(query.order)} ${dir}`);
  }

  if (query.limit) {
    sql.push(`LIMIT $${idx++}`);
    params.push(parseInt(query.limit));
  }

  if (query.offset) {
    sql.push(`OFFSET $${idx++}`);
    params.push(parseInt(query.offset));
  }

  return { sql: sql.join(" "), params };
}

function buildInsert(table, body) {
  const columns = Object.keys(body)
    .filter(k => k !== "id")
    .map(k => safeIdent(k));
  const values = columns.map(k => body[k.replace(/"/g, "")]);
  const placeholders = values.map((_, i) => `$${i + 1}`);
  return { columns: columns.join(", "), values, placeholders: placeholders.join(", ") };
}

function buildUpdate(table, body, id) {
  const keys = Object.keys(body).filter(k => k !== "id" && k !== "created_at");
  const sets = keys.map((k, i) => `${safeIdent(k)} = $${i + 2}`);
  const values = [id, ...keys.map(k => body[k])];
  return { sets: sets.join(", "), values };
}



// ─── Scheduler: token refresh + periodic sync ───────────────────
// node-cron style job without extra deps: refresh tokens expiring within 30 min.
async function runTokenRefreshCron() {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT user_id, platform
       FROM social_connections
       WHERE refresh_token IS NOT NULL
         AND (token_expires_at IS NULL OR token_expires_at < now() + interval '30 minutes')`
    );
    for (const { user_id, platform } of rows) {
      try {
        const u = await pool.query("SELECT id, email FROM auth.users WHERE id = $1 AND deleted_at IS NULL", [user_id]);
        if (!u.rows.length) continue;
        const user = { id: u.rows[0].id, email: u.rows[0].email };
        const supabase = createSupabaseShim();
        const refreshSocialToken = (await import("./functions/refresh-social-token.js")).default;
        await refreshSocialToken({ body: { platform }, user, supabase });
        console.log(`[cron] token refreshed: ${platform} (${user_id})`);
      } catch (e) {
        console.warn(`[cron] refresh failed ${platform}:`, e?.message || e);
      }
    }
  } catch (e) {
    console.warn("[cron] error:", e?.message || e);
  }
}

// Initialize local runtime tables and start the scheduler.
ensureWebhookTable()
  .then(() => console.log("Tabela webhook_events pronta."))
  .catch((e) => console.warn("webhook table:", e?.message));

runTokenRefreshCron(); // run once at startup
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
setInterval(runTokenRefreshCron, REFRESH_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Local DB API rodando em http://localhost:${PORT}`);
  console.log(`Database: ${pool.options.database}@${pool.options.host}:${pool.options.port}`);
  console.log(`Scheduler de tokens: a cada ${REFRESH_INTERVAL_MS / 60000} min`);
});
