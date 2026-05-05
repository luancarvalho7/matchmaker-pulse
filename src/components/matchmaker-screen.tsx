"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  Handshake,
  Heart,
  MapPin,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Truck,
} from "lucide-react";

import { matches } from "@/data/matches";

import styles from "./matchmaker-screen.module.css";

type JourneyStage = "intro" | "question" | "swipe" | "map";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const swipeExitEase = [0.32, 0.72, 0, 1] as const;
const swipeSpring = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.72,
} as const;
const introIcons = [Factory, Handshake, Settings2, TrendingUp, Truck, Building2];

const stageMotion = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEase },
  },
};

const swipeCardMotion = {
  enter: (direction: number) => ({
    opacity: 0.6,
    x: direction > 0 ? 54 : -54,
    rotate: direction > 0 ? 2.4 : -2.4,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    rotate: 0,
    scale: 1,
    transition: swipeSpring,
  },
  exit: (direction: number) => ({
    opacity: 0.35,
    x: direction > 0 ? -72 : 72,
    rotate: direction > 0 ? -3.5 : 3.5,
    scale: 0.97,
    transition: { duration: 0.22, ease: swipeExitEase },
  }),
};

function wrapIndex(index: number) {
  return (index + matches.length) % matches.length;
}

export function MatchmakerScreen() {
  const [stage, setStage] = useState<JourneyStage>("intro");
  const [brief, setBrief] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [cardDirection, setCardDirection] = useState(1);
  const [openRank, setOpenRank] = useState<number | null>(null);
  const [shareFeedback, setShareFeedback] = useState("");

  const currentMatch = matches[cardIndex];

  const goToStage = (nextStage: JourneyStage) => {
    setStage(nextStage);
    setShareFeedback("");
  };

  const moveCard = (direction: number) => {
    setCardDirection(direction);
    setCardIndex((currentIndex) => wrapIndex(currentIndex + direction));
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

  const shareMap = () => {
    setShareFeedback(
      "Resumo pronto para compartilhar. Mock liberado para a próxima integração.",
    );
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
                onClick={() => goToStage("question")}
              >
                <span className={styles.primaryButtonIcon}>
                  <Heart size={18} />
                </span>
                <span>Começar matchmaking</span>
                <ArrowRight size={18} />
              </button>

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
                onClick={() => goToStage("intro")}
              >
                <ArrowLeft size={18} />
              </button>

              <div className={styles.brandBlock}>FEIMEC</div>
            </div>

            <div className={styles.stageBody}>
              <p className={styles.questionKicker}>1 pergunta rápida</p>
              <h1 className={styles.questionTitle}>Quem é você e o que você faz?</h1>

              <label htmlFor="brief" className={styles.fieldLabel}>
                Descreva sua empresa, cargo, área e objetivo na feira
              </label>

              <textarea
                id="brief"
                className={styles.questionField}
                value={brief}
                maxLength={500}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Descreva sua empresa, cargo, área e objetivo na feira"
              />

              <div className={styles.fieldMeta}>
                <span>Isso só orienta o contexto visual desta demo mockada.</span>
                <span>{brief.length}/500</span>
              </div>
            </div>

            <div className={styles.stageFooter}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => goToStage("swipe")}
                disabled={!brief.trim()}
              >
                <span>Ver meus matches</span>
                <ArrowRight size={18} />
              </button>
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
                onClick={() => goToStage("question")}
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

              <AnimatePresence custom={cardDirection} initial={false}>
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
              <h2 className={styles.rankingTitle}>20 oportunidades prontas para abordagem</h2>
            </div>

            <div className={styles.rankingList}>
              {matches.map((match) => {
                const isOpen = openRank === match.rank;
                const leadTip = match.connectionTips[0];
                const previewReason =
                  match.why.length > 132 ? `${match.why.slice(0, 129).trim()}...` : match.why;
                const progressStyle = {
                  "--match-progress": `${match.match * 10}%`,
                } as CSSProperties;

                return (
                  <motion.article
                    key={match.rank}
                    className={`${styles.rankingCard} ${isOpen ? styles.rankingCardOpen : ""}`}
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
                            <span className={styles.rankBadge}>#{match.rank}</span>
                            {match.rank <= 3 ? (
                              <span className={styles.priorityChip}>Top match</span>
                            ) : null}
                          </div>

                          <span className={styles.scoreBadge}>{match.match.toFixed(1)}</span>
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
