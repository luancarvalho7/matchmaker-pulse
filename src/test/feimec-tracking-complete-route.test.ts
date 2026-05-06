import { beforeEach, describe, expect, it, vi } from "vitest";

import { matches } from "@/data/matches";

const completeTrackingSession = vi.fn();

class TrackingSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Tracking session ${sessionId} was not found.`);
    this.name = "TrackingSessionNotFoundError";
  }
}

vi.mock("@/lib/feimec-tracking-db", () => ({
  completeTrackingSession,
  TrackingSessionNotFoundError,
}));

import { POST } from "@/app/api/feimec/tracking/sessions/[sessionId]/complete/route";

function buildPayload() {
  return {
    brief: "Comprador industrial",
    name: "Teste Copilot",
    phone: "11999998888",
    role: "Comprador industrial",
    matchRanks: matches.map((match) => match.rank),
    matches,
  };
}

function buildTrackingResponse() {
  return {
    session: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      status: "completed" as const,
      brief: "Comprador industrial",
      name: "Teste Copilot",
      phone: "11999998888",
      role: "Comprador industrial",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    matchRanks: matches.map((match) => match.rank),
    matches,
  };
}

describe("POST /api/feimec/tracking/sessions/[sessionId]/complete", () => {
  beforeEach(() => {
    completeTrackingSession.mockReset();
  });

  it("forwards persisted full matches to the tracking completion service", async () => {
    completeTrackingSession.mockResolvedValue(buildTrackingResponse());

    const response = await POST(
      new Request("http://localhost/api/feimec/tracking/sessions/123e4567-e89b-12d3-a456-426614174000/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      }),
      {
        params: Promise.resolve({
          sessionId: "123e4567-e89b-12d3-a456-426614174000",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(completeTrackingSession).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        brief: "Comprador industrial",
        role: "Comprador industrial",
        name: "Teste Copilot",
        phone: "11999998888",
        matchRanks: matches.map((match) => match.rank),
        matches,
      }),
    );
  });
});