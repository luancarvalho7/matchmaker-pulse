import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import {
  buildTrackingCompletionPayload,
  validateFullTrackingMatchRanks,
  type TrackingCompletionPayload,
  type TrackingSessionRecord,
  type TrackingSessionStatus,
} from "@/lib/feimec-tracking";

type TrackingSessionRow = {
  id: string;
  status: TrackingSessionStatus;
  brief: string | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CompleteTrackingSessionInput = {
  brief?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
  matchRanks?: readonly number[] | null;
  allowUpdate?: boolean;
};

type TrackingResultRow = {
  match_ranks: number[];
};

const globalForTracking = globalThis as typeof globalThis & {
  feimecTrackingPool?: Pool;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

function shouldUseSsl(databaseUrl: string) {
  return !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
}

function getPool() {
  if (!globalForTracking.feimecTrackingPool) {
    const databaseUrl = getDatabaseUrl();

    globalForTracking.feimecTrackingPool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }

  return globalForTracking.feimecTrackingPool;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapSession(row: TrackingSessionRow): TrackingSessionRecord {
  return {
    id: row.id,
    status: row.status,
    brief: row.brief,
    name: row.name,
    phone: row.phone,
    role: row.role,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function normalizeOptionalText(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";

  return normalizedValue ? normalizedValue : null;
}

export class TrackingSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Tracking session ${sessionId} was not found.`);
    this.name = "TrackingSessionNotFoundError";
  }
}

export async function createTrackingSession() {
  const sessionId = randomUUID();
  const result = await getPool().query<TrackingSessionRow>(
    `
      insert into feimec.tracking_sessions (id, status)
      values ($1, 'loading')
      returning id, status, brief, name, phone, role, created_at, updated_at
    `,
    [sessionId],
  );

  return mapSession(result.rows[0]);
}

export async function abandonTrackingSession(sessionId: string) {
  const result = await getPool().query(
    `
      delete from feimec.tracking_sessions
      where id = $1
        and status = 'loading'
    `,
    [sessionId],
  );

  return result.rowCount === 1;
}

export async function completeTrackingSession(
  sessionId: string,
  input: CompleteTrackingSessionInput,
): Promise<TrackingCompletionPayload> {
  const normalizedBrief = normalizeOptionalText(input.brief);
  const normalizedRole = normalizeOptionalText(input.role ?? input.brief);
  const normalizedName = normalizeOptionalText(input.name);
  const normalizedPhone = normalizeOptionalText(input.phone);
  const providedMatchRanks = input.matchRanks ?? [];

  if (!normalizedRole) {
    throw new Error("Role is required to complete a tracking session.");
  }

  if (!normalizedName) {
    throw new Error("Name is required to complete a tracking session.");
  }

  if (providedMatchRanks.length === 0) {
    throw new Error("Match ranks are required to complete a tracking session.");
  }

  const matchRanks = validateFullTrackingMatchRanks(providedMatchRanks);

  if (!matchRanks) {
    throw new Error("Match ranks are invalid.");
  }
  const client = await getPool().connect();

  try {
    await client.query("begin");

    const existingSessionResult = await client.query<TrackingSessionRow>(
      `
        select id, status, brief, name, phone, role, created_at, updated_at
        from feimec.tracking_sessions
        where id = $1
        for update
      `,
      [sessionId],
    );

    if (existingSessionResult.rowCount !== 1) {
      throw new TrackingSessionNotFoundError(sessionId);
    }

    const existingSession = existingSessionResult.rows[0];

    if (existingSession.status === "completed" && !input.allowUpdate) {
      const persistedResult = await client.query<TrackingResultRow>(
        `
          select match_ranks
          from feimec.tracking_session_results
          where session_id = $1
        `,
        [sessionId],
      );

      if (persistedResult.rowCount !== 1) {
        throw new Error(`Completed tracking session ${sessionId} has no saved result.`);
      }

      await client.query("commit");

      return buildTrackingCompletionPayload(
        mapSession(existingSession),
        persistedResult.rows[0].match_ranks,
      );
    }

    const updatedSessionResult = await client.query<TrackingSessionRow>(
      `
        update feimec.tracking_sessions
        set brief = $2,
            name = $3,
            phone = $4,
            role = $5,
            status = 'completed',
            updated_at = now()
        where id = $1
        returning id, status, brief, name, phone, role, created_at, updated_at
      `,
      [sessionId, normalizedBrief ?? normalizedRole, normalizedName, normalizedPhone, normalizedRole],
    );

    const trackingResult = await client.query<TrackingResultRow>(
      `
        insert into feimec.tracking_session_results (session_id, match_ranks)
        values ($1, $2::int[])
        on conflict (session_id)
        do update set match_ranks = excluded.match_ranks,
                      saved_at = now()
        returning match_ranks
      `,
      [sessionId, matchRanks],
    );

    await client.query("commit");

    return buildTrackingCompletionPayload(
      mapSession(updatedSessionResult.rows[0]),
      trackingResult.rows[0].match_ranks,
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}