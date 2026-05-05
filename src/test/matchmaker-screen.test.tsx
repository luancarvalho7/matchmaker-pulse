import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MatchmakerScreen } from "@/components/matchmaker-screen";
import styles from "@/components/matchmaker-screen.module.css";

afterEach(() => {
  cleanup();
});

describe("MatchmakerScreen", () => {
  it("uses fullscreen stages and only enables vertical scroll on the final map", async () => {
    const user = userEvent.setup();
    const { container } = render(<MatchmakerScreen />);

    const shell = container.querySelector(`.${styles.shell}`);
    const introStage = container.querySelector(`.${styles.stageCard}`);

    expect(shell).not.toBeNull();
    expect(introStage).not.toBeNull();

    expect(getComputedStyle(shell as Element).paddingTop).toMatch(/^0(px)?$/);
    expect(getComputedStyle(introStage as Element).borderTopWidth).toBe("0px");
    expect(
      getComputedStyle(introStage as Element)
        .getPropertyValue("--journey-bottom-space")
        .trim(),
    ).toBe("32px");

    await user.click(screen.getByRole("button", { name: /começar matchmaking/i }));
    await user.type(
      screen.getByRole("textbox", { name: /descreva sua empresa/i }),
      "Somos uma empresa de educação financeira buscando parcerias B2B na FEIMEC.",
    );
    await user.click(screen.getByRole("button", { name: /ver meus matches/i }));
    await user.click(screen.getByRole("button", { name: /ver mapa completo/i }));

    const mapStage = container.querySelector(`.${styles.mapStage}`);

    expect(mapStage).not.toBeNull();
    expect(getComputedStyle(mapStage as Element).overflowY).toBe("auto");
  });

  it("runs through onboarding, swipe deck, and full map", async () => {
    const user = userEvent.setup();

    render(<MatchmakerScreen />);

    expect(screen.queryByText("9:41")).not.toBeInTheDocument();

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

    expect(screen.queryByText(/rank #1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contexto captado/i)).not.toBeInTheDocument();

    expect(screen.getAllByText(/ação recomendada/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/propor palestra curta sobre saúde financeira e produtividade/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /ver detalhes da totvs/i }),
    );

    expect(screen.getByText(/^plano de abordagem$/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/saúde financeira e produtividade/i).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /voltar para o swipe/i }));

    expect(await screen.findByText(/seu match ideal/i)).toBeInTheDocument();
  });
});