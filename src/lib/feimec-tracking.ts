import type { Match } from "@/data/matches";
import { matches } from "@/data/matches";

export type TrackingSessionStatus = "loading" | "completed";

export type TrackingSessionRecord = {
  id: string;
  status: TrackingSessionStatus;
  brief: string | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrackingCompletionPayload = {
  session: TrackingSessionRecord;
  matchRanks: number[];
  matches: Match[];
};

const matchesByRank = new Map(matches.map((match) => [match.rank, match]));
const matchesByCompanyName = new Map(
  matches.map((match) => [normalizeCompanyName(match.companyName), match]),
);

const matchmakerCollectionKeys = ["matches", "ranking", "results", "data"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRankValue(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numericValue) || !matchesByRank.has(numericValue)) {
    return null;
  }

  return numericValue;
}

function normalizeMatchScore(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeConnectionTips(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedTips = value.flatMap((tip) => {
    const normalizedTip = normalizeRequiredText(tip);

    return normalizedTip ? [normalizedTip] : [];
  });

  return normalizedTips.length > 0 ? normalizedTips : null;
}

function getNestedMatchmakerEntries(payload: Record<string, unknown>): unknown[] {
  for (const key of matchmakerCollectionKeys) {
    const collection = payload[key];

    if (Array.isArray(collection)) {
      return collection;
    }

    if (isRecord(collection)) {
      const nestedEntries = getNestedMatchmakerEntries(collection);

      if (nestedEntries.length > 0) {
        return nestedEntries;
      }
    }
  }

  return [];
}

function getMatchmakerEntries(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [entry];
      }

      const nestedEntries = getNestedMatchmakerEntries(entry);

      return nestedEntries.length > 0 ? nestedEntries : [entry];
    });
  }

  if (!isRecord(payload)) {
    return [];
  }

  return getNestedMatchmakerEntries(payload);
}

function normalizeMatchEntry(entry: unknown): Match | null {
  if (!isRecord(entry)) {
    return null;
  }

  const rank = normalizeRankValue(entry.rank);
  const companyName = normalizeRequiredText(entry.companyName);
  const booth = normalizeRequiredText(entry.booth);
  const match = normalizeMatchScore(entry.match);
  const why = normalizeRequiredText(entry.why);
  const connectionTips = normalizeConnectionTips(entry.connectionTips);

  if (rank === null || !companyName || !booth || match === null || !why || !connectionTips) {
    return null;
  }

  return {
    rank,
    companyName,
    booth,
    match,
    why,
    connectionTips,
  };
}

function getEntryRank(entry: unknown) {
  const scalarRank = normalizeRankValue(entry);

  if (scalarRank !== null) {
    return scalarRank;
  }

  if (!isRecord(entry)) {
    return null;
  }

  const directRank = normalizeRankValue(entry.rank ?? entry.position ?? entry.posicao);

  if (directRank !== null) {
    return directRank;
  }

  const candidateCompanyName = [entry.companyName, entry.company_name, entry.company, entry.name, entry.empresa].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (!candidateCompanyName) {
    return null;
  }

  return matchesByCompanyName.get(normalizeCompanyName(candidateCompanyName))?.rank ?? null;
}

export function getDefaultMatchRanks() {
  return matches.map((match) => match.rank);
}

export function extractMatchesFromPayload(payload: unknown) {
  return getMatchmakerEntries(payload).flatMap((entry) => {
    const normalizedMatch = normalizeMatchEntry(entry);

    return normalizedMatch ? [normalizedMatch] : [];
  });
}

export function normalizeTrackingMatchRanks(matchRanks?: readonly number[] | null) {
  const normalizedRanks = (matchRanks ?? []).flatMap((matchRank) => {
    const normalizedRank = normalizeRankValue(matchRank);

    return normalizedRank === null ? [] : [normalizedRank];
  });

  const uniqueRanks = [...new Set(normalizedRanks)];
  const defaultMatchRanks = getDefaultMatchRanks();

  return [...uniqueRanks, ...defaultMatchRanks.filter((rank) => !uniqueRanks.includes(rank))];
}

export function validateFullTrackingMatchRanks(matchRanks?: readonly number[] | null) {
  if (!matchRanks || matchRanks.length !== matches.length) {
    return null;
  }

  const normalizedRanks = matchRanks.flatMap((matchRank) => {
    const normalizedRank = normalizeRankValue(matchRank);

    return normalizedRank === null ? [] : [normalizedRank];
  });

  const uniqueRanks = [...new Set(normalizedRanks)];

  return uniqueRanks.length === matches.length ? uniqueRanks : null;
}

export function extractMatchRanksFromPayload(payload: unknown) {
  const extractedMatches = extractMatchesFromPayload(payload);

  if (extractedMatches.length > 0) {
    return normalizeTrackingMatchRanks(extractedMatches.map((match) => match.rank));
  }

  const matchmakerEntries = getMatchmakerEntries(payload);
  const extractedRanks = matchmakerEntries.flatMap((entry) => {
    const rank = getEntryRank(entry);

    return rank === null ? [] : [rank];
  });

  if (extractedRanks.length === 0) {
    return getDefaultMatchRanks();
  }

  return normalizeTrackingMatchRanks(extractedRanks);
}

export function hydrateMatchesByRanks(matchRanks: readonly number[]) {
  return matchRanks.flatMap((rank) => {
    const match = matchesByRank.get(rank);

    return match ? [match] : [];
  });
}

export function buildTrackingCompletionPayload(
  session: TrackingSessionRecord,
  matchRanks: readonly number[],
  persistedMatches?: readonly Match[] | null,
): TrackingCompletionPayload {
  return {
    session,
    matchRanks: [...matchRanks],
    matches:
      persistedMatches && persistedMatches.length > 0
        ? [...persistedMatches]
        : hydrateMatchesByRanks(matchRanks),
  };
}