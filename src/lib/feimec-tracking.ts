import type { Match } from "@/data/matches";
import { matches } from "@/data/matches";

export type TrackingSessionStatus = "loading" | "completed";

export type TrackingSessionRecord = {
  id: string;
  status: TrackingSessionStatus;
  brief: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrackingCompletionPayload = {
  session: TrackingSessionRecord;
  matchRanks: number[];
  matches: Match[];
};

const matchesByRank = new Map(matches.map((match) => [match.rank, match]));

export function getDefaultMatchRanks() {
  return matches.map((match) => match.rank);
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
): TrackingCompletionPayload {
  return {
    session,
    matchRanks: [...matchRanks],
    matches: hydrateMatchesByRanks(matchRanks),
  };
}