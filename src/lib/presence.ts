// ============================================================
// Presence helpers — pure, unit-testable, no I/O.
//
// Mirrors the `member_presence` table from migration
// 20260704000000_member_presence.sql. The DB stores only what the
// active client reports ('online' / 'away'); "offline" is never
// stored — it is derived here from staleness so a closed tab
// resolves to offline without an unload write.
// ============================================================

/** How often the active client heartbeats its own presence row. */
export const HEARTBEAT_MS = 30_000;

/**
 * A member whose last heartbeat is older than this is treated as
 * offline regardless of its stored status. ~2.5 missed beats, so a
 * single dropped heartbeat doesn't flap a member offline.
 */
export const OFFLINE_AFTER_MS = 75_000;

/** No input / hidden tab for this long flips the client to 'away'. */
export const IDLE_AFTER_MS = 5 * 60_000;

/** What the active client reports (and what the DB stores). */
export type StoredPresence = "online" | "away";

/** What a viewer sees — adds the derived 'offline' state. */
export type PresenceStatus = "online" | "away" | "offline";

/** Raw presence row as read from the `member_presence` table. */
export interface PresenceRow {
  status: StoredPresence;
  last_seen_at: string;
}

/**
 * Derive the user-facing presence for a member. A missing row, or a
 * heartbeat staler than OFFLINE_AFTER_MS, reads as offline; otherwise
 * the member's last reported status (online / away) stands.
 */
export function derivePresence(
  stored: StoredPresence | undefined,
  lastSeenAt: string | null | undefined,
  now: number,
): PresenceStatus {
  if (!stored || !lastSeenAt) return "offline";
  const last = new Date(lastSeenAt).getTime();
  if (Number.isNaN(last)) return "offline";
  if (now - last > OFFLINE_AFTER_MS) return "offline";
  return stored;
}

/**
 * Relative "last seen" string for tooltips.
 */
export function formatLastSeen(
  lastSeenAt: string | null | undefined,
  now: number,
): string {
  if (!lastSeenAt) return "há um tempo";
  const last = new Date(lastSeenAt).getTime();
  if (Number.isNaN(last)) return "há um tempo";

  const diff = Math.max(0, now - last);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora mesmo";
  if (mins === 1) return "1 minuto atrás";
  if (mins < 60) return `${mins} minutos atrás`;

  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hora atrás";
  if (hours < 24) return `${hours} horas atrás`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 dia atrás";
  return `${days} dias atrás`;
}

/**
 * Tooltip / aria label for a presence dot, e.g.
 *   "Online — ativo agora"
 *   "Ausente — inativo"
 *   "Offline — visto há 2 horas"
 */
export function presenceLabel(
  status: PresenceStatus,
  lastSeenAt: string | null | undefined,
  now: number,
): string {
  switch (status) {
    case "online":
      return "Online — ativo agora";
    case "away":
      return "Ausente — inativo";
    case "offline":
      return `Offline — visto ${formatLastSeen(lastSeenAt, now)}`;
  }
}

/** Roster header summary, e.g. for "3 online · 1 away · 1 offline". */
export function summarize(statuses: PresenceStatus[]): {
  online: number;
  away: number;
  offline: number;
} {
  const counts = { online: 0, away: 0, offline: 0 };
  for (const s of statuses) counts[s] += 1;
  return counts;
}
