import { describe, expect, it } from "vitest";
import { validateGameDatabase } from "./schemas";
import { gameDatabase } from "../data/gameDatabase";

describe("historical database validation", () => {
  it("accepts the bundled 1618-1623 data spine", () => {
    expect(() => validateGameDatabase(gameDatabase)).not.toThrow();
  });

  it("rejects causal claims that skip evidence layers", () => {
    const broken = structuredClone(gameDatabase);
    broken.causal_claims[0].source_backed_interpretation = "";

    expect(() => validateGameDatabase(broken)).toThrow(
      /source-backed interpretation/i,
    );
  });

  it("requires each playable card to explain how the situation developed", () => {
    const broken = structuredClone(gameDatabase);
    delete (broken.cards[0] as { briefing?: string }).briefing;

    expect(() => validateGameDatabase(broken)).toThrow();
  });

  it("requires alternative card options to carry backend counterfactual tracking", () => {
    const broken = structuredClone(gameDatabase);
    const alternative = broken.cards
      .flatMap((card) => card.options)
      .find((option) => option.historical_option !== true);

    expect(alternative).toBeTruthy();
    delete (alternative as { research_tags?: string[] }).research_tags;
    delete (alternative as { counterfactual_source_status?: string })
      .counterfactual_source_status;

    expect(() => validateGameDatabase(broken)).toThrow(/counterfactual tracking/i);
  });

  it("requires card context links to point at in-game dossiers", () => {
    expect(gameDatabase.dossiers.length).toBeGreaterThan(10);
    const linkedCards = gameDatabase.cards.filter(
      (card) => (card.context_links ?? []).length > 0,
    );

    expect(linkedCards.length).toBeGreaterThan(0);

    const broken = structuredClone(gameDatabase);
    broken.cards[0] = {
      ...broken.cards[0],
      context_links: [
        {
          term: "Peace of Augsburg",
          dossier_id: "missing_dossier",
        },
      ],
    };

    expect(() => validateGameDatabase(broken)).toThrow(/Unknown dossier/i);
  });

  it("keeps late-reign dispatches connected to in-game dossiers", () => {
    const lateStartIndex = gameDatabase.cards.findIndex(
      (card) => card.id === "card_1629_lubeck_peace",
    );
    const linkedLateCards = gameDatabase.cards.filter(
      (card, index) => index >= lateStartIndex && (card.context_links ?? []).length > 0,
    );
    const lateCardIds = linkedLateCards.map((card) => card.id);

    expect(lateCardIds).toEqual(
      expect.arrayContaining([
        "card_1629_restitution_edict",
        "card_1630_regensburg_wallenstein",
        "card_1631_intervention_crisis",
        "card_1632_recall_wallenstein",
        "card_1635_prague_peace",
        "card_1637_ferdinand_iii_election",
      ]),
    );
    expect(
      new Set(
        linkedLateCards
          .flatMap((card) => card.context_links ?? [])
          .map((link) => link.dossier_id),
      ).size,
    ).toBeGreaterThanOrEqual(8);
  });

  it("requires pressure thresholds to be sourced and useful", () => {
    expect(gameDatabase.pressure_thresholds.length).toBeGreaterThanOrEqual(12);
    expect(
      gameDatabase.pressure_thresholds.map((threshold) => threshold.pressure),
    ).toEqual(
      expect.arrayContaining(gameDatabase.game_variables.map((variable) => variable.id)),
    );
    expect(
      gameDatabase.pressure_thresholds.some(
        (threshold) => threshold.kind === "reward",
      ),
    ).toBe(true);
    expect(
      gameDatabase.pressure_thresholds.some(
        (threshold) => threshold.kind === "crisis",
      ),
    ).toBe(true);

    const broken = structuredClone(gameDatabase);
    broken.pressure_thresholds[0] = {
      ...broken.pressure_thresholds[0],
      source_refs: ["missing_source"],
    };

    expect(() => validateGameDatabase(broken)).toThrow(/Unknown source reference/i);
  });

  it("rejects reviewed records that cite unread scholarly books", () => {
    const broken = structuredClone(gameDatabase);
    broken.sources = broken.sources.map((source) =>
      source.id === "src_wilson_europes_tragedy"
        ? { ...source, reading_status: "needs_direct_reading" }
        : source,
    );
    broken.cards[0] = {
      ...broken.cards[0],
      review_status: "reviewed",
      source_refs: ["src_wilson_europes_tragedy"],
    };

    expect(() => validateGameDatabase(broken)).toThrow(/unread scholarly/i);
  });
});
