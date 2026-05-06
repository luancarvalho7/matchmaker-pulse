import { NextResponse } from "next/server";

import { abandonTrackingSession } from "@/lib/feimec-tracking-db";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

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
