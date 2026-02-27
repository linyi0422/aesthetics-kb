import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), "src", "server", "migrations");

function resolveDatabasePath(databaseUrl: string): string {
  // Supports `file:./dev.db` (Prisma-style) and bare paths.
  const rawPath = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
  if (rawPath === ":memory:") return ":memory:";
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function applyPragmas(db: DatabaseSync) {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
}

type ColumnInfo = { name: string };

function tableExists(db: DatabaseSync, tableName: string): boolean {
  const row = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1;")
    .get(tableName) as { ok: number } | undefined;
  return Boolean(row?.ok);
}

function ensureColumn(db: DatabaseSync, tableName: string, columnName: string, definition: string) {
  if (!tableExists(db, tableName)) return;
  const columns = db.prepare(`PRAGMA table_info(${tableName});`).all() as ColumnInfo[];
  if (columns.some((column) => column.name === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}

function repairLegacySchema(db: DatabaseSync) {
  // Legacy DBs may have been created before `notion_id` existed; migrations now assume it.
  // This is a small forward-compat bridge so existing `dev.db` can boot.
  ensureColumn(db, "lenses", "notion_id", "TEXT");
  ensureColumn(db, "entries", "notion_id", "TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS lenses_notion_id_uq ON lenses(notion_id);");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS entries_notion_id_uq ON entries(notion_id);");
  db.exec(`
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at TEXT
);
`);
}

type AppliedMigration = { name: string };
export function runMigrations(db: DatabaseSync, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`migrations_dir_missing:${migrationsDir}`);
  }

  db.exec(`
CREATE TABLE IF NOT EXISTS migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`);

  const appliedRows = db.prepare("SELECT name FROM migrations;").all() as AppliedMigration[];
  const applied = new Set(appliedRows.map((row) => row.name));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
    const appliedAt = new Date().toISOString();

    db.exec("BEGIN IMMEDIATE;");
    try {
      if (sql) db.exec(sql);
      db.prepare("INSERT INTO migrations (name, applied_at) VALUES (?, ?);").run(file, appliedAt);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  }
}

let dbSingleton: DatabaseSync | null = null;
let dbInitialized = false;

function initDatabase(db: DatabaseSync) {
  if (dbInitialized) return;
  dbInitialized = true;
  applyPragmas(db);
  repairLegacySchema(db);
  runMigrations(db);
}

export function getDb(): DatabaseSync {
  if (dbSingleton) return dbSingleton;

  // Next build imports route modules in parallel; using a file DB there can lock.
  const databaseUrl = isNextBuildPhase() ? "file::memory:" : process.env.DATABASE_URL ?? "file:./dev.db";
  const databasePath = resolveDatabasePath(databaseUrl);
  if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  dbSingleton = new DatabaseSync(databasePath);
  initDatabase(dbSingleton);
  return dbSingleton;
}

export function newId(): string {
  return crypto.randomUUID();
}
