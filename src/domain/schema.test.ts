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
