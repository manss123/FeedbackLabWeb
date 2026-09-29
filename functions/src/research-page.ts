import { FieldPath, Timestamp, type Firestore, type Query } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export const RESEARCH_PAGE_SIZE = 200;
type Position = { id: string; seconds: number; nanoseconds: number };
interface Cursor {
  from: string;
  to: string;
  asOf: number;
  users?: string | null;
  sessions?: Position | null;
  events?: Position | null;
}
function bad(): never {
  throw new HttpsError("invalid-argument", "Invalid date range or cursor");
}
function day(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return bad();
  const ms = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return bad();
  return value;
}
export function parseResearchPage(input: unknown, now = Date.now()): Cursor {
  if (!input || typeof input !== "object") return bad();
  const data = input as Record<string, unknown>;
  const from = day(data.from),
    to = day(data.to);
  if (from > to) return bad();
  if (data.cursor == null) return { from, to, asOf: now };
  if (typeof data.cursor !== "string" || data.cursor.length > 8000) return bad();
  let cursor: Cursor;
  try {
    cursor = JSON.parse(Buffer.from(data.cursor, "base64url").toString("utf8"));
  } catch {
    return bad();
  }
  if (
    !cursor ||
    cursor.from !== from ||
    cursor.to !== to ||
    !Number.isSafeInteger(cursor.asOf) ||
    cursor.asOf > now ||
    cursor.asOf < 0
  )
    return bad();
  const idValid = (id: unknown) =>
    typeof id === "string" && id.length > 0 && id.length <= 1500 && !id.includes("/");
  if (cursor.users !== null && !idValid(cursor.users)) return bad();
  for (const position of [cursor.events, cursor.sessions]) {
    if (position === null) continue;
    if (
      !position ||
      !idValid(position.id) ||
      !Number.isSafeInteger(position.seconds) ||
      position.seconds < 0 ||
      position.seconds > 253402300799 ||
      !Number.isInteger(position.nanoseconds) ||
      position.nanoseconds < 0 ||
      position.nanoseconds >= 1e9
    )
      return bad();
  }
  return cursor;
}

export async function readResearchPage(db: Firestore, input: unknown) {
  const cursor = parseResearchPage(input);
  const start = Timestamp.fromMillis(Date.parse(cursor.from + "T00:00:00+07:00"));
  const end = Timestamp.fromMillis(Date.parse(cursor.to + "T00:00:00+07:00") + 86400000);
  const ceiling = Timestamp.fromMillis(cursor.asOf);
  async function timed(collection: string, position?: Position | null) {
    if (position === null) return { rows: [], next: null };
    let query: Query = db
      .collection(collection)
      .where("createdAt", ">=", start)
      .where("createdAt", "<", end)
      .where("createdAt", "<=", ceiling)
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (position)
      query = query.startAfter(new Timestamp(position.seconds, position.nanoseconds), position.id);
    const snapshot = await query.limit(RESEARCH_PAGE_SIZE + 1).get();
    const docs = snapshot.docs.slice(0, RESEARCH_PAGE_SIZE);
    const last = docs.at(-1);
    const time = last?.get("createdAt") as Timestamp | undefined;
    return {
      rows: docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      next:
        snapshot.size > RESEARCH_PAGE_SIZE && last && time
          ? { id: last.id, seconds: time.seconds, nanoseconds: time.nanoseconds }
          : null,
    };
  }
  async function users() {
    if (cursor.users === null) return { rows: [], next: null };
    let query: Query = db.collection("users").orderBy(FieldPath.documentId());
    if (cursor.users) query = query.startAfter(cursor.users);
    const snapshot = await query.limit(RESEARCH_PAGE_SIZE + 1).get();
    const docs = snapshot.docs.slice(0, RESEARCH_PAGE_SIZE);
    return {
      rows: docs.map((doc) => ({ ...doc.data(), uid: doc.id })),
      next: snapshot.size > RESEARCH_PAGE_SIZE ? docs.at(-1)!.id : null,
    };
  }
  const [profiles, sessions, events] = await Promise.all([
    users(),
    timed("sessions", cursor.sessions),
    timed("activity_log", cursor.events),
  ]);
  const next: Cursor = {
    ...cursor,
    users: profiles.next,
    sessions: sessions.next,
    events: events.next,
  };
  return {
    users: profiles.rows,
    sessions: sessions.rows,
    events: events.rows,
    asOf: new Date(cursor.asOf).toISOString(),
    nextCursor: [next.users, next.sessions, next.events].some((value) => value !== null)
      ? Buffer.from(JSON.stringify(next)).toString("base64url")
      : null,
  };
}
