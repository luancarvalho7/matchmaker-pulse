import { NextResponse } from "next/server";

import { validateFullTrackingMatchRanks } from "@/lib/feimec-tracking";
import {
  completeTrackingSession,
  TrackingSessionNotFoundError,
} from "@/lib/feimec-tracking-db";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type CompleteSessionBody = {
  brief?: unknown;
  name?: unknown;
  phone?: unknown;
  role?: unknown;
  matchRanks?: unknown;
  allowUpdate?: unknown;
};

function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  return digits;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!uuidPattern.test(sessionId)) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 400 });
  }

  let body: CompleteSessionBody;

  try {
    const payload = await request.json();

    if (!isRecord(payload)) {
      return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
    }

    body = payload as CompleteSessionBody;
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const normalizedBrief =
    typeof body.brief === "string" && body.brief.trim() ? body.brief.trim() : null;

  const normalizedRole =
    typeof body.role === "string" && body.role.trim()
      ? body.role.trim()
      : normalizedBrief;

  if (!normalizedRole) {
    return NextResponse.json({ error: "Brief obrigatorio." }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(body.phone);

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Telefone obrigatorio." }, { status: 400 });
  }

  const normalizedName = typeof body.name === "string" ? body.name.trim() : "";

  if (!normalizedName) {
    return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
  }

  const providedMatchRanks = Array.isArray(body.matchRanks)
    ? body.matchRanks.filter((item): item is number => typeof item === "number")
    : [];
  const matchRanks = validateFullTrackingMatchRanks(providedMatchRanks);

  if (!matchRanks) {
    return NextResponse.json({ error: "Ranking obrigatorio." }, { status: 400 });
  }

  try {
    const trackingResult = await completeTrackingSession(sessionId, {
      brief: normalizedBrief,
      role: normalizedRole,
      name: normalizedName,
      phone: normalizedPhone,
      matchRanks,
      allowUpdate: body.allowUpdate === true,
    });

    return NextResponse.json(trackingResult);
  } catch (error) {
    if (error instanceof TrackingSessionNotFoundError) {
      return NextResponse.json({ error: "Sessao nao encontrada." }, { status: 404 });
    }

    console.error("Failed to complete FEIMEC tracking session", error);

    return NextResponse.json(
      { error: "Nao foi possivel finalizar a sessao agora." },
      { status: 500 },
    );
  }
}