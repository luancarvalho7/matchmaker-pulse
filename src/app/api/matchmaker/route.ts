export const dynamic = "force-dynamic";

const MATCHMAKER_WEBHOOK_URL =
  "https://automatize.lionsoft.com.br/webhook/matchmaker/post/industrias";
const DEFAULT_MATCHMAKER_WEBHOOK_TIMEOUT_MS = 90000;

function getMatchmakerWebhookTimeoutMs() {
  const configuredTimeout = Number(process.env.MATCHMAKER_WEBHOOK_TIMEOUT_MS);

  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_MATCHMAKER_WEBHOOK_TIMEOUT_MS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  return digits.length >= 10 && digits.length <= 11 ? digits : null;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!isRecord(payload)) {
      return Response.json({ error: "Requisicao invalida." }, { status: 400 });
    }

    const name = normalizeRequiredText(payload.name);
    const role = normalizeRequiredText(payload.role);
    const phone = normalizePhone(payload.phone);
    const brief = normalizeRequiredText(payload.brief);

    if (!name || !role || !phone || !brief) {
      return Response.json(
        { error: "Nome, telefone, funcao e objetivo sao obrigatorios." },
        { status: 400 },
      );
    }

    const response = await fetch(MATCHMAKER_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(getMatchmakerWebhookTimeoutMs()),
      body: JSON.stringify({ name, phone, role, brief }),
    });

    const contentType = response.headers.get("content-type") ?? "application/json";
    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json(
        { error: "O webhook demorou demais para responder." },
        { status: 504 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Falha ao consultar o webhook do matchmaker.";

    if (error instanceof SyntaxError) {
      return Response.json({ error: "Requisicao invalida." }, { status: 400 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
