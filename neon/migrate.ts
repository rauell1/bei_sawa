import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
const client = new pg.Client({ connectionString });
async function migrate() {
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(76317462)");
    await client.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
    await client.query("COMMIT");
    console.log("BeiSawa Neon schema is up to date");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
migrate().catch(() => { console.error("Migration failed; check database access and schema permissions"); process.exitCode = 1; });
