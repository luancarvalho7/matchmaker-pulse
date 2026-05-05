import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile(path.resolve(rootDir, ".env"));
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

function shouldUseSsl(connectionString) {
  return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
});

const sessionId = randomUUID();
const brief = `feimec roundtrip ${new Date().toISOString()}`;
const matchRanks = [1, 2, 3];

try {
  await client.connect();

  const schemaSql = await readFile(path.resolve(rootDir, "db/feimec_tracking.sql"), "utf8");
  await client.query(schemaSql);

  await client.query(
    `
      insert into feimec.tracking_sessions (id, status)
      values ($1, 'loading')
    `,
    [sessionId],
  );

  const createdSession = await client.query(
    `
      select status
      from feimec.tracking_sessions
      where id = $1
    `,
    [sessionId],
  );

  if (createdSession.rowCount !== 1 || createdSession.rows[0].status !== "loading") {
    throw new Error("Tracking session was not created with loading status.");
  }

  await client.query("begin");

  try {
    await client.query(
      `
        update feimec.tracking_sessions
        set brief = $2,
            status = 'completed',
            updated_at = now()
        where id = $1
      `,
      [sessionId, brief],
    );

    await client.query(
      `
        insert into feimec.tracking_session_results (session_id, match_ranks)
        values ($1, $2::int[])
      `,
      [sessionId, matchRanks],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const persistedSession = await client.query(
    `
      select s.status, s.brief, r.match_ranks
      from feimec.tracking_sessions s
      join feimec.tracking_session_results r on r.session_id = s.id
      where s.id = $1
    `,
    [sessionId],
  );

  if (persistedSession.rowCount !== 1) {
    throw new Error("Tracking result was not persisted.");
  }

  const [row] = persistedSession.rows;

  if (row.status !== "completed") {
    throw new Error("Tracking session did not transition to completed status.");
  }

  if (row.brief !== brief) {
    throw new Error("Tracking brief was not persisted correctly.");
  }

  if (JSON.stringify(row.match_ranks) !== JSON.stringify(matchRanks)) {
    throw new Error("Tracking match ranks were not persisted correctly.");
  }

  await client.query(
    `
      delete from feimec.tracking_sessions
      where id = $1
    `,
    [sessionId],
  );

  console.log("roundtrip-ok");
} finally {
  await client.end();
}