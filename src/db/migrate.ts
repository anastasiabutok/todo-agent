import { MIGRATIONS } from "./schema";
import { executeDdl, type Sql } from "./sql";

export function runMigrations(sql: Sql): number {
  sql`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)`;
  const row = sql<{
    value: string;
  }>`SELECT value FROM _meta WHERE key = 'schema_version'`[0];
  const version = row ? Number(row.value) : 0;
  if (
    !Number.isInteger(version) ||
    version < 0 ||
    version > MIGRATIONS.length
  ) {
    throw new Error("Unsupported database schema version");
  }
  for (let index = version; index < MIGRATIONS.length; index++) {
    // Workers SQLite accepts multiple statements. The caller wraps migration
    // and version update in storage.transactionSync for all-or-nothing writes.
    executeDdl(sql, MIGRATIONS[index]);
    sql`INSERT INTO _meta (key, value) VALUES ('schema_version', ${String(index + 1)})
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
  }
  return MIGRATIONS.length;
}
