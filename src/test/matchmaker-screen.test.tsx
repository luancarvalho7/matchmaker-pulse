import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MatchmakerScreen } from "@/components/matchmaker-screen";

describe("MatchmakerScreen", () => {
  it("runs through onboarding, swipe deck, and full map", async () => {
    const user = userEvent.setup();

    render(<MatchmakerScreen />);

    expect(
      screen.getByRole("button", { name: /começar matchmaking/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));

    expect(screen.getByText(/1 pergunta rápida/i)).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /descreva sua empresa/i }),
      "Somos uma empresa de educação financeira buscando parcerias B2B na FEIMEC.",
    );

    await user.click(screen.getByRole("button", { name: /ver meus matches/i }));

    expect(screen.getByText(/seu match ideal/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "TOTVS", level: 2 }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /próximo card/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Soluções Digitais by Informa Markets",
        level: 2,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver mapa completo/i }));

    expect(
      await screen.findByRole("heading", {
        name: /seus matches prontos para compartilhar/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /ver detalhes da totvs/i }),
    );

    expect(
      screen.getByText(/saúde financeira e produtividade/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /voltar para o swipe/i }));

    expect(await screen.findByText(/seu match ideal/i)).toBeInTheDocument();
  });
});