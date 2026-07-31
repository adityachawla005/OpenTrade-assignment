/**
 * SQLite storage. The swipe log is the single source of truth — every number
 * on the dashboard is derived by replaying it through the mSPRT engine, so
 * there is no cached statistic that can drift out of sync with the raw data.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { CARDS, variantHash } from "./cards";

export interface SwipeRow {
  id: number;
  card_id: string;
  variant: "A" | "B";
  user_id: string;
  backed: 0 | 1;
  source: "ui" | "sim";
  /**
   * Hash of the copy this swipe actually saw. A verdict counts only rows whose
   * hash matches the variant's live copy, so editing a card cannot silently
   * pool two different treatments under one label.
   */
  content_hash: string;
  /**
   * Whether a user who backed the card was still holding a week later.
   * NULL when the swipe was a pass (nothing to retain) or when the outcome is
   * not yet known — real UI swipes have no follow-up, so only simulated
   * traffic carries this.
   */
  retained: 0 | 1 | null;
  created_at: number;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "swipe-ab.db");

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS swipes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id    TEXT    NOT NULL,
      variant    TEXT    NOT NULL CHECK (variant IN ('A','B')),
      user_id    TEXT    NOT NULL,
      backed     INTEGER NOT NULL CHECK (backed IN (0,1)),
      source     TEXT    NOT NULL DEFAULT 'ui',
      content_hash TEXT  NOT NULL DEFAULT '',
      retained   INTEGER CHECK (retained IN (0,1)),
      created_at INTEGER NOT NULL
    );

    -- Ordering for replay. id is monotonic, so it doubles as arrival order.
    CREATE INDEX IF NOT EXISTS idx_swipes_card_id ON swipes (card_id, id);

    -- Experiment hygiene: one user contributes at most one observation per
    -- card. Without this a user re-swiping the same card would be counted
    -- repeatedly and inflate the apparent sample size.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_swipes_user_card
      ON swipes (user_id, card_id);
  `);

  migrateContentHash(db);
  migrateRetained(db);

  instance = db;
  return db;
}

/**
 * Adds `content_hash` to a pre-existing table and backfills it.
 *
 * Backfill assigns each legacy row the CURRENT hash of the variant it was
 * recorded under. That is correct for the data these rows actually are: they
 * were collected before content hashing existed, which means they were
 * collected under the copy that is still live today — no edit has happened in
 * between, because an edit is exactly what this column was added to detect.
 * Treating them as archived instead would silently discard a valid sample.
 */
function migrateContentHash(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(swipes)`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((c) => c.name === "content_hash")) {
    db.exec(`ALTER TABLE swipes ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''`);
  }

  const legacy = db
    .prepare(`SELECT COUNT(*) AS n FROM swipes WHERE content_hash = ''`)
    .get() as { n: number };
  if (legacy.n === 0) return;

  const update = db.prepare(
    `UPDATE swipes SET content_hash = ?
      WHERE card_id = ? AND variant = ? AND content_hash = ''`,
  );
  db.transaction(() => {
    for (const card of CARDS) {
      update.run(variantHash(card, "A"), card.id, "A");
      update.run(variantHash(card, "B"), card.id, "B");
    }
  })();
}

/** Adds the `retained` column to a pre-existing table. */
function migrateRetained(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(swipes)`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((c) => c.name === "retained")) {
    db.exec(`ALTER TABLE swipes ADD COLUMN retained INTEGER`);
  }
}

/**
 * Record a swipe. Returns false if this user already swiped this card, in
 * which case nothing is written (first swipe wins).
 */
export function insertSwipe(
  cardId: string,
  variant: "A" | "B",
  userId: string,
  backed: boolean,
  contentHash: string,
  source: "ui" | "sim" = "ui",
): boolean {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO swipes
       (card_id, variant, user_id, backed, source, content_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const info = stmt.run(
    cardId,
    variant,
    userId,
    backed ? 1 : 0,
    source,
    contentHash,
    Date.now(),
  );
  return info.changes > 0;
}

/** Batch insert inside a transaction — used by the simulator. */
export function insertSwipeBatch(
  rows: Array<{
    cardId: string;
    variant: "A" | "B";
    userId: string;
    backed: boolean;
    contentHash: string;
    retained: boolean | null;
  }>,
  source: "ui" | "sim" = "sim",
): number {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO swipes
       (card_id, variant, user_id, backed, source, content_hash, retained, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const now = Date.now();
  const run = db.transaction((batch: typeof rows) => {
    let n = 0;
    for (const r of batch) {
      n += stmt.run(
        r.cardId,
        r.variant,
        r.userId,
        r.backed ? 1 : 0,
        source,
        r.contentHash,
        r.retained === null ? null : r.retained ? 1 : 0,
        now,
      ).changes;
    }
    return n;
  });
  return run(rows);
}

/** All swipes for one card, in arrival order. */
export function getSwipesForCard(cardId: string): SwipeRow[] {
  return getDb()
    .prepare(`SELECT * FROM swipes WHERE card_id = ? ORDER BY id ASC`)
    .all(cardId) as SwipeRow[];
}

/** Every swipe, in arrival order. */
export function getAllSwipes(): SwipeRow[] {
  return getDb()
    .prepare(`SELECT * FROM swipes ORDER BY id ASC`)
    .all() as SwipeRow[];
}

/** Card ids this user has already swiped, so the deck can skip them. */
export function getSwipedCardIds(userId: string): string[] {
  const rows = getDb()
    .prepare(`SELECT card_id FROM swipes WHERE user_id = ?`)
    .all(userId) as Array<{ card_id: string }>;
  return rows.map((r) => r.card_id);
}

/**
 * How many swipes came from real swiping vs the simulator.
 *
 * The aggregation deliberately pools both — a swipe is a swipe. But a reader
 * must never have to guess which they are looking at, so the dashboard states
 * the split outright.
 */
export function swipeSourceCounts(): { ui: number; sim: number } {
  const rows = getDb()
    .prepare(`SELECT source, COUNT(*) AS n FROM swipes GROUP BY source`)
    .all() as Array<{ source: "ui" | "sim"; n: number }>;
  const out = { ui: 0, sim: 0 };
  for (const r of rows) out[r.source] = r.n;
  return out;
}

export function resetSwipes(): number {
  const db = getDb();
  const info = db.prepare(`DELETE FROM swipes`).run();
  db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'swipes'`).run();
  return info.changes;
}
