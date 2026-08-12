// Minimal PostgREST-style Supabase client shim built on top of our local pg Pool.
// Goal: let ported Edge Functions keep using `supabase.from("table").select/insert/upsert/update/delete`
// exactly as they did on Deno, without rewriting every query.
import { pool } from "./db.js";

function safeIdent(name) {
  if (typeof name !== "string" || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table/column name: ${name}`);
  }
  return '"' + name + '"';
}

function buildWhere(where) {
  if (!where.length) return { clause: "", params: [] };
  const params = [];
  let paramIdx = 1;
  const clause =
    " WHERE " +
    where.map((w) => {
      if (w.op === "IN") {
        const arr = Array.isArray(w.val) ? w.val : [w.val];
        if (arr.length === 0) {
          // IN () is always false
          return `${safeIdent(w.col)} IN (NULL)`;
        }
        const phs = arr.map(() => `$${paramIdx++}`);
        params.push(...arr);
        return `${safeIdent(w.col)} IN (${phs.join(", ")})`;
      }
      params.push(w.val);
      return `${safeIdent(w.col)} ${w.op} $${paramIdx++}`;
    })
    .join(" AND ");
  return { clause, params };
}

function makeBuilder(table) {
  const state = {
    selectCols: "*",
    where: [],
    limitVal: null,
    orderCol: null,
    orderAsc: true,
    action: null, // 'select' | 'insert' | 'upsert' | 'update' | 'delete'
    payload: null,
    onConflict: null,
    single: false,
    maybeSingle: false,
  };

  const api = {
    select(cols) {
      // Only set action to "select" if no action is pending (e.g., insert/upsert may precede select)
      if (!state.action) state.action = "select";
      if (cols && cols !== "*") {
        const plain = cols
          .split(",")
          .map((c) => c.trim())
          .filter((c) => /^[a-zA-Z_][a-zA-Z0-9_]*(\s+as\s+[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(c));
        state.selectCols = plain.length ? plain.map(safeIdent).join(", ") : "*";
      }
      return api;
    },
    insert(rows) {
      state.action = "insert";
      state.payload = Array.isArray(rows) ? rows : [rows];
      return api;
    },
    upsert(rows, opts) {
      state.action = "upsert";
      state.payload = Array.isArray(rows) ? rows : [rows];
      state.onConflict = opts?.onConflict || null;
      return api;
    },
    update(obj) {
      state.action = "update";
      state.payload = obj;
      return api;
    },
    delete() {
      state.action = "delete";
      return api;
    },
    eq(col, val) {
      state.where.push({ col, op: "=", val });
      return api;
    },
    neq(col, val) {
      state.where.push({ col, op: "<>", val });
      return api;
    },
    gt(col, val) {
      state.where.push({ col, op: ">", val });
      return api;
    },
    gte(col, val) {
      state.where.push({ col, op: ">=", val });
      return api;
    },
    lt(col, val) {
      state.where.push({ col, op: "<", val });
      return api;
    },
    lte(col, val) {
      state.where.push({ col, op: "<=", val });
      return api;
    },
    in(col, vals) {
      const arr = Array.isArray(vals) ? vals : [vals];
      state.where.push({ col, op: "IN", val: arr });
      return api;
    },
    ilike(col, val) {
      state.where.push({ col, op: "ILIKE", val });
      return api;
    },
    limit(n) {
      state.limitVal = n;
      return api;
    },
    order(col, opts) {
      state.orderCol = col;
      state.orderAsc = opts?.ascending ?? true;
      return api;
    },
    single() {
      state.single = true;
      return api;
    },
    maybeSingle() {
      state.maybeSingle = true;
      return api;
    },

    async then(resolve, reject) {
      try {
        const result = await run();
        resolve(result);
      } catch (err) {
        if (reject) reject(err);
        else throw err;
      }
    },
  };

  async function run() {
    const { clause, params } = buildWhere(state.where);
    let sql = "";
    let queryParams = [...params];

    if (state.action === "select") {
      sql = `SELECT ${state.selectCols} FROM ${safeIdent(table)}${clause}`;
      if (state.orderCol) {
        sql += ` ORDER BY ${safeIdent(state.orderCol)} ${state.orderAsc ? "ASC" : "DESC"}`;
      }
      if (state.limitVal) {
        sql += ` LIMIT $${queryParams.length + 1}`;
        queryParams.push(state.limitVal);
      }
    } else if (state.action === "insert") {
      const cols = Object.keys(state.payload[0]);
      const placeholders = state.payload.map(
        (_, r) =>
          "(" +
          cols.map((_, c) => `$${r * cols.length + c + 1}`).join(", ") +
          ")"
      );
      const values = state.payload.flatMap((row) => cols.map((c) => row[c]));
      sql = `INSERT INTO ${safeIdent(table)} (${cols.map(safeIdent).join(", ")}) VALUES ${placeholders} RETURNING *`;
      queryParams = values;
    } else if (state.action === "upsert") {
      const cols = Object.keys(state.payload[0]);
      const placeholders = state.payload.map(
        (_, r) =>
          "(" +
          cols.map((_, c) => `$${r * cols.length + c + 1}`).join(", ") +
          ")"
      );
      const values = state.payload.flatMap((row) => cols.map((c) => row[c]));
      sql = `INSERT INTO ${safeIdent(table)} (${cols.map(safeIdent).join(", ")}) VALUES ${placeholders}`;
      const updates = cols
        .filter((c) => c !== "id" && c !== "created_at")
        .map((c) => `${safeIdent(c)} = EXCLUDED.${safeIdent(c)}`)
        .join(", ");
      sql += ` ON CONFLICT (${state.onConflict ? state.onConflict.split(",").map(safeIdent).join(", ") : "id"}) DO UPDATE SET ${updates} RETURNING *`;
      queryParams = values;
    } else if (state.action === "update") {
      const cols = Object.keys(state.payload).filter((c) => c !== "id" && c !== "created_at");
      const offset = params.length; // WHERE params come first
      const sets = cols.map((c, i) => `${safeIdent(c)} = $${offset + i + 1}`);
      sql = `UPDATE ${safeIdent(table)} SET ${sets.join(", ")}${clause} RETURNING *`;
      queryParams = [...queryParams, ...cols.map((c) => state.payload[c])];
    } else if (state.action === "delete") {
      sql = `DELETE FROM ${safeIdent(table)}${clause} RETURNING *`;
    }

    const result = await pool.query(sql, queryParams);

    let rows = result.rows;
    if (state.single && rows.length === 0) return { data: null, error: { message: "No rows found" } };
    if (state.maybeSingle && rows.length === 0) return { data: null, error: null };
    const data = state.single || state.maybeSingle ? rows[0] || null : rows;
    return { data, error: null };
  }

  return api;
}

export function createSupabaseShim() {
  return {
    from(table) {
      return makeBuilder(table);
    },
    // Some functions use supabase.auth.getUser(token) — replaced by functionsAuth resolver.
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
