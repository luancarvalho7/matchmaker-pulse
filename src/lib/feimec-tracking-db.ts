import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import {
  buildTrackingCompletionPayload,
  extractMatchesFromPayload,
  normalizeTrackingMatchRanks,
  validateFullTrackingMatchRanks,
  type TrackingCompletionPayload,
  type TrackingSessionRecord,
  type TrackingSessionStatus,
} from "@/lib/feimec-tracking";
import type { Match } from "@/data/matches";

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
  matches?: readonly Match[] | null;
  allowUpdate?: boolean;
};

type UpdateTrackingSessionInput = {
  brief?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
};

type TrackingResultRow = {
  match_ranks: number[];
  matchmaker_payload: unknown;
};

type PersistedMatchmakerPayload = {
  matchRanks: number[];
  matches: Match[];
};

const globalForTracking = globalThis as typeof globalThis & {
  feimecTrackingPool?: Pool;
};

type DatabaseEnvironment = Record<string, string | undefined>;

function normalizeRequiredEnvValue(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildDatabaseUrlFromSupabaseEnv(environment: DatabaseEnvironment) {
  const host = normalizeRequiredEnvValue(environment.SUPABASE_DB_HOST);
  const port = normalizeRequiredEnvValue(environment.SUPABASE_DB_PORT);
  const databaseName = normalizeRequiredEnvValue(environment.SUPABASE_DB_NAME);
  const username = normalizeRequiredEnvValue(environment.SUPABASE_DB_USER);
  const password = normalizeRequiredEnvValue(environment.SUPABASE_DB_PASSWORD);

  if (!host || !port || !databaseName || !username || !password) {
    return null;
  }

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(databaseName)}`;
}

export function resolveDatabaseUrl(environment: DatabaseEnvironment = process.env) {
  const databaseUrl = normalizeRequiredEnvValue(environment.DATABASE_URL);

  if (databaseUrl) {
    return databaseUrl;
  }

  const supabaseDatabaseUrl = buildDatabaseUrlFromSupabaseEnv(environment);

  if (supabaseDatabaseUrl) {
    return supabaseDatabaseUrl;
  }

  throw new Error("DATABASE_URL is not configured.");
}

function getDatabaseUrl() {
  return resolveDatabaseUrl(process.env);
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

function normalizeTrackingMatches(matches?: readonly Match[] | null) {
  if (!matches || matches.length === 0) {
    return [];
  }

  return extractMatchesFromPayload({ matches });
}

function buildPersistedMatchmakerPayload(
  matchRanks: readonly number[],
  matches: readonly Match[],
): PersistedMatchmakerPayload {
  return {
    matchRanks: [...matchRanks],
    matches: [...matches],
  };
}

function readPersistedMatchmakerPayload(payload: unknown, fallbackMatchRanks: readonly number[]) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      matchRanks: [...fallbackMatchRanks],
      matches: [] as Match[],
    };
  }

  const persistedPayload = payload as {
    matchRanks?: unknown;
    matches?: unknown;
  };
  const persistedMatchRanks = Array.isArray(persistedPayload.matchRanks)
    ? persistedPayload.matchRanks.filter((item): item is number => typeof item === "number")
    : [];
  const normalizedMatchRanks =
    validateFullTrackingMatchRanks(persistedMatchRanks) ??
    normalizeTrackingMatchRanks(fallbackMatchRanks);

  return {
    matchRanks: normalizedMatchRanks,
    matches: extractMatchesFromPayload({
      matches: Array.isArray(persistedPayload.matches) ? persistedPayload.matches : [],
    }),
  };
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

export async function updateTrackingSession(sessionId: string, input: UpdateTrackingSessionInput) {
  const normalizedBrief = normalizeOptionalText(input.brief);
  const normalizedRole = normalizeOptionalText(input.role);
  const normalizedName = normalizeOptionalText(input.name);
  const normalizedPhone = normalizeOptionalText(input.phone);

  const result = await getPool().query<TrackingSessionRow>(
    `
      update feimec.tracking_sessions
      set brief = coalesce($2, brief),
          name = coalesce($3, name),
          phone = coalesce($4, phone),
          role = coalesce($5, role),
          updated_at = now()
      where id = $1
      returning id, status, brief, name, phone, role, created_at, updated_at
    `,
    [sessionId, normalizedBrief, normalizedName, normalizedPhone, normalizedRole],
  );

  if (result.rowCount !== 1) {
    throw new TrackingSessionNotFoundError(sessionId);
  }

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
  const providedMatches = normalizeTrackingMatches(input.matches);

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
          select match_ranks, matchmaker_payload
          from feimec.tracking_session_results
          where session_id = $1
        `,
        [sessionId],
      );

      if (persistedResult.rowCount !== 1) {
        throw new Error(`Completed tracking session ${sessionId} has no saved result.`);
      }


      const persistedPayload = readPersistedMatchmakerPayload(
        persistedResult.rows[0].matchmaker_payload,
        persistedResult.rows[0].match_ranks,
      );

      await client.query("commit");

      return buildTrackingCompletionPayload(
        mapSession(existingSession),
        persistedPayload.matchRanks,
        persistedPayload.matches,
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

    const persistedMatchmakerPayload = buildPersistedMatchmakerPayload(matchRanks, providedMatches);

    const trackingResult = await client.query<TrackingResultRow>(
      `
        insert into feimec.tracking_session_results (session_id, match_ranks, matchmaker_payload)
        values ($1, $2::int[], $3::jsonb)
        on conflict (session_id)
        do update set match_ranks = excluded.match_ranks,
                      matchmaker_payload = excluded.matchmaker_payload,
                      saved_at = now()
        returning match_ranks, matchmaker_payload
      `,
      [sessionId, matchRanks, JSON.stringify(persistedMatchmakerPayload)],
    );

    const persistedPayload = readPersistedMatchmakerPayload(
      trackingResult.rows[0].matchmaker_payload,
      trackingResult.rows[0].match_ranks,
    );

    await client.query("commit");

    return buildTrackingCompletionPayload(
      mapSession(updatedSessionResult.rows[0]),
      persistedPayload.matchRanks,
      persistedPayload.matches,
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}