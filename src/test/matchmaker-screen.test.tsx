import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { matches, type Match } from "@/data/matches";

import { MatchmakerScreen } from "../components/matchmaker-screen";

function buildSession(overrides?: Partial<ReturnType<typeof buildSessionBase>>) {
  return buildSessionBase(overrides);
}

function buildSessionBase(overrides?: {
  id?: string;
  status?: "loading" | "completed";
  brief?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
}) {
  return {
    id: "session-123",
    status: "loading" as const,
    brief: null,
    name: null,
    phone: null,
    role: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

function hydrateMatchesByRank(matchRanks: readonly number[]) {
  return matchRanks.flatMap((matchRank) => {
    const match = matches.find((item) => item.rank === matchRank);

    return match ? [match] : [];
  });
}

function buildPatchedSessionResponse(init?: RequestInit) {
  const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

  return jsonResponse({
    session: buildSession({
      id: "session-123",
      brief: typeof body.brief === "string" ? body.brief : null,
      name: typeof body.name === "string" ? body.name : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      role: typeof body.role === "string" ? body.role : null,
    }),
  });
}

const webhookCompanyNames = [
  "TOTVS",
  "SKA Automação de Engenharias",
  "Dassault Systèmes",
  "HEXAGON",
  "Siemens",
  "Bosch Rexroth",
  "WEG",
  "ABB Robotics",
  "Fanuc",
  "Yaskawa",
  "Omron",
  "Tractian",
  "FRACTTAL",
  "GRV SOFTWARE",
  "CYNCLY – FOCCO ERP",
  "Polyworks Brasil",
  "MITUTOYO",
  "FARO",
  "ZEISS",
  "Tecc/Mastercam",
] as const;

const webhookMatches: Match[] = webhookCompanyNames.map((companyName, index) => ({
  rank: index + 1,
  companyName,
  booth: `X${String(index + 1).padStart(3, "0")}`,
  match: Number((9.7 - index * 0.1).toFixed(1)),
  why: `Motivo gerado para ${companyName}.`,
  connectionTips: [
    `Primeira dica para ${companyName}.`,
    `Segunda dica para ${companyName}.`,
    `Terceira dica para ${companyName}.`,
  ],
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("MatchmakerScreen", () => {
  it("keeps the mobile journey navigable between swipe and the full map", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return jsonResponse({ session: buildSession() }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return buildPatchedSessionResponse(init);
      }

      if (url.endsWith("/api/matchmaker")) {
        return jsonResponse(matches);
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        return jsonResponse({
          session: buildSession({ status: "completed" }),
          matchRanks: matches.map((match) => match.rank),
          matches,
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });

    await user.type(screen.getByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await user.type(
      await screen.findByRole("textbox", { name: /o que você faz\?/i }),
      "Consultor industrial",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    const briefField = await screen.findByRole("textbox", {
      name: /o que você busca nesse evento\?/i,
    });
    expect(briefField).toHaveAttribute("rows", "2");
    await user.type(briefField, "Quero encontrar parceiros para automacao industrial");
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    await user.click(screen.getByRole("button", { name: /ver mapa completo/i }));

    await screen.findByRole("heading", { name: /seus matches prontos para compartilhar/i });
    await user.click(screen.getByRole("button", { name: /voltar para o swipe/i }));
    await screen.findByRole("heading", { name: /seu match ideal/i });
  });

  it("asks one question at a time, formats the phone number, and maps the wrapped matchmaker response correctly", async () => {
    const user = userEvent.setup();
    let resolveMatchmaker: ((value: Response) => void) | null = null;

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return Promise.resolve(jsonResponse({ session: buildSession() }, { status: 201 }));
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return Promise.resolve(buildPatchedSessionResponse(init));
      }

      if (url.endsWith("/api/matchmaker")) {
        return new Promise<Response>((resolve) => {
          resolveMatchmaker = resolve;
        });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          brief?: string;
          name?: string;
          phone?: string;
          role?: string;
          matchRanks?: number[];
          matches?: Match[];
          allowUpdate?: boolean;
        };
        const matchRanks = body.matchRanks ?? matches.map((match) => match.rank);

        return Promise.resolve(
          jsonResponse({
            session: buildSession({
              status: "completed",
              brief: body.brief ?? null,
              name: body.name ?? null,
              phone: body.phone ?? null,
              role: body.role ?? null,
            }),
            matchRanks,
            matches: Array.isArray(body.matches) ? body.matches : hydrateMatchesByRank(matchRanks),
          }),
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });
    expect(screen.queryByRole("heading", { name: /qual seu telefone\?/i })).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /qual seu nome\?/i }), "Luan Carvalho");
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    const phoneInput = await screen.findByRole("textbox", { name: /qual seu telefone\?/i });
    await user.type(phoneInput, "11999998888");
    expect(phoneInput).toHaveValue("(11) 99999-8888");

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você faz\?/i }),
      "Consultor financeiro B2B",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    const briefField = await screen.findByRole("textbox", {
      name: /o que você busca nesse evento\?/i,
    });
    expect(briefField).toHaveAttribute("rows", "2");
    await user.type(briefField, "Busco fornecedores para projetos de expansao industrial");
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /montando seu radar industrial/i });
    expect(
      screen.getByText(/cruzando seus dados com os expositores com maior aderência/i),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/matchmaker",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Luan Carvalho",
          phone: "11999998888",
          role: "Consultor financeiro B2B",
          brief: "Busco fornecedores para projetos de expansao industrial",
        }),
      }),
    );

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/feimec/tracking/sessions/session-123/complete",
      expect.anything(),
    );

    resolveMatchmaker?.(jsonResponse([{ matches: webhookMatches }]));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    expect(await screen.findByRole("heading", { name: /totvs/i, level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /próximo card/i }));
    expect(
      await screen.findByRole("heading", { name: /ska automação de engenharias/i, level: 2 }),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feimec/tracking/sessions/session-123/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Luan Carvalho",
          phone: "11999998888",
          role: "Consultor financeiro B2B",
          brief: "Busco fornecedores para projetos de expansao industrial",
          matchRanks: webhookMatches.map((match) => match.rank),
          matches: webhookMatches,
          allowUpdate: false,
        }),
      }),
    );
  });

  it("does not skip past the brief step when continue is clicked twice during save", async () => {
    const user = userEvent.setup();
    const roleStepResolvers: Array<(value: Response) => void> = [];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return Promise.resolve(jsonResponse({ session: buildSession() }, { status: 201 }));
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;

        if (typeof body.role === "string" && typeof body.brief !== "string") {
          return new Promise<Response>((resolve) => {
            roleStepResolvers.push(resolve);
          });
        }

        return Promise.resolve(buildPatchedSessionResponse(init));
      }

      if (url.endsWith("/api/matchmaker")) {
        return Promise.resolve(jsonResponse(matches));
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        return Promise.resolve(
          jsonResponse({
            session: buildSession({ status: "completed" }),
            matchRanks: matches.map((match) => match.rank),
            matches,
          }),
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await user.type(await screen.findByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");

    await user.dblClick(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => {
      expect(roleStepResolvers).toHaveLength(1);
    });

    for (const resolveRoleStep of roleStepResolvers) {
      resolveRoleStep(buildPatchedSessionResponse({
        body: JSON.stringify({ name: "Luan", phone: "11999998888", role: "Comprador" }),
      }));
    }

    await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i });
    expect(
      screen.queryByRole("heading", { name: /o que você busca nesse evento\?/i }),
    ).toBeInTheDocument();
  });

  it("degrades gracefully when the webhook returns only a partial recognized ranking", async () => {
    const user = userEvent.setup();
    const partialMatches = [matches[1], matches[0]];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return jsonResponse({ session: buildSession() }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return buildPatchedSessionResponse(init);
      }

      if (url.endsWith("/api/matchmaker")) {
        return jsonResponse(partialMatches);
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { matchRanks?: number[] };
        const matchRanks = body.matchRanks ?? matches.map((match) => match.rank);

        return jsonResponse({
          session: buildSession({ status: "completed" }),
          matchRanks,
          matches: hydrateMatchesByRank(matchRanks),
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await user.type(await screen.findByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i }),
      "Busco fornecedores para digitalizar a operacao",
    );
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    await screen.findByRole("heading", { name: /soluções digitais by informa markets/i, level: 2 });

    const completeCall = fetchMock.mock.calls.find(([requestUrl]) =>
      requestUrl.toString().endsWith("/api/feimec/tracking/sessions/session-123/complete"),
    );
    const completeBody = JSON.parse(String(completeCall?.[1]?.body ?? "{}")) as {
      matchRanks?: number[];
    };

    expect(completeBody.matchRanks).toEqual([2, 1, ...matches.slice(2).map((match) => match.rank)]);
  });

  it("creates a fresh tracking session when the user restarts from the intro", async () => {
    const user = userEvent.setup();
    const sessionIds = ["session-123", "session-456"];
    let createSessionCalls = 0;
    let abandonCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        const nextSessionId = sessionIds[createSessionCalls] ?? `session-${createSessionCalls + 1}`;
        createSessionCalls += 1;

        return jsonResponse({ session: buildSession({ id: nextSessionId }) }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123")) {
        abandonCalls += 1;

        return jsonResponse({ abandoned: true });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });
    await user.click(screen.getByRole("button", { name: /voltar/i }));

    await screen.findByRole("button", { name: /começar matchmaking/i });
    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });

    expect(createSessionCalls).toBe(2);
    expect(abandonCalls).toBe(1);
  });

  it("blocks submission when the phone number is incomplete", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return jsonResponse({ session: buildSession() }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return buildPatchedSessionResponse(init);
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });

    await user.type(screen.getByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /qual seu telefone\?/i }), "1");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i }),
      "Quero encontrar parceiros para novos projetos",
    );
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    expect(
      await screen.findByText(/informe um telefone brasileiro válido para continuar/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("persists partial tracking data after each answered question", async () => {
    const user = userEvent.setup();
    const partialPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return jsonResponse({ session: buildSession({ id: "session-123" }) }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;
        partialPayloads.push(body);

        return jsonResponse({
          session: buildSession({
            id: "session-123",
            brief: typeof body.brief === "string" ? body.brief : null,
            name: typeof body.name === "string" ? body.name : null,
            phone: typeof body.phone === "string" ? body.phone : null,
            role: typeof body.role === "string" ? body.role : null,
          }),
        });
      }

      if (url.endsWith("/api/matchmaker")) {
        return jsonResponse(matches);
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        return jsonResponse({
          session: buildSession({ status: "completed" }),
          matchRanks: matches.map((match) => match.rank),
          matches,
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });

    await user.type(screen.getByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i }),
      "Quero encontrar parceiros para integracao industrial",
    );
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });

    expect(partialPayloads).toEqual([
      { name: "Luan" },
      { name: "Luan", phone: "11999998888" },
      { name: "Luan", phone: "11999998888", role: "Comprador" },
      {
        name: "Luan",
        phone: "11999998888",
        role: "Comprador",
        brief: "Quero encontrar parceiros para integracao industrial",
      },
    ]);
  });

  it("reuses the current tracking session when the user goes back from swipe to edit answers", async () => {
    const user = userEvent.setup();
    let createSessionCalls = 0;
    const completePayloads: Array<{ allowUpdate?: boolean; matchRanks?: number[] }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        createSessionCalls += 1;

        return jsonResponse({ session: buildSession({ id: "session-123" }) }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return buildPatchedSessionResponse(init);
      }

      if (url.endsWith("/api/matchmaker")) {
        return jsonResponse(matches);
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          allowUpdate?: boolean;
          matchRanks?: number[];
        };
        completePayloads.push(body);
        const matchRanks = body.matchRanks ?? matches.map((match) => match.rank);

        return jsonResponse({
          session: buildSession({ status: "completed" }),
          matchRanks,
          matches: hydrateMatchesByRank(matchRanks),
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });

    await user.type(screen.getByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i }),
      "Quero avaliar fornecedores para a planta",
    );
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    await user.click(screen.getByRole("button", { name: /voltar/i }));

    const nameInput = await screen.findByRole("textbox", { name: /qual seu nome\?/i });
    expect(nameInput).toHaveValue("Luan");

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByRole("textbox", { name: /qual seu telefone\?/i });
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByRole("textbox", { name: /o que você faz\?/i });
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i });
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    expect(createSessionCalls).toBe(1);
    expect(completePayloads).toHaveLength(2);
    expect(completePayloads[1]?.allowUpdate).toBe(true);
  });

  it("shows medal styling for the top 3 and lets the user mark a card as visited", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return jsonResponse({ session: buildSession() }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return buildPatchedSessionResponse(init);
      }

      if (url.endsWith("/api/matchmaker")) {
        return jsonResponse(matches);
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        return jsonResponse({
          session: buildSession({ status: "completed" }),
          matchRanks: matches.map((match) => match.rank),
          matches,
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await screen.findByRole("textbox", { name: /qual seu nome\?/i });

    await user.type(screen.getByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i }),
      "Quero descobrir expositores com mais aderencia",
    );
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    await user.click(screen.getByRole("button", { name: /ver mapa completo/i }));

    await screen.findByText(/ouro/i);
    expect(screen.getByText(/prata/i)).toBeInTheDocument();
    expect(screen.getByText(/bronze/i)).toBeInTheDocument();

    const visitButton = screen.getByRole("button", { name: /marcar totvs como visitado/i });
    await user.click(visitButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /totvs marcado como visitado/i }),
      ).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("persists the completed journey in localStorage after a page refresh", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith("/api/feimec/tracking/sessions")) {
        return jsonResponse({ session: buildSession() }, { status: 201 });
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123") && init?.method === "PATCH") {
        return buildPatchedSessionResponse(init);
      }

      if (url.endsWith("/api/matchmaker")) {
        return jsonResponse([{ matches: webhookMatches }]);
      }

      if (url.endsWith("/api/feimec/tracking/sessions/session-123/complete")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          brief?: string;
          name?: string;
          phone?: string;
          role?: string;
          matchRanks?: number[];
          matches?: Match[];
        };
        const matchRanks = body.matchRanks ?? webhookMatches.map((match) => match.rank);

        return jsonResponse({
          session: buildSession({
            status: "completed",
            brief: body.brief ?? null,
            name: body.name ?? null,
            phone: body.phone ?? null,
            role: body.role ?? null,
          }),
          matchRanks,
          matches: Array.isArray(body.matches) ? body.matches : webhookMatches,
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const firstRender = render(<MatchmakerScreen />);

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await user.type(await screen.findByRole("textbox", { name: /qual seu nome\?/i }), "Luan");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /qual seu telefone\?/i }),
      "11999998888",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(await screen.findByRole("textbox", { name: /o que você faz\?/i }), "Comprador");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /o que você busca nesse evento\?/i }),
      "Busco parceiros para ampliar minha rede industrial",
    );
    await user.click(screen.getByRole("button", { name: /encontrar matches/i }));

    await screen.findByRole("heading", { name: /seu match ideal/i });
    await user.click(screen.getByRole("button", { name: /ver mapa completo/i }));
    await screen.findByRole("heading", { name: /seus matches prontos para compartilhar/i });
    await user.click(screen.getByRole("button", { name: /marcar totvs como visitado/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /totvs marcado como visitado/i }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    const callCountBeforeRefresh = fetchMock.mock.calls.length;
    firstRender.unmount();

    render(<MatchmakerScreen />);

    await screen.findByRole("heading", { name: /seus matches prontos para compartilhar/i });
    expect(
      screen.getByRole("button", { name: /totvs marcado como visitado/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /começar matchmaking/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(callCountBeforeRefresh);
  });
});
