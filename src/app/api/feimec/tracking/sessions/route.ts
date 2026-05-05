import { NextResponse } from "next/server";

import { createTrackingSession } from "@/lib/feimec-tracking-db";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await createTrackingSession();

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Failed to create FEIMEC tracking session", error);

    return NextResponse.json(
      { error: "Nao foi possivel iniciar a sessao agora." },
      { status: 500 },
    );
  }
}