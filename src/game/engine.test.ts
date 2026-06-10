import { describe, expect, it } from "vitest";
import { gameDatabase } from "../data/gameDatabase";
import {
  chooseOption,
  createInitialGameState,
  getCardsForRole,
  getCurrentCard,
  getDesignerReport,
  getOptionAvailability,
  getOptionsForCard,
  scoreOutcome,
} from "./engine";

describe("game engine", () => {
  it("starts Ferdinand II with Wilson's prewar settlement frame before Prague", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const ferdinandCards = gameDatabase.cards.filter(
      (card) => card.role_id === "role_ferdinand_ii",
    );
    const prePragueCards = ferdinandCards.slice(
      0,
      ferdinandCards.findIndex(
        (card) => card.id === "card_1618_prague_defenestration",
      ),
    );

    expect(state.roleId).toBe("role_ferdinand_ii");
    expect(state.pressures.imperial_authority).toBeGreaterThan(50);
    expect(state.pressures.estate_trust).toBeLessThan(50);
    expect(prePragueCards.length).toBeGreaterThanOrEqual(4);
    expect(prePragueCards.map((card) => card.phase_id)).toContain(
      "phase_prewar_settlement",
    );
    expect(prePragueCards.map((card) => card.id)).toContain(
      "card_1598_styrian_reform",
    );
    expect(
      ferdinandCards.findIndex((card) => card.id === "card_1598_styrian_reform"),
    ).toBeLessThan(
      ferdinandCards.findIndex((card) => card.id === "card_1617_bohemian_enforcement"),
    );
    expect(prePragueCards[0]?.date_label).toContain("1555");
    expect(prePragueCards[0]?.source_refs).toContain(
      "src_wilson_europes_tragedy",
    );
    expect(getCurrentCard(gameDatabase, state)?.id).not.toBe(
      "card_1618_prague_defenestration",
    );
  });

  it("makes a useful decision create new problems", () => {
    const initial = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const state = {
      ...initial,
      cardIndex: getCardsForRole(gameDatabase, initial).findIndex(
        (card) => card.id === "card_1620_bavarian_army",
      ),
    };
    const card = getCurrentCard(gameDatabase, state);
    expect(card).toBeTruthy();

    const option = card!.options.find(
      (item) => item.id === "opt_bavarian_military_assistance",
    );
    expect(option).toBeTruthy();

    const next = chooseOption(gameDatabase, state, card!.id, option!.id);

    expect(next.pressures.military_dependence).toBeGreaterThan(
      state.pressures.military_dependence,
    );
    expect(next.log.at(-1)?.consequence).toContain("Bavarian");
  });

  it("keeps the Bavarian bargain tied to Munich Treaty constraints", () => {
    const card = gameDatabase.cards.find(
      (item) => item.id === "card_1620_bavarian_army",
    );
    const decisionPoint = gameDatabase.decision_points.find(
      (item) => item.id === "dp_1620_bavarian_assistance",
    );

    expect(card?.source_refs).toContain("src_vales_munich_treaty_1619");
    expect(card?.causal_claim_ids).toContain(
      "claim_munich_treaty_restricts_ferdinand_policy",
    );
    expect(decisionPoint?.known_constraints.join(" ")).toMatch(
      /separate negotiations.*peace/i,
    );
    expect(card?.historian_note).toMatch(/Munich Treaty/i);
  });

  it("connects the Palatine electoral transfer to the earlier Bavarian bargain", () => {
    const card = gameDatabase.cards.find(
      (item) => item.id === "card_1623_electoral_transfer",
    );
    const decisionPoint = gameDatabase.decision_points.find(
      (item) => item.id === "dp_1623_electoral_transfer",
    );

    expect(card?.source_refs).toContain("src_vales_munich_treaty_1619");
    expect(card?.historian_note).toMatch(/secret.*promise/i);
    expect(decisionPoint?.known_constraints.join(" ")).toMatch(
      /exceeded.*legal competence/i,
    );
  });

  it("treats Ferdinand's Frankfurt coronation as oath-bound crisis legitimacy", () => {
    const card = gameDatabase.cards.find(
      (item) => item.id === "card_1619_frankfurt_coronation",
    );
    const decisionPoint = gameDatabase.decision_points.find(
      (item) => item.id === "dp_1619_frankfurt_coronation_crisis",
    );

    expect(card?.source_refs).toContain(
      "src_public_relation_ferdinand_election_coronation_1620",
    );
    expect(card?.causal_claim_ids).toContain(
      "claim_frankfurt_coronation_oath_legitimacy",
    );
    expect(decisionPoint?.known_constraints.join(" ")).toMatch(
      /Bohemian.*crisis/i,
    );
    expect(decisionPoint?.known_constraints.join(" ")).toMatch(
      /military pressure/i,
    );
  });

  it("uses the close-read imperial ban once, then moves into Palatine settlement", () => {
    const source = gameDatabase.sources.find(
      (item) => item.id === "src_public_reichsacht_frederick_1621",
    );
    const banCard = gameDatabase.cards.find(
      (item) => item.id === "card_1621_ban_of_frederick",
    );
    const duplicateBanCard = gameDatabase.cards.find(
      (item) => item.id === "card_1622_frederick_ban",
    );
    const settlementCard = gameDatabase.cards.find(
      (item) => item.id === "card_1622_palatine_settlement",
    );

    expect(source?.reading_status).toBe("notes_recorded");
    expect(banCard?.historian_note).toMatch(/ipso facto/i);
    expect(duplicateBanCard).toBeUndefined();
    expect(settlementCard?.title).toMatch(/Paladins|Palatine/i);
    expect(settlementCard?.source_refs).toContain("src_wilson_europes_tragedy");
  });

  it("keeps a visible trace from player choice to causal claim", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const card = getCurrentCard(gameDatabase, state)!;
    const next = chooseOption(gameDatabase, state, card.id, card.options[0].id);

    expect(next.log[0].causal_claim_ids.length).toBeGreaterThan(0);
    expect(
      gameDatabase.causal_claims.find(
        (claim) => claim.id === next.log[0].causal_claim_ids[0],
      ),
    ).toMatchObject({
      review_status: expect.stringMatching(/reviewed|needs_review|inferred/),
    });
  });

  it("turns pressure movement into historical aftermath notes without exposing numbers", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const card = getCurrentCard(gameDatabase, state)!;
    const next = chooseOption(
      gameDatabase,
      state,
      card.id,
      "opt_augsburg_compromise_inheritance",
    );
    const notes = next.log.at(-1)?.impact_notes ?? [];

    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(notes.join(" ")).toMatch(/Moderate estates|Doubtful estates|Petitioners/i);
    expect(notes.join(" ")).not.toMatch(/[+-]\d/);
    expect(notes.join(" ")).not.toMatch(/estate_trust|imperial_authority/i);
  });

  it("keeps aftermath consequences as attached bullets while retaining backend notes", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const card = getCurrentCard(gameDatabase, state)!;
    const next = chooseOption(
      gameDatabase,
      state,
      card.id,
      "opt_augsburg_compromise_inheritance",
    );
    const entry = next.log.at(-1)!;

    expect(entry.aftermath).toContain("The court appears as guardian");
    expect(entry.aftermath).not.toMatch(/Consequences carried forward|[+-]\d/);
    expect(entry.aftermath_bullets.length).toBeGreaterThanOrEqual(3);
    expect(entry.aftermath_bullets.join(" ")).toMatch(
      /Moderate estates|Doubtful estates|Petitioners/i,
    );
    expect(entry.aftermath_bullets.join(" ")).not.toMatch(
      /Consequences carried forward|[+-]\d|estate_trust|imperial_authority/i,
    );
    expect(entry.impact_notes.length).toBeGreaterThan(0);
  });

  it("keeps the main aftermath paragraph from repeating the attached bullets", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const card = getCurrentCard(gameDatabase, state)!;
    const next = chooseOption(
      gameDatabase,
      state,
      card.id,
      "opt_augsburg_compromise_inheritance",
    );
    const entry = next.log.at(-1)!;
    const aftermath = entry.aftermath;
    const sentenceCount = aftermath
      .split(/[.!?]\s+/)
      .filter((sentence) => sentence.trim().length > 0).length;

    expect(sentenceCount).toBeLessThanOrEqual(2);
    expect(aftermath).not.toMatch(/submission\. Catholic reformers/i);
    entry.aftermath_bullets.forEach((bullet) => {
      expect(aftermath).not.toContain(bullet);
    });
  });

  it("varies consequence prose across different choices with similar effects", () => {
    const firstCard = gameDatabase.cards[0];
    const sharedOption = firstCard.options[0];
    const database = {
      ...gameDatabase,
      cards: [
        {
          ...firstCard,
          options: [
            {
              ...sharedOption,
              id: "opt_test_estates_a",
              label: "Open one channel of consultation.",
              consequence: "The files remain open and no estate is forced to retreat today.",
              effects: {
                estate_trust: 8,
                imperial_authority: -3,
              },
            },
            {
              ...sharedOption,
              id: "opt_test_estates_b",
              label: "Open a second channel of consultation.",
              consequence: "The files remain open and no estate is forced to retreat today.",
              effects: {
                estate_trust: 8,
                imperial_authority: -3,
              },
            },
          ],
        },
        ...gameDatabase.cards.slice(1),
      ],
    };
    const state = createInitialGameState(database, "role_ferdinand_ii");
    const afterFirst = chooseOption(
      database,
      state,
      firstCard.id,
      "opt_test_estates_a",
    );
    const afterSecond = chooseOption(
      database,
      state,
      firstCard.id,
      "opt_test_estates_b",
    );

    expect(afterFirst.log.at(-1)?.impact_notes.join(" ")).not.toBe(
      afterSecond.log.at(-1)?.impact_notes.join(" "),
    );
    expect(afterFirst.log.at(-1)?.aftermath_bullets.join(" ")).not.toBe(
      afterSecond.log.at(-1)?.aftermath_bullets.join(" "),
    );
  });

  it("carries prior choices into later dispatch wording", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const firstCard = getCurrentCard(gameDatabase, state)!;
    const compromise = firstCard.options.find(
      (option) => option.id === "opt_augsburg_compromise_inheritance",
    )!;

    const afterCompromise = chooseOption(
      gameDatabase,
      state,
      firstCard.id,
      compromise.id,
    );
    const nextCard = getCurrentCard(gameDatabase, afterCompromise);

    expect(afterCompromise.memory_tags).toContain("augsburg_consultation");
    expect(nextCard?.briefing).toContain("Because the court has chosen consultation");
    expect(nextCard?.situation).toContain("that earlier posture");
  });

  it("can create or suppress future dispatches from prior choices", () => {
    const conditionalCard = {
      ...gameDatabase.cards[1],
      id: "card_test_conditional_dispatch",
      title: "Conditional Dispatch",
      requires_memory_tags: ["augsburg_strict"],
    };
    const database = {
      ...gameDatabase,
      cards: [
        gameDatabase.cards[0],
        conditionalCard,
        ...gameDatabase.cards.slice(1),
      ],
    };
    const state = createInitialGameState(database, "role_ferdinand_ii");
    const firstCard = getCurrentCard(database, state)!;

    const afterStrict = chooseOption(
      database,
      state,
      firstCard.id,
      "opt_augsburg_enforcement_inheritance",
    );
    const afterCompromise = chooseOption(
      database,
      state,
      firstCard.id,
      "opt_augsburg_compromise_inheritance",
    );

    expect(getCardsForRole(database, afterStrict).map((card) => card.id)).toContain(
      "card_test_conditional_dispatch",
    );
    expect(getCurrentCard(database, afterStrict)?.id).toBe(
      "card_test_conditional_dispatch",
    );
    expect(
      getCardsForRole(database, afterCompromise).map((card) => card.id),
    ).not.toContain("card_test_conditional_dispatch");
    expect(getCurrentCard(database, afterCompromise)?.id).toBe(
      "card_1608_security_blocs",
    );
  });

  it("expands Ferdinand's playable deck through the 1629 restitution crisis", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");

    expect(getCardsForRole(gameDatabase, state).map((card) => card.id)).toContain(
      "card_1629_restitution_edict",
    );
  });

  it("orders the Palatine branch after Frederick's January 1621 ban", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const visibleCardIds = getCardsForRole(gameDatabase, state).map(
      (card) => card.id,
    );

    expect(visibleCardIds).not.toContain("card_1622_catholic_restoration");
    expect(visibleCardIds.indexOf("card_1621_ban_of_frederick")).toBeLessThan(
      visibleCardIds.indexOf("card_1622_palatine_settlement"),
    );
    expect(visibleCardIds.indexOf("card_1623_peace_feelers")).toBeGreaterThan(
      visibleCardIds.indexOf("card_1623_electoral_transfer"),
    );
  });

  it("lets Wilson-backed alternatives rewrite the later sequence", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const kleslCardIndex = getCardsForRole(gameDatabase, state).findIndex(
      (card) => card.id === "card_1618_remove_klesl",
    );
    const kleslCard = getCardsForRole(gameDatabase, state)[kleslCardIndex];
    expect(kleslCard).toBeTruthy();

    const afterRetainingKlesl = chooseOption(
      gameDatabase,
      { ...state, cardIndex: kleslCardIndex },
      kleslCard.id,
      "opt_keep_klesl_negotiating",
    );

    expect(afterRetainingKlesl.memory_tags).toContain("klesl_retained");
    expect(
      getCardsForRole(gameDatabase, afterRetainingKlesl).map((card) => card.id),
    ).toContain("card_1618_mediation_channel");
    expect(
      getCardsForRole(gameDatabase, afterRetainingKlesl).map((card) => card.id),
    ).not.toContain("card_1619_stormy_petition");

    const afterRemovingKlesl = chooseOption(
      gameDatabase,
      { ...state, cardIndex: kleslCardIndex },
      kleslCard.id,
      "opt_remove_klesl_decisively",
    );

    expect(afterRemovingKlesl.memory_tags).toContain("klesl_removed");
    expect(
      getCardsForRole(gameDatabase, afterRemovingKlesl).map((card) => card.id),
    ).toContain("card_1619_stormy_petition");
  });

  it("records when a choice adds later dispatches to the docket", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const kleslCardIndex = getCardsForRole(gameDatabase, state).findIndex(
      (card) => card.id === "card_1618_remove_klesl",
    );
    const kleslCard = getCardsForRole(gameDatabase, state)[kleslCardIndex];
    const afterRetainingKlesl = chooseOption(
      gameDatabase,
      { ...state, cardIndex: kleslCardIndex },
      kleslCard.id,
      "opt_keep_klesl_negotiating",
    );

    expect(afterRetainingKlesl.log.at(-1)?.docket_changes).toContainEqual(
      expect.objectContaining({
        kind: "added",
        title: "Terms Carried Between Courts",
      }),
    );
  });

  it("lets pressure levels open or close later options", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const card = gameDatabase.cards.find(
      (item) => item.id === "card_1623_electoral_transfer",
    )!;
    const balanceOption = card.options.find(
      (option) => option.id === "opt_preserve_electoral_balance",
    )!;

    const dependentState = {
      ...state,
      pressures: {
        ...state.pressures,
        military_dependence: 82,
        estate_trust: 28,
      },
    };
    const freerState = {
      ...state,
      pressures: {
        ...state.pressures,
        military_dependence: 38,
        estate_trust: 66,
      },
    };

    expect(getOptionAvailability(balanceOption, dependentState)).toMatchObject({
      available: false,
    });
    expect(getOptionsForCard(card, dependentState).map((option) => option.id)).not.toContain(
      "opt_preserve_electoral_balance",
    );
    expect(getOptionsForCard(card, freerState).map((option) => option.id)).toContain(
      "opt_preserve_electoral_balance",
    );
  });

  it("uses pressure levels to add crisis dispatches to the deck", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const calmDeck = getCardsForRole(gameDatabase, state).map((card) => card.id);
    const interventionDeck = getCardsForRole(gameDatabase, {
      ...state,
      pressures: {
        ...state.pressures,
        foreign_intervention_risk: 78,
      },
    }).map((card) => card.id);

    expect(calmDeck).not.toContain("card_1631_intervention_crisis");
    expect(interventionDeck).toContain("card_1631_intervention_crisis");
  });

  it("explains hidden cards and locked options for the private designer view", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const kleslCardIndex = getCardsForRole(gameDatabase, state).findIndex(
      (card) => card.id === "card_1618_remove_klesl",
    );
    const kleslCard = getCardsForRole(gameDatabase, state)[kleslCardIndex];
    const afterRetainingKlesl = chooseOption(
      gameDatabase,
      { ...state, cardIndex: kleslCardIndex },
      kleslCard.id,
      "opt_keep_klesl_negotiating",
    );

    const report = getDesignerReport(gameDatabase, afterRetainingKlesl);

    expect(report.visible_card_ids).toContain("card_1618_mediation_channel");
    expect(report.skipped_cards).toContainEqual(
      expect.objectContaining({
        card_id: "card_1619_stormy_petition",
        reasons: expect.arrayContaining([
          expect.stringContaining("klesl_removed"),
        ]),
      }),
    );

    const electoralTransferIndex = getCardsForRole(gameDatabase, state).findIndex(
      (card) => card.id === "card_1623_electoral_transfer",
    );
    const dependentState = {
      ...state,
      cardIndex: electoralTransferIndex,
      pressures: {
        ...state.pressures,
        military_dependence: 82,
        estate_trust: 28,
      },
    };
    const optionReport = getDesignerReport(gameDatabase, dependentState);

    expect(optionReport.current_options).toContainEqual(
      expect.objectContaining({
        option_id: "opt_preserve_electoral_balance",
        available: false,
        reason: expect.stringContaining("Bavarian claims"),
      }),
    );
  });

  it("scores Ferdinand's ending from the path taken as well as the meters", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const restrained = scoreOutcome(gameDatabase, {
      ...state,
      completed: true,
      memory_tags: [
        "prague_amnesty_broad",
        "palatine_proxy_settlement",
        "restitution_peace_bargain",
        "ferdinand_iii_elected",
      ],
    });
    const hardLine = scoreOutcome(gameDatabase, {
      ...state,
      completed: true,
      memory_tags: [
        "prague_exclusions_hardline",
        "blood_court_executions",
        "restitution_edict_issued",
        "ferdinand_iii_elected",
      ],
    });

    expect(restrained.title).toBe("A Settlement Bought by Restraint");
    expect(restrained.legacy).toMatch(/concession/i);
    expect(hardLine.title).toBe("Hard Victory, Unquiet Empire");
    expect(hardLine.legacy).toMatch(/punishment|Edict/i);
  });
});
