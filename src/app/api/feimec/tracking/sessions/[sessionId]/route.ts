import { NextResponse } from "next/server";

import {
  abandonTrackingSession,
  TrackingSessionNotFoundError,
  updateTrackingSession,
} from "@/lib/feimec-tracking-db";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type UpdateSessionBody = {
  brief?: unknown;
  name?: unknown;
  phone?: unknown;
  role?: unknown;
};

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  return digits.length >= 10 && digits.length <= 11 ? digits : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!uuidPattern.test(sessionId)) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 400 });
  }

  let body: UpdateSessionBody;

  try {
    const payload = await request.json();

    if (!isRecord(payload)) {
      return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
    }

    body = payload as UpdateSessionBody;
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const normalizedBrief = normalizeOptionalText(body.brief);
  const normalizedName = normalizeOptionalText(body.name);
  const normalizedRole = normalizeOptionalText(body.role);
  const normalizedPhone = body.phone === undefined ? undefined : normalizePhone(body.phone);

  if (body.phone !== undefined && !normalizedPhone) {
    return NextResponse.json({ error: "Telefone invalido." }, { status: 400 });
  }

  if (!normalizedBrief && !normalizedName && !normalizedRole && !normalizedPhone) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  try {
    const session = await updateTrackingSession(sessionId, {
      brief: normalizedBrief,
      name: normalizedName,
      phone: normalizedPhone,
      role: normalizedRole,
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof TrackingSessionNotFoundError) {
      return NextResponse.json({ error: "Sessao nao encontrada." }, { status: 404 });
    }

    console.error("Failed to update FEIMEC tracking session", error);

    return NextResponse.json(
      { error: "Nao foi possivel atualizar a sessao agora." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!uuidPattern.test(sessionId)) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 400 });
  }

  try {
    const abandoned = await abandonTrackingSession(sessionId);

    return NextResponse.json({ abandoned });
  } catch (error) {
    console.error("Failed to abandon FEIMEC tracking session", error);

    return NextResponse.json(
      { error: "Nao foi possivel abandonar a sessao agora." },
      { status: 500 },
    );
  }
}
