"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  Handshake,
  MapPin,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Truck,
} from "lucide-react";

import { matches, type Match } from "@/data/matches";
import {
  extractMatchesFromPayload,
  extractMatchRanksFromPayload,
  type TrackingCompletionPayload,
  type TrackingSessionRecord,
} from "@/lib/feimec-tracking";

import styles from "./matchmaker-screen.module.css";

type JourneyStage = "intro" | "question" | "loading" | "swipe" | "map";

type QuestionKey = "name" | "phone" | "role";

type MatchmakerAnswers = Record<QuestionKey, string>;

type MedalTone = "gold" | "silver" | "bronze";

type CreateSessionResponse = {
  session: TrackingSessionRecord;
};

type PersistedJourneyStage = Extract<JourneyStage, "question" | "swipe" | "map">;

type PersistedJourneyState = {
  version: 1;
  stage: PersistedJourneyStage;
  answers: MatchmakerAnswers;
  questionIndex: number;
  cardIndex: number;
  visitedRanks: number[];
  savedMatches: Match[];
  sessionId: string | null;
};

const initialAnswers: MatchmakerAnswers = {
  name: "",
  phone: "",
  role: "",
};
const matchmakerStorageKey = "matchmaker-screen-state:v1";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const swipeExitEase = [0.32, 0.72, 0, 1] as const;
const swipeSpring = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.72,
} as const;
const introIcons = [Factory, Handshake, Settings2, TrendingUp, Truck, Building2];
const questionSteps = [
  {
    key: "name",
    kicker: "Pergunta 1 de 3",
    title: "Qual seu nome?",
    placeholder: "Ex.: Luan Carvalho",
    inputMode: "text" as const,
    autoComplete: "name",
    maxLength: 80,
    multiline: false,
  },
  {
    key: "phone",
    kicker: "Pergunta 2 de 3",
    title: "Qual seu telefone?",
    placeholder: "Ex.: (11) 99999-8888",
    inputMode: "tel" as const,
    autoComplete: "tel",
    maxLength: 15,
    multiline: false,
  },
  {
    key: "role",
    kicker: "Pergunta 3 de 3",
    title: "O que você faz?",
    placeholder: "Ex.: Consultor financeiro B2B",
    inputMode: "text" as const,
    autoComplete: "organization-title",
    maxLength: 240,
    multiline: false,
  },
] as const;
const loadingMessages = [
  "Cruzando seus dados com os expositores com maior aderência.",
  "Lendo seu perfil para abrir a jornada já no melhor match.",
  "Ordenando os swipes para você começar pelas conversas mais fortes.",
] as const;

const stageMotion = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEase },
  },
};

const questionStepMotion = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 26 : -26,
    y: 10,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 0.34, ease: smoothEase },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -22 : 22,
    y: -8,
    scale: 0.985,
    transition: { duration: 0.22, ease: smoothEase },
  }),
};

const swipeCardMotion = {
  enter: () => ({
    opacity: 0,
    y: 28,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: swipeSpring,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
    y: 14,
    rotate: 0,
    scale: 0.992,
    transition: { duration: 0.22, ease: swipeExitEase },
  }),
};

function wrapIndex(index: number, length: number) {
  if (length === 0) {
    return 0;
  }

  return (index + length) % length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersistedJourneyStage(value: unknown): value is PersistedJourneyStage {
  return value === "question" || value === "swipe" || value === "map";
}

function normalizePersistedAnswers(value: unknown): MatchmakerAnswers {
  if (!isRecord(value)) {
    return initialAnswers;
  }

  return {
    name: typeof value.name === "string" ? value.name : initialAnswers.name,
    phone: typeof value.phone === "string" ? value.phone : initialAnswers.phone,
    role: typeof value.role === "string" ? value.role : initialAnswers.role,
  };
}

function clampIndex(value: unknown, maxIndex: number) {
  return Number.isInteger(value) ? Math.min(Math.max(Number(value), 0), maxIndex) : 0;
}

function clearPersistedJourneyState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(matchmakerStorageKey);
}

function readPersistedJourneyState(): PersistedJourneyState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawState = window.localStorage.getItem(matchmakerStorageKey);

  if (!rawState) {
    return null;
  }

  try {
    const parsedState = JSON.parse(rawState) as unknown;

    if (!isRecord(parsedState)) {
      clearPersistedJourneyState();
      return null;
    }

    const savedMatches = extractMatchesFromPayload({
      matches: Array.isArray(parsedState.savedMatches) ? parsedState.savedMatches : [],
    });

    if (savedMatches.length === 0) {
      clearPersistedJourneyState();
      return null;
    }

    const validRanks = new Set(savedMatches.map((match) => match.rank));
    const visitedRanks = Array.isArray(parsedState.visitedRanks)
      ? [...new Set(parsedState.visitedRanks)].flatMap((rank) =>
          typeof rank === "number" && Number.isInteger(rank) && validRanks.has(rank) ? [rank] : [],
        )
      : [];
    const questionIndex = clampIndex(parsedState.questionIndex, questionSteps.length - 1);
    const cardIndex = clampIndex(parsedState.cardIndex, savedMatches.length - 1);

    return {
      version: 1,
      stage: isPersistedJourneyStage(parsedState.stage) ? parsedState.stage : "swipe",
      answers: normalizePersistedAnswers(parsedState.answers),
      questionIndex,
      cardIndex,
      visitedRanks,
      savedMatches,
      sessionId:
        typeof parsedState.sessionId === "string" && parsedState.sessionId.trim()
          ? parsedState.sessionId
          : null,
    };
  } catch {
    clearPersistedJourneyState();
    return null;
  }
}

function persistJourneyState(state: PersistedJourneyState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(matchmakerStorageKey, JSON.stringify(state));
}

function extractBrazilianPhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatBrazilianPhone(value: string) {
  const digits = extractBrazilianPhoneDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const areaCode = digits.slice(0, 2);
  const localNumber = digits.slice(2);

  if (localNumber.length <= 4) {
    return `(${areaCode}) ${localNumber}`;
  }

  if (digits.length <= 10) {
    return `(${areaCode}) ${localNumber.slice(0, 4)}-${localNumber.slice(4)}`;
  }

  return `(${areaCode}) ${localNumber.slice(0, 5)}-${localNumber.slice(5, 9)}`;
}

function getMedalTone(rank: number): MedalTone | null {
  if (rank === 1) {
    return "gold";
  }

  if (rank === 2) {
    return "silver";
  }

  if (rank === 3) {
    return "bronze";
  }

  return null;
}

function getMedalLabel(tone: MedalTone) {
  if (tone === "gold") {
    return "Ouro";
  }

  if (tone === "silver") {
    return "Prata";
  }

  return "Bronze";
}

async function readJsonResponse<T>(response: Response) {
  return (await response.json()) as T;
}

async function readResponsePayload(response: Response) {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

async function readResponseError(response: Response, fallbackMessage: string) {
  const payload = await readResponsePayload(response);

  if (payload && typeof payload === "object" && "error" in payload) {
    const message = payload.error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallbackMessage;
}

export function MatchmakerScreen() {
  const [stage, setStage] = useState<JourneyStage>("intro");
  const [answers, setAnswers] = useState<MatchmakerAnswers>(initialAnswers);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionDirection, setQuestionDirection] = useState(1);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [cardDirection, setCardDirection] = useState(1);
  const [openRank, setOpenRank] = useState<number | null>(null);
  const [visitedRanks, setVisitedRanks] = useState<number[]>([]);
  const [shareFeedback, setShareFeedback] = useState("");
  const [savedMatches, setSavedMatches] = useState<Match[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [hasLoadedPersistedJourney, setHasLoadedPersistedJourney] = useState(false);

  const swipeMatches = savedMatches.length > 0 ? savedMatches : matches;
  const mapMatches = savedMatches.length > 0 ? savedMatches : matches;
  const currentMatch = swipeMatches[cardIndex] ?? matches[0];
  const currentQuestion = questionSteps[questionIndex];
  const currentAnswer = answers[currentQuestion.key];

  useEffect(() => {
    const persistedJourney = readPersistedJourneyState();

    if (persistedJourney) {
      setStage(persistedJourney.stage);
      setAnswers(persistedJourney.answers);
      setQuestionIndex(persistedJourney.questionIndex);
      setQuestionDirection(1);
      setLoadingMessageIndex(0);
      setSubmitError("");
      setCardIndex(persistedJourney.cardIndex);
      setCardDirection(1);
      setOpenRank(null);
      setVisitedRanks(persistedJourney.visitedRanks);
      setShareFeedback("");
      setSavedMatches(persistedJourney.savedMatches);
      setSessionId(persistedJourney.sessionId);
      setErrorMessage("");
    }

    setHasLoadedPersistedJourney(true);
  }, []);

  useEffect(() => {
    if (stage !== "loading") {
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((currentIndex) => (currentIndex + 1) % loadingMessages.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (!hasLoadedPersistedJourney) {
      return;
    }

    if (savedMatches.length === 0 || stage === "intro") {
      clearPersistedJourneyState();
      return;
    }

    if (!isPersistedJourneyStage(stage)) {
      return;
    }

    persistJourneyState({
      version: 1,
      stage,
      answers,
      questionIndex,
      cardIndex,
      visitedRanks,
      savedMatches,
      sessionId,
    });
  }, [
    answers,
    cardIndex,
    hasLoadedPersistedJourney,
    questionIndex,
    savedMatches,
    sessionId,
    stage,
    visitedRanks,
  ]);

  const goToStage = (nextStage: JourneyStage) => {
    setStage(nextStage);
    setShareFeedback("");
    setErrorMessage("");
  };

  const resetQuestionFlow = () => {
    setQuestionIndex(0);
    setQuestionDirection(1);
    setSubmitError("");
  };

  const resetJourneyState = () => {
    clearPersistedJourneyState();
    setAnswers(initialAnswers);
    setSavedMatches([]);
    setVisitedRanks([]);
    setCardIndex(0);
    setCardDirection(1);
    setOpenRank(null);
    setSessionId(null);
    resetQuestionFlow();
  };

  const discardLoadingSession = async (trackingSessionId: string | null) => {
    if (!trackingSessionId || savedMatches.length > 0) {
      return;
    }

    try {
      await fetch(`/api/feimec/tracking/sessions/${trackingSessionId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to discard FEIMEC tracking session", error);
    }
  };

  const createTrackingSession = async () => {
    const response = await fetch("/api/feimec/tracking/sessions", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Não foi possível iniciar sua sessão agora. Tente novamente.");
    }

    const payload = await readJsonResponse<CreateSessionResponse>(response);
    setSessionId(payload.session.id);

    return payload.session.id;
  };

  const handleStartJourney = async () => {
    setErrorMessage("");
    setShareFeedback("");
    setIsStartingSession(true);

    try {
      await discardLoadingSession(sessionId);
      resetJourneyState();
      await createTrackingSession();
      resetQuestionFlow();
      goToStage("question");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar sua sessão agora. Tente novamente.",
      );
    } finally {
      setIsStartingSession(false);
    }
  };

  const updateAnswer = (key: QuestionKey, value: string) => {
    const nextValue = key === "phone" ? formatBrazilianPhone(value) : value;

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [key]: nextValue,
    }));
  };

  const goBackFromQuestion = () => {
    setSubmitError("");

    if (questionIndex === 0) {
      void discardLoadingSession(sessionId);
      setSessionId(null);
      goToStage("intro");
      return;
    }

    setQuestionDirection(-1);
    setQuestionIndex((currentIndex) => currentIndex - 1);
  };

  const submitAnswers = async () => {
    const normalizedAnswers = {
      name: answers.name.trim(),
      phone: extractBrazilianPhoneDigits(answers.phone),
      role: answers.role.trim(),
    };

    if (!normalizedAnswers.name || !normalizedAnswers.phone || !normalizedAnswers.role) {
      setSubmitError("Preencha todos os campos para continuar.");
      return;
    }

    if (normalizedAnswers.phone.length < 10 || normalizedAnswers.phone.length > 11) {
      setSubmitError("Informe um telefone brasileiro válido para continuar.");
      return;
    }

    setSubmitError("");
    setErrorMessage("");
    setLoadingMessageIndex(0);
    setStage("loading");

    try {
      const activeSessionId = sessionId ?? (await createTrackingSession());
      const allowUpdate = Boolean(sessionId) && savedMatches.length > 0;
      const matchmakerResponse = await fetch("/api/matchmaker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedAnswers),
      });

      if (!matchmakerResponse.ok) {
        throw new Error(
          await readResponseError(matchmakerResponse, "Não foi possível buscar os matches agora."),
        );
      }

      const matchmakerPayload = await readResponsePayload(matchmakerResponse);
      const matchmakerMatches = extractMatchesFromPayload(matchmakerPayload);
      const hasFullMatchmakerResult = matchmakerMatches.length === matches.length;
      const matchRanks = hasFullMatchmakerResult
        ? matchmakerMatches.map((match) => match.rank)
        : extractMatchRanksFromPayload(matchmakerPayload);

      const trackingResponse = await fetch(
        `/api/feimec/tracking/sessions/${activeSessionId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...normalizedAnswers,
            brief: normalizedAnswers.role,
            matchRanks,
            matches: hasFullMatchmakerResult ? matchmakerMatches : undefined,
            allowUpdate,
          }),
        },
      );

      if (!trackingResponse.ok) {
        throw new Error(
          await readResponseError(trackingResponse, "Não foi possível salvar seus dados agora."),
        );
      }

      const trackingPayload = await readJsonResponse<TrackingCompletionPayload>(trackingResponse);

      setSavedMatches(
        hasFullMatchmakerResult
          ? matchmakerMatches
          : trackingPayload.matches.length > 0
            ? trackingPayload.matches
            : matches,
      );
      setCardIndex(0);
      setCardDirection(1);
      setOpenRank(null);
      goToStage("swipe");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar agora. Tente novamente.",
      );
      setStage("question");
    }
  };

  const advanceQuestion = () => {
    if (!currentAnswer.trim()) {
      return;
    }

    setSubmitError("");

    if (questionIndex === questionSteps.length - 1) {
      void submitAnswers();
      return;
    }

    setQuestionDirection(1);
    setQuestionIndex((currentIndex) => currentIndex + 1);
  };

  const moveCard = (direction: number) => {
    setCardDirection(direction);
    setCardIndex((currentIndex) => wrapIndex(currentIndex + direction, swipeMatches.length));
  };

  const handleReturnToQuestion = () => {
    setVisitedRanks([]);
    setCardIndex(0);
    setCardDirection(1);
    setOpenRank(null);
    resetQuestionFlow();
    goToStage("question");
  };

  const handleCardDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x <= -80 || info.velocity.x <= -500) {
      moveCard(1);
      return;
    }

    if (info.offset.x >= 80 || info.velocity.x >= 500) {
      moveCard(-1);
    }
  };

  const openMap = () => {
    setOpenRank(null);
    goToStage("map");
  };

  const toggleVisitedRank = (rank: number) => {
    setVisitedRanks((currentRanks) =>
      currentRanks.includes(rank)
        ? currentRanks.filter((currentRank) => currentRank !== rank)
        : [...currentRanks, rank],
    );
  };

  const shareMap = () => {
    setShareFeedback("Resumo salvo e pronto para compartilhar.");
  };

  return (
    <MotionConfig transition={{ duration: 0.5, ease: smoothEase }}>
      <main className={styles.shell}>
        <div className={styles.ambient} aria-hidden="true">
          <div className={`${styles.ambientGlow} ${styles.ambientGlowSoft}`} />
          <div className={`${styles.ambientGlow} ${styles.ambientGlowStrong}`} />
          <div className={styles.ambientGrid} />
        </div>

        {stage === "intro" ? (
          <motion.section
            key="intro"
            className={`${styles.stageCard} ${styles.lightStage} ${styles.introStage}`}
            initial={stageMotion.initial}
            animate={stageMotion.animate}
          >
            <div className={styles.brandBlock}>FEIMEC</div>

            <div className={styles.stageBody}>
              <h1 className={styles.introTitle}>
                Seu próximo negócio pode estar a <span>poucos estandes</span>
              </h1>

              <p className={styles.introDescription}>
                Descubra expositores, fornecedores e parceiros com maior fit para você em
                uma jornada rápida, fluida e com cara de produto final.
              </p>

              <div className={styles.orbitScene}>
                <div className={styles.orbitCenter}>
                  <Building2 size={28} />
                </div>

                {introIcons.map((Icon, index) => {
                  const orbitStyle = {
                    "--orbit-angle": `${index * 60}deg`,
                  } as CSSProperties;

                  return (
                    <div key={index} className={styles.orbitNode} style={orbitStyle}>
                      <div className={styles.orbitNodeInner}>
                        <Icon size={22} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.stageFooter}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  void handleStartJourney();
                }}
                disabled={isStartingSession}
              >
                <span>{isStartingSession ? "Iniciando sessão" : "Começar matchmaking"}</span>
                <ArrowRight size={18} />
              </button>

              {errorMessage ? (
                <p className={`${styles.statusBanner} ${styles.errorBanner}`}>{errorMessage}</p>
              ) : null}

              <div className={styles.stepDots}>
                <span className={`${styles.stepDot} ${styles.stepDotActive}`} />
                <span className={styles.stepDot} />
                <span className={styles.stepDot} />
              </div>
            </div>
          </motion.section>
        ) : null}

        {stage === "question" ? (
          <motion.section
            key="question"
            className={`${styles.stageCard} ${styles.lightStage} ${styles.questionStage}`}
            initial={stageMotion.initial}
            animate={stageMotion.animate}
          >
            <div className={styles.stageHeader}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Voltar"
                onClick={goBackFromQuestion}
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            <div className={styles.stageBody}>
              <div className={styles.questionProgress}>
                <p className={styles.questionKicker}>{currentQuestion.kicker}</p>
              </div>

              <AnimatePresence custom={questionDirection} initial={false} mode="wait">
                <motion.div
                  key={currentQuestion.key}
                  custom={questionDirection}
                  className={styles.questionPanel}
                  variants={questionStepMotion}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <h1 className={styles.questionTitle}>{currentQuestion.title}</h1>

                  {currentQuestion.multiline ? (
                    <textarea
                      id={currentQuestion.key}
                      className={styles.questionField}
                      aria-label={currentQuestion.title}
                      value={currentAnswer}
                      maxLength={currentQuestion.maxLength}
                      onChange={(event) => updateAnswer(currentQuestion.key, event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                  ) : (
                    <input
                      id={currentQuestion.key}
                      type={currentQuestion.inputMode === "tel" ? "tel" : "text"}
                      inputMode={currentQuestion.inputMode}
                      autoComplete={currentQuestion.autoComplete}
                      className={styles.questionInput}
                      aria-label={currentQuestion.title}
                      value={currentAnswer}
                      maxLength={currentQuestion.maxLength}
                      onChange={(event) => updateAnswer(currentQuestion.key, event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {submitError ? <p className={styles.submitError}>{submitError}</p> : null}
            </div>

            <div className={styles.stageFooter}>
              <button
                type="button"
                className={`${styles.primaryButton} ${styles.questionButton}`}
                onClick={advanceQuestion}
                disabled={!currentAnswer.trim()}
              >
                <span>
                  {questionIndex === questionSteps.length - 1 ? "Encontrar matches" : "Continuar"}
                </span>
              </button>
            </div>
          </motion.section>
        ) : null}

        {stage === "loading" ? (
          <motion.section
            key="loading"
            className={`${styles.stageCard} ${styles.darkStage} ${styles.loadingStage}`}
            initial={stageMotion.initial}
            animate={stageMotion.animate}
          >
            <div className={styles.loadingLayout}>
              <div className={styles.loadingHero}>
                <span className={styles.loadingEyebrow}>Preparando seus matches</span>
                <h1 className={styles.loadingTitle}>Montando seu radar industrial</h1>
              </div>

              <div className={styles.loadingVisual} aria-hidden="true">
                <motion.div
                  className={styles.loadingHalo}
                  animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.45, 0.9, 0.45] }}
                  transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
                />

                <div className={styles.loadingRadar} aria-hidden="true">
                  <motion.span
                    className={styles.loadingSweep}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3.8, ease: "linear", repeat: Infinity }}
                  />

                  <motion.span
                    className={`${styles.loadingBlip} ${styles.loadingBlipOne}`}
                    animate={{ scale: [0.88, 1.28, 0.88], opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                  />

                  <motion.span
                    className={`${styles.loadingBlip} ${styles.loadingBlipTwo}`}
                    animate={{ scale: [0.88, 1.22, 0.88], opacity: [0.3, 0.9, 0.3] }}
                    transition={{ duration: 1.9, ease: "easeInOut", repeat: Infinity, delay: 0.45 }}
                  />

                  <motion.span
                    className={`${styles.loadingBlip} ${styles.loadingBlipThree}`}
                    animate={{ scale: [0.82, 1.18, 0.82], opacity: [0.25, 0.75, 0.25] }}
                    transition={{ duration: 2.1, ease: "easeInOut", repeat: Infinity, delay: 0.9 }}
                  />

                  <div className={styles.loadingCore}>
                    <Sparkles size={26} />
                    <strong>Matchmaker</strong>
                    <span>radar ativo</span>
                  </div>
                </div>
              </div>

              <div className={styles.loadingFeed}>
                <span className={styles.loadingFeedLabel}>Processando agora</span>

                <AnimatePresence initial={false} mode="wait">
                  <motion.p
                    key={loadingMessages[loadingMessageIndex]}
                    className={styles.loadingMessage}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28, ease: smoothEase }}
                  >
                    {loadingMessages[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        ) : null}

        {stage === "swipe" ? (
          <motion.section
            key="swipe"
            className={`${styles.stageCard} ${styles.darkStage} ${styles.swipeStage}`}
            initial={stageMotion.initial}
            animate={stageMotion.animate}
          >
            <div className={styles.swipeTopBar}>
              <button
                type="button"
                className={styles.iconButtonDark}
                aria-label="Voltar"
                onClick={handleReturnToQuestion}
              >
                <ArrowLeft size={18} />
              </button>

              <div className={styles.swipeTitleGroup}>
                <h1 className={styles.swipeTitle}>Seu match ideal</h1>
                <span className={styles.swipeUnderline} />
              </div>

              <button type="button" className={styles.mapLinkButton} onClick={openMap}>
                Ver mapa completo
              </button>
            </div>

            <div className={styles.deckShell}>
              <div className={`${styles.deckLayer} ${styles.deckLayerOne}`} aria-hidden="true" />
              <div className={`${styles.deckLayer} ${styles.deckLayerTwo}`} aria-hidden="true" />

              <AnimatePresence custom={cardDirection} initial={false} mode="wait">
                <motion.article
                  key={currentMatch.rank}
                  custom={cardDirection}
                  className={styles.swipeCard}
                  variants={swipeCardMotion}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.12}
                  dragMomentum={false}
                  dragTransition={{ bounceStiffness: 420, bounceDamping: 32 }}
                  whileDrag={{ scale: 0.992 }}
                  style={{ transformOrigin: "center bottom" }}
                  onDragEnd={handleCardDragEnd}
                >
                  <div className={styles.swipeCardHeader}>
                    <div className={styles.cardIconCircle}>
                      <Building2 size={24} />
                    </div>

                    <div>
                      <h2 className={styles.swipeCompany}>{currentMatch.companyName}</h2>
                      <p className={styles.swipeBooth}>
                        <MapPin size={14} />
                        Estande {currentMatch.booth}
                      </p>
                    </div>
                  </div>

                  <div className={styles.swipeDivider} />

                  <div className={styles.matchBlock}>
                    <span className={styles.matchLabel}>Match</span>
                    <div className={styles.swipeScore}>
                      <strong>{currentMatch.match.toFixed(1)}</strong>
                      <span>/10</span>
                    </div>
                  </div>

                  <div className={styles.swipeDivider} />

                  <section className={styles.swipeSection}>
                    <div className={styles.inlineSectionTitle}>
                      <Star size={16} />
                      <span>Motivo objetivo</span>
                    </div>
                    <p className={styles.swipeCopy}>{currentMatch.why}</p>
                  </section>

                  <div className={styles.swipeDivider} />

                  <section className={styles.swipeSection}>
                    <div className={styles.inlineSectionTitle}>
                      <Sparkles size={16} />
                      <span>{currentMatch.connectionTips.length} dicas de conexão</span>
                    </div>

                    <ol className={styles.numberedTips}>
                      {currentMatch.connectionTips.map((tip, index) => (
                        <li key={tip} className={styles.numberedTip}>
                          <span className={styles.tipIndex}>{index + 1}</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </motion.article>
              </AnimatePresence>
            </div>

            <div className={styles.swipeFooter}>
              <p className={styles.swipeHint}>Deslize para ver outros matches</p>

              <div className={styles.swipeControls}>
                <button
                  type="button"
                  className={styles.controlButton}
                  aria-label="Anterior card"
                  onClick={() => moveCard(-1)}
                >
                  <ChevronLeft size={20} />
                </button>

                <div className={styles.controlDots}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      key={index}
                      className={`${styles.controlDot} ${
                        index === cardIndex % 5 ? styles.controlDotActive : ""
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.controlButton}
                  aria-label="Próximo card"
                  onClick={() => moveCard(1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.section>
        ) : null}

        {stage === "map" ? (
          <motion.section
            key="map"
            className={styles.mapStage}
            initial={stageMotion.initial}
            animate={stageMotion.animate}
          >
            <div className={styles.mapHeader}>
              <div>
                <span className={styles.mapEyebrow}>Mapa completo</span>
                <h1 className={styles.mapTitle}>Seus matches prontos para compartilhar</h1>
                <p className={styles.mapDescription}>
                  A visão completa mantém o ranking aberto, mas agora você também consegue
                  voltar para o swipe a qualquer momento.
                </p>
              </div>

              <div className={styles.mapActions}>
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={() => goToStage("swipe")}
                >
                  Voltar para o swipe
                </button>
                <button type="button" className={styles.primaryButton} onClick={shareMap}>
                  <Share2 size={18} />
                  <span>Compartilhar mapa</span>
                </button>
              </div>
            </div>

            {shareFeedback ? <p className={styles.shareFeedback}>{shareFeedback}</p> : null}

            <div className={styles.rankingHeader}>
              <h2 className={styles.rankingTitle}>
                {mapMatches.length} oportunidades prontas para abordagem
              </h2>
            </div>

            <div className={styles.rankingList}>
              {mapMatches.map((match) => {
                const isOpen = openRank === match.rank;
                const isVisited = visitedRanks.includes(match.rank);
                const leadTip = match.connectionTips[0];
                const medalTone = getMedalTone(match.rank);
                const medalLabel = medalTone ? getMedalLabel(medalTone) : null;
                const previewReason =
                  match.why.length > 132 ? `${match.why.slice(0, 129).trim()}...` : match.why;
                const progressStyle = {
                  "--match-progress": `${match.match * 10}%`,
                } as CSSProperties;
                const medalCardClassName =
                  medalTone === "gold"
                    ? styles.rankingCardGold
                    : medalTone === "silver"
                      ? styles.rankingCardSilver
                      : medalTone === "bronze"
                        ? styles.rankingCardBronze
                        : "";
                const medalBadgeClassName =
                  medalTone === "gold"
                    ? styles.medalGold
                    : medalTone === "silver"
                      ? styles.medalSilver
                      : medalTone === "bronze"
                        ? styles.medalBronze
                        : "";

                return (
                  <motion.article
                    key={match.rank}
                    className={`${styles.rankingCard} ${medalCardClassName} ${
                      isOpen ? styles.rankingCardOpen : ""
                    } ${isVisited ? styles.rankingCardVisited : ""}`}
                    layout
                  >
                    <button
                      type="button"
                      className={styles.rankingButton}
                      aria-expanded={isOpen}
                      aria-controls={`match-panel-${match.rank}`}
                      aria-label={`Ver detalhes da ${match.companyName}`}
                      onClick={() =>
                        setOpenRank((currentRank) =>
                          currentRank === match.rank ? null : match.rank,
                        )
                      }
                    >
                      <div className={styles.rankingMain}>
                        <div className={styles.rankingTopRow}>
                          <div className={styles.cardQuickMeta}>
                            <span className={`${styles.rankBadge} ${medalBadgeClassName}`}>
                              #{match.rank}
                            </span>
                            {medalLabel ? (
                              <span className={`${styles.priorityChip} ${medalBadgeClassName}`}>
                                {medalLabel}
                              </span>
                            ) : null}
                          </div>

                          <span className={`${styles.scoreBadge} ${medalBadgeClassName}`}>
                            {match.match.toFixed(1)}
                          </span>
                        </div>

                        <div className={styles.companyLine}>
                          <h3 className={styles.companyName}>{match.companyName}</h3>

                          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}>
                            <ChevronDown size={18} />
                          </span>
                        </div>

                        <div className={styles.metaRow}>
                          <span className={styles.metaItem}>
                            <MapPin size={14} />
                            {match.booth}
                          </span>
                          <span className={styles.metaItem}>
                            <Sparkles size={14} />
                            {match.connectionTips.length} ações
                          </span>
                        </div>

                        <div className={styles.companyBlock}>
                          <p className={styles.previewReason}>{previewReason}</p>

                          <div className={styles.actionPreview}>
                            <span className={styles.actionPreviewLabel}>
                              <Target size={14} />
                              Ação recomendada
                            </span>

                            <p className={styles.actionPreviewText}>{leadTip}</p>
                          </div>

                          <div className={styles.rankingFooterRow}>
                            <div className={styles.progressTrack} style={progressStyle}>
                              <span className={styles.progressValue} />
                            </div>

                            <span className={styles.expandCopy}>
                              {isOpen ? "Toque para recolher" : "Toque para ver plano de abordagem"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className={styles.rankingActionsRow}>
                      <button
                        type="button"
                        className={`${styles.visitToggle} ${
                          isVisited ? styles.visitToggleActive : ""
                        }`}
                        aria-label={
                          isVisited
                            ? `${match.companyName} marcado como visitado`
                            : `Marcar ${match.companyName} como visitado`
                        }
                        aria-pressed={isVisited}
                        onClick={() => toggleVisitedRank(match.rank)}
                      >
                        <CheckCircle2 size={16} />
                        <span>{isVisited ? "Visitado" : "Marcar visitado"}</span>
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          id={`match-panel-${match.rank}`}
                          className={styles.detailPanel}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: smoothEase }}
                        >
                          <div className={styles.detailSection}>
                            <span className={styles.detailSectionTitle}>
                              <Star size={14} />
                              Por que faz sentido
                            </span>
                            <p className={styles.detailCopy}>{match.why}</p>
                          </div>

                          <div className={styles.detailSection}>
                            <span className={styles.detailSectionTitle}>
                              <Target size={14} />
                              Plano de abordagem
                            </span>

                            <ul className={styles.detailList}>
                              {match.connectionTips.map((tip, index) => (
                                <li key={tip} className={styles.detailItem}>
                                  <span className={styles.detailItemIndex}>{index + 1}</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          </motion.section>
        ) : null}
      </main>
    </MotionConfig>
  );
}
