import { NextResponse } from "next/server";

import {
  completeTrackingSession,
  TrackingSessionNotFoundError,
} from "@/lib/feimec-tracking-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type CompleteSessionBody = {
  brief?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  let body: CompleteSessionBody;

  try {
    body = (await request.json()) as CompleteSessionBody;
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  if (typeof body.brief !== "string" || !body.brief.trim()) {
    return NextResponse.json({ error: "Brief obrigatorio." }, { status: 400 });
  }

  try {
    const trackingResult = await completeTrackingSession(sessionId, body.brief);

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