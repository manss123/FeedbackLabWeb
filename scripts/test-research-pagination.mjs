import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { Timestamp } = require("firebase-admin/firestore");
const { readResearchPage, parseResearchPage } = require("./lib/research-page.js");

const compare = (a, b) =>
  a instanceof Timestamp
    ? a.seconds - b.seconds || a.nanoseconds - b.nanoseconds
    : String(a).localeCompare(String(b));
function database(data) {
  const reads = [];
  class Query {
    constructor(name, filters = [], order = [], after = null, limit = null) {
      Object.assign(this, { name, filters, order, after, cap: limit });
    }
    where(...filter) {
      return new Query(this.name, [...this.filters, filter], this.order, this.after, this.cap);
    }
    orderBy(field, direction = "asc") {
      return new Query(
        this.name,
        this.filters,
        [...this.order, [typeof field === "string" ? field : "__name__", direction]],
        this.after,
        this.cap,
      );
    }
    startAfter(...after) {
      return new Query(this.name, this.filters, this.order, after, this.cap);
    }
    limit(cap) {
      return new Query(this.name, this.filters, this.order, this.after, cap);
    }
    async get() {
      assert.equal(this.cap, 201, "every database read must be bounded");
      const value = (row, field) => (field === "__name__" ? row.id : row[field]);
      const cmp = (a, b) => {
        for (const [field, dir] of this.order) {
          const c = compare(value(a, field), value(b, field)) * (dir === "desc" ? -1 : 1);
          if (c) return c;
        }
        return 0;
      };
      let rows = (data[this.name] || [])
        .filter((row) =>
          this.filters.every(([field, op, bound]) => {
            if (!(row[field] instanceof Timestamp)) return false;
            const c = compare(row[field], bound);
            return op === ">=" ? c >= 0 : op === "<" ? c < 0 : c <= 0;
          }),
        )
        .sort(cmp);
      if (this.after) {
        const anchor = {};
        this.order.forEach(([field], i) => {
          anchor[field === "__name__" ? "id" : field] = this.after[i];
        });
        rows = rows.filter((row) => cmp(row, anchor) > 0);
      }
      rows = rows.slice(0, this.cap);
      reads.push({ collection: this.name, count: rows.length });
      return {
        size: rows.length,
        docs: rows.map((row) => ({
          id: row.id,
          get: (field) => row[field],
          data: () => {
            const { id, ...rest } = row;
            return rest;
          },
        })),
      };
    }
  }
  return { collection: (name) => new Query(name), reads };
}

test("server pages bound reads, preserve timestamp ties and nanoseconds, and skip completed collections", async () => {
  const seconds = Date.parse("2026-09-16T12:00:00Z") / 1000;
  const events = Array.from({ length: 405 }, (_, i) => ({
    id: `event-${String(i).padStart(4, "0")}`,
    createdAt: new Timestamp(seconds, i % 2),
  }));
  const db = database({ users: [{ id: "u1" }], sessions: [], activity_log: events });
  const input = { from: "2026-09-16", to: "2026-09-16" };
  let cursor = null,
    all = [],
    pages = 0,
    asOf;
  do {
    const page = await readResearchPage(db, { ...input, cursor });
    all.push(...page.events);
    cursor = page.nextCursor;
    pages++;
    asOf ??= page.asOf;
    assert.equal(page.asOf, asOf);
  } while (cursor);
  assert.equal(pages, 3);
  assert.equal(all.length, 405);
  assert.equal(new Set(all.map((e) => e.id)).size, 405);
  assert.equal(db.reads.filter((r) => r.collection === "users").length, 1);
  assert.equal(db.reads.filter((r) => r.collection === "sessions").length, 1);
});

test("Bangkok date query includes start and final instant, excludes next day and undated records", async () => {
  const db = database({
    activity_log: [
      { id: "before", createdAt: Timestamp.fromMillis(Date.parse("2026-09-15T16:59:59Z")) },
      { id: "start", createdAt: Timestamp.fromMillis(Date.parse("2026-09-15T17:00:00Z")) },
      {
        id: "last",
        createdAt: new Timestamp(Date.parse("2026-09-16T16:59:59Z") / 1000, 999999999),
      },
      { id: "after", createdAt: Timestamp.fromMillis(Date.parse("2026-09-16T17:00:00Z")) },
      { id: "missing" },
    ],
  });
  const page = await readResearchPage(db, { from: "2026-09-16", to: "2026-09-16" });
  assert.deepEqual(
    page.events.map((e) => e.id),
    ["last", "start"],
  );
  assert.equal(page.nextCursor, null);
});

test("invalid dates, reversed ranges and cross-range/invalid cursors fail before any reads", () => {
  for (const input of [
    {},
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-09-17", to: "2026-09-16" },
    { from: "2026-09-16", to: "2026-09-16", cursor: "bad" },
  ])
    assert.throws(
      () => parseResearchPage(input),
      (e) => e.code === "invalid-argument",
    );
  const cursor = Buffer.from(
    JSON.stringify({
      from: "2026-09-15",
      to: "2026-09-16",
      asOf: Date.now(),
      users: null,
      sessions: null,
      events: null,
    }),
  ).toString("base64url");
  assert.throws(() => parseResearchPage({ from: "2026-09-16", to: "2026-09-16", cursor }));
});

test("new events after the first page ceiling cannot shift subsequent pages", async () => {
  const time = Timestamp.fromMillis(Date.parse("2026-09-16T12:00:00Z"));
  const source = {
    activity_log: Array.from({ length: 201 }, (_, i) => ({
      id: String(i).padStart(3, "0"),
      createdAt: time,
    })),
  };
  const db = database(source),
    input = { from: "2026-09-16", to: "2099-01-01" };
  const first = await readResearchPage(db, input);
  source.activity_log.push({
    id: "new",
    createdAt: Timestamp.fromMillis(Date.parse(first.asOf) + 1000),
  });
  const second = await readResearchPage(db, { ...input, cursor: first.nextCursor });
  assert.equal(second.events.length, 1);
  assert.equal(second.nextCursor, null);
  assert.equal(
    second.events.some((e) => e.id === "new"),
    false,
  );
});
