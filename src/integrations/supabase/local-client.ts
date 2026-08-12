const API_BASE = "/api";
const TOKEN_KEY = "sc_local_auth_token";

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function executeFetch(
  table: string,
  params?: Record<string, string>,
  method: string = "GET",
  body?: any,
  id?: string
): Promise<{ data: any; error: any }> {
  try {
    let url = `${API_BASE}/${table}`;
    if (id) url += `/${id}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += (url.includes("/") ? "?" : "?") + qs;
    }

    const opts: RequestInit & { headers?: Record<string, string> } = {};
    if (method === "POST" || method === "PATCH") {
      opts.method = method;
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body || {});
    }
    if (method === "DELETE") {
      opts.method = "DELETE";
    }

    const token = getStoredToken();
    if (token) {
      opts.headers = { ...(opts.headers || {}), Authorization: `Bearer ${token}` };
    }

    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`HTTP ${res.status}: ${text}`);
      (err as any).status = res.status;
      return { data: null, error: err };
    }
    const data = await res.json();
    return { data: Array.isArray(data) ? data : data.rows || data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

function selectQuery(table: string, columns?: string) {
  const filters: Array<{ type: string; col?: string; op?: string; val: any }> = [];
  let orderCol = "";
  let orderAsc = true;
  let limitVal = 0;
  let offsetVal = 0;

  const buildParams = () => {
    const p: Record<string, string> = {};
    if (columns && columns !== "*") p.select = columns;

    const byType = (t: string) => filters.filter(f => f.type === t);
    const toObj = (arr: any[]) => Object.fromEntries(arr.map(f => [f.col, f.val]));

    const eq = byType("eq");
    if (eq.length) p.eq = JSON.stringify(toObj(eq));

    const neq = byType("neq");
    if (neq.length) p.neq = JSON.stringify(toObj(neq));

    const gt = byType("gt");
    if (gt.length) p.gt = JSON.stringify(toObj(gt));

    const gte = byType("gte");
    if (gte.length) p.gte = JSON.stringify(toObj(gte));

    const lt = byType("lt");
    if (lt.length) p.lt = JSON.stringify(toObj(lt));

    const lte = byType("lte");
    if (lte.length) p.lte = JSON.stringify(toObj(lte));

    const like = byType("like");
    if (like.length) p.like = JSON.stringify(toObj(like));

    const isNull = byType("is");
    if (isNull.length) p.is = JSON.stringify(toObj(isNull));

    const inFilters = byType("in");
    if (inFilters.length) p.in = JSON.stringify(toObj(inFilters));

    const orFilters = byType("or");
    if (orFilters.length) p.or = orFilters.map(f => f.val).join(",");

    const notFilters = byType("not");
    if (notFilters.length) p.not = JSON.stringify(notFilters.map(f => ({ col: f.col, op: f.op, val: f.val })));

    if (orderCol) { p.order = orderCol; p.asc = String(orderAsc); }
    if (limitVal) p.limit = String(limitVal);
    if (offsetVal) p.offset = String(offsetVal);
    return p;
  };

  const run = () => executeFetch(table, buildParams());

  const self: any = {
    eq: (col: string, val: any) => { filters.push({ type: "eq", col, val }); return self; },
    neq: (col: string, val: any) => { filters.push({ type: "neq", col, val }); return self; },
    gt: (col: string, val: any) => { filters.push({ type: "gt", col, val }); return self; },
    gte: (col: string, val: any) => { filters.push({ type: "gte", col, val }); return self; },
    lt: (col: string, val: any) => { filters.push({ type: "lt", col, val }); return self; },
    lte: (col: string, val: any) => { filters.push({ type: "lte", col, val }); return self; },
    like: (col: string, val: any) => { filters.push({ type: "like", col, val }); return self; },
    is: (col: string, val: any) => { filters.push({ type: "is", col, val }); return self; },
    in: (col: string, val: any) => { filters.push({ type: "in", col, val }); return self; },
    or: (val: string) => { filters.push({ type: "or", val }); return self; },
    not: (col: string, op: string, val: any) => { filters.push({ type: "not", col, op, val }); return self; },
    order: (col: string, opts?: { ascending?: boolean }) => { orderCol = col; orderAsc = opts?.ascending ?? true; return self; },
    limit: (n: number) => { limitVal = n; return self; },
    offset: (n: number) => { offsetVal = n; return self; },
    single: async () => { const r = await run(); return { data: Array.isArray(r.data) ? r.data[0] || null : r.data, error: r.error }; },
    maybeSingle: async () => { const r = await run(); return { data: Array.isArray(r.data) ? r.data[0] || null : r.data, error: r.error }; },
    then: (resolve: Function, reject?: Function) => run().then(resolve, reject),
    catch: (rej: Function) => run().then((d: any) => d, rej),
  };
  return self;
}

function filterBuilder(table: string, method: string, body?: any) {
  const filters: Array<{ type: string; col: string; val: any }> = [];
  const buildParams = () => {
    const p: Record<string, string> = {};

    const byType = (t: string) => filters.filter(f => f.type === t);
    const toObj = (arr: any[]) => Object.fromEntries(arr.map(f => [f.col, f.val]));

    const eq = byType("eq");
    if (eq.length) p.eq = JSON.stringify(toObj(eq));

    const neq = byType("neq");
    if (neq.length) p.neq = JSON.stringify(toObj(neq));

    const inF = byType("in");
    if (inF.length) p.in = JSON.stringify(toObj(inF));

    const gt = byType("gt");
    if (gt.length) p.gt = JSON.stringify(toObj(gt));

    const gte = byType("gte");
    if (gte.length) p.gte = JSON.stringify(toObj(gte));

    const lt = byType("lt");
    if (lt.length) p.lt = JSON.stringify(toObj(lt));

    const lte = byType("lte");
    if (lte.length) p.lte = JSON.stringify(toObj(lte));

    const like = byType("like");
    if (like.length) p.like = JSON.stringify(toObj(like));

    const isNull = byType("is");
    if (isNull.length) p.is = JSON.stringify(toObj(isNull));

    return p;
  };
  const self: any = {
    eq: async (col: string, val: any) => {
      filters.push({ type: "eq", col, val });
      if (method === "DELETE") {
        if (col === "id") return executeFetch(table, undefined, "DELETE", undefined, val);
        return executeFetch(table, buildParams(), "DELETE");
      }
      if (col === "id") {
        return executeFetch(table, undefined, method === "GET" ? "GET" : "PATCH", body, val);
      }
      if (method === "GET") {
        return executeFetch(table, buildParams());
      }
      return executeFetch(table, buildParams(), "PATCH", body);
    },
    single: async () => {
      const r = await executeFetch(table, Object.keys(buildParams()).length ? buildParams() : undefined);
      return { data: Array.isArray(r.data) ? r.data[0] || null : r.data, error: r.error };
    },
    then: (resolve: Function, reject?: Function) => {
      return executeFetch(table, Object.keys(buildParams()).length ? buildParams() : undefined).then(resolve, reject);
    },
  };
  return self;
}

const authCallbacks: Array<(...args: any[]) => void> = [];

function notifyAuth(event: string, session: any) {
  authCallbacks.forEach(cb => { try { cb(event, session); } catch {} });
}

async function authFetch(path: string, body?: any): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function decodeToken(token: string): any {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch { return null; }
}

function buildSession(token: string, user: any) {
  const decoded = decodeToken(token);
  return {
    access_token: token,
    refresh_token: token,
    expires_in: 86400,
    expires_at: decoded?.exp || Math.floor(Date.now() / 1000) + 86400,
    token_type: "bearer",
    user,
  };
}

export const localDb = {
  from: (table: string) => ({
    select: (columns?: string) => selectQuery(table, columns),
    insert: async (values: any) => {
      const result = await executeFetch(table, undefined, "POST", Array.isArray(values) ? values[0] : values);
      if (result.data && !Array.isArray(result.data)) result.data = [result.data];
      return result;
    },
    update: (values: any) => filterBuilder(table, "PATCH", values),
    delete: () => filterBuilder(table, "DELETE"),
    upsert: async (values: any) => {
      if (values.id) {
        return executeFetch(table, undefined, "PATCH", values, values.id);
      }
      const result = await executeFetch(table, undefined, "POST", values);
      if (result.data && !Array.isArray(result.data)) result.data = [result.data];
      return result;
    },
  }),
  rpc: async (fn: string, params?: any) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/rpc/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params || {}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return { data: null, error: new Error(json?.error || `HTTP ${res.status}`) };
      }
      return { data: json.data ?? json, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
  channel: () => {
    const self = {
      on: () => self,
      subscribe: () => {},
      unsubscribe: () => {},
    };
    return self;
  },
  removeChannel: async () => {},
  auth: {
    getSession: async () => {
      const token = getStoredToken();
      if (!token) return { data: { session: null }, error: null };

      const result = await authFetch("/user");
      if (result?.data?.user) {
        return { data: { session: buildSession(token, result.data.user) }, error: null };
      }
      setStoredToken(null);
      return { data: { session: null }, error: null };
    },
    setSession: async () => {
      const token = getStoredToken();
      if (!token) return { data: { session: null }, error: null };
      const result = await authFetch("/user");
      if (result?.data?.user) {
        return { data: { session: buildSession(token, result.data.user) }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const result = await authFetch("/signin", { email, password });
      if (result.error) {
        return { data: { user: null, session: null }, error: new Error(result.message || result.error) };
      }
      const { user, session } = result.data;
      setStoredToken(session.access_token);
      notifyAuth("SIGNED_IN", session);
      return { data: { user, session }, error: null };
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      const result = await authFetch("/signup", { email, password, options });
      if (result.error) {
        return { data: { user: null, session: null }, error: new Error(result.message || result.error) };
      }
      const { user, session } = result.data;
      setStoredToken(session.access_token);
      notifyAuth("SIGNED_IN", session);
      return { data: { user, session }, error: null };
    },
    signInWithOAuth: async () => {
      return { data: { provider: "google" }, error: null };
    },
    signInWithOtp: async () => {
      return { data: null, error: new Error("OTP nao disponivel em modo local") };
    },
    verifyOtp: async () => {
      return { data: null, error: new Error("OTP nao disponivel em modo local") };
    },
    signOut: async () => {
      setStoredToken(null);
      notifyAuth("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange: (cb: (...args: any[]) => void) => {
      authCallbacks.push(cb);
      const token = getStoredToken();
      if (token) {
        const decoded = decodeToken(token);
        if (decoded?.sub) {
          const user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            aud: decoded.aud,
          };
          setTimeout(() => cb("SIGNED_IN", buildSession(token, user)), 0);
        }
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getUser: async () => {
      const result = await authFetch("/user");
      return result;
    },
    refreshSession: async () => {
      const token = getStoredToken();
      if (!token) return { data: { session: null }, error: null };
      const result = await authFetch("/user");
      if (result?.data?.user) {
        return { data: { session: buildSession(token, result.data.user) }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    resetPasswordForEmail: async () => ({ data: null, error: null }),
    updateUser: async () => ({ data: { user: null }, error: null }),
  },
  storage: {
    from: (bucket: string) => {
      const BUCKET = bucket;

      const authHeaders = () => {
        const token = getStoredToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      };

      const absUrl = (path: string) =>
        `${window.location.origin}/api/storage/${BUCKET}/${path.replace(/^\//, '')}`;

      const api = {
        upload: async (path: string, fileBody: any, fileOptions?: any) => {
          try {
            const fd = new FormData();
            fd.append("file", fileBody);
            if (fileOptions?.cacheControl) fd.append("cacheControl", fileOptions.cacheControl);
            if (fileOptions?.upsert) fd.append("upsert", "true");

            const res = await fetch(`/api/storage/${BUCKET}/${path}`, {
              method: "POST",
              headers: authHeaders(),
              body: fd,
            });

            if (!res.ok) {
              const text = await res.text();
              return { data: null, error: new Error(`Upload ${res.status}: ${text}`) };
            }

            const result = await res.json();
            return { data: result.data, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        download: async (path: string) => {
          try {
            const res = await fetch(`/api/storage/${BUCKET}/${path}`, {
              headers: authHeaders(),
            });
            if (!res.ok) {
              return { data: null, error: new Error(`Download ${res.status}`) };
            }
            const blob = await res.blob();
            return { data: blob, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        getPublicUrl: (path: string) => ({
          data: { publicUrl: absUrl(path) },
        }),

        list: async (prefix?: string, options?: any) => {
          try {
            const params = new URLSearchParams();
            if (prefix) params.set("prefix", prefix);
            if (options?.limit) params.set("limit", String(options.limit));
            if (options?.offset) params.set("offset", String(options.offset));

            const qs = params.toString();
            const res = await fetch(`/api/storage/${BUCKET}${qs ? `?${qs}` : ""}`, {
              headers: authHeaders(),
            });

            if (!res.ok) {
              return { data: null, error: new Error(`List ${res.status}`) };
            }

            const result = await res.json();
            return { data: result.data || [], error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        remove: async (paths: string[]) => {
          try {
            if (paths.length === 1) {
              const res = await fetch(`/api/storage/${BUCKET}/${paths[0]}`, {
                method: "DELETE",
                headers: authHeaders(),
              });
              if (!res.ok) {
                const text = await res.text();
                return { data: null, error: new Error(`Delete ${res.status}: ${text}`) };
              }
              const result = await res.json();
              return { data: result.data, error: null };
            }

            // Multi-file delete via batch endpoint
            const res = await fetch("/api/storage/batch-delete", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ bucket: BUCKET, paths }),
            });
            if (!res.ok) {
              return { data: null, error: new Error(`Batch delete ${res.status}`) };
            }
            const result = await res.json();
            return { data: result.data, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        createSignedUrl: async (path: string, _expiresIn: number) => ({
          data: { signedUrl: absUrl(path) },
          error: null,
        }),

        createSignedUrls: async (paths: string[], _expiresIn: number) => ({
          data: paths.map((p) => ({ error: null, path: p, signedUrl: absUrl(p) })),
          error: null,
        }),

        update: async (path: string, fileBody: any, fileOptions?: any) =>
          api.upload(path, fileBody, { ...fileOptions, upsert: true }),

        info: async (path: string) => {
          try {
            const res = await fetch(`/api/storage/${BUCKET}/${path}`, {
              method: "HEAD",
              headers: authHeaders(),
            });
            if (!res.ok) {
              return { data: null, error: new Error(`Info ${res.status}`) };
            }
            return {
              data: {
                name: path,
                bucketId: BUCKET,
                contentType: res.headers.get("Content-Type") || "application/octet-stream",
                size: parseInt(res.headers.get("Content-Length") || "0"),
                updatedAt: res.headers.get("Last-Modified") || new Date().toISOString(),
              },
              error: null,
            };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        exists: async (path: string) => {
          try {
            const res = await fetch(`/api/storage/${BUCKET}/${path}`, {
              method: "HEAD",
              headers: authHeaders(),
            });
            return { data: res.ok, error: null };
          } catch {
            return { data: false, error: null };
          }
        },

        copy: async () => ({ data: null, error: new Error("copy not supported in local mode") }),
        move: async () => ({ data: null, error: new Error("move not supported in local mode") }),
      };

      return api;
    },
  },
  functions: {
    invoke: async (name: string, opts?: { body?: any; headers?: any; method?: string }) => {
      try {
        const token = getStoredToken();
        const res = await fetch(`/api/functions/${name}`, {
          method: opts?.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opts?.headers || {}),
          },
          body: JSON.stringify(opts?.body || {}),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const err = new Error(data?.error || `HTTP ${res.status}`);
          (err as any).status = res.status;
          return { data: null, error: err };
        }
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
  },

  // Exposed so legacy code using `(supabase as any).functionsUrl` resolves locally.
  functionsUrl: "/api/functions",
};