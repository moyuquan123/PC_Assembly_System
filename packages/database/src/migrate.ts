import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { max: 1 });
const migrationUrls = [
  new URL("../migrations/0000_initial.sql", import.meta.url),
  new URL("../migrations/0001_published_configurations.sql", import.meta.url),
  new URL("../migrations/0002_community.sql", import.meta.url)
];
for (const migrationUrl of migrationUrls) {
  const migration = await readFile(fileURLToPath(migrationUrl), "utf8");
  await sql.unsafe(migration);
}
await sql.end();
console.log("Database migration completed.");
