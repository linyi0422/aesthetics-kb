import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "./db";

const tempRoots: string[] = [];

function createTempMigrationsDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kb-migrations-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("runMigrations", () => {
  it("applies ordered SQL migrations and records them once", () => {
    const migrationsDir = createTempMigrationsDir();
    fs.writeFileSync(path.join(migrationsDir, "001-create-base.sql"), "CREATE TABLE alpha (id INTEGER PRIMARY KEY);");
    fs.writeFileSync(path.join(migrationsDir, "002-add-column.sql"), "ALTER TABLE alpha ADD COLUMN name TEXT;");

    const db = new DatabaseSync(":memory:");
    runMigrations(db, migrationsDir);
    runMigrations(db, migrationsDir);

    const columns = db.prepare("PRAGMA table_info(alpha);").all() as Array<{ name: string }>;
    const columnNames = columns.map((column) => column.name);
    expect(columnNames).toEqual(["id", "name"]);

    const migrationCount = db.prepare("SELECT COUNT(*) AS count FROM migrations;").get() as { count: number };
    expect(migrationCount.count).toBe(2);
  });
});

