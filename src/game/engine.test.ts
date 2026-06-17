import { describe, expect, it } from "vitest";
import { gameDatabase } from "../data/gameDatabase";
import {
  chooseOption,
  createInitialGameState,
  getCardsForRole,
  getCurrentCard,
  getActivePressureThresholds,
  getDesignerReport,
  getOptionAvailability,
  getOptionsForCard,
  getPressureWarnings,
  scoreOutcome,
  type GameState,
} from "./engine";

function seekTo(
  database: typeof gameDatabase,
  state: GameState,
  cardId: string,
): GameState {
  const deck = getCardsForRole(database, state);
  const index = deck.findIndex((card) => card.id === cardId);
  return {
    ...state,
    resolved_card_ids: deck.slice(0, index).map((card) => card.id),
  };
}

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

  it("gives the opening Augsburg dispatch enough footing before asking for a course", () => {
    const card = gameDatabase.cards.find(
      (item) => item.id === "card_1555_augsburg_settlement",
    );
    const text = `${card?.briefing} ${card?.situation}`;

    expect(text).toMatch(/Catholics? and Lutherans?/i);
    expect(text).toMatch(/prince|territorial ruler/i);
    expect(text).toMatch(/emigrate|leave/i);
    expect(text).toMatch(/ecclesiastical/i);
    expect(text).toMatch(/Calvinist|Reformed|outside the two recognized confessions/i);
    expect(text).toMatch(/public peace/i);
  });

  it("makes a useful decision create new problems", () => {
    const initial = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const state = seekTo(gameDatabase, initial, "card_1620_bavarian_army");
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

    expect(entry.aftermath).toContain("guardian of the settlement");
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
    expect(nextCard?.briefing).toMatch(/Auhausen/i);
    expect(nextCard?.briefing).toMatch(/Protestant Union/i);
    expect(nextCard?.briefing).toMatch(/Munich/i);
    expect(nextCard?.briefing).toMatch(/Catholic League|League/i);
    expect(nextCard?.briefing).not.toMatch(/^Because|Because the court has chosen/i);
    expect(nextCard?.situation).toMatch(/earlier restraint/i);
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
    const kleslState = seekTo(gameDatabase, state, "card_1618_remove_klesl");
    const kleslCard = getCurrentCard(gameDatabase, kleslState)!;
    expect(kleslCard).toBeTruthy();

    const afterRetainingKlesl = chooseOption(
      gameDatabase,
      kleslState,
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
      kleslState,
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
    const kleslState = seekTo(gameDatabase, state, "card_1618_remove_klesl");
    const kleslCard = getCurrentCard(gameDatabase, kleslState)!;
    const afterRetainingKlesl = chooseOption(
      gameDatabase,
      kleslState,
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

  it("makes early league policy change the later Bavarian bargain wording", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const leagueState = seekTo(gameDatabase, state, "card_1608_security_blocs");
    const leagueCard = getCurrentCard(gameDatabase, leagueState)!;
    const afterCatholicLeague = chooseOption(
      gameDatabase,
      leagueState,
      leagueCard.id,
      "opt_leagues_catholic_counterweight",
    );
    const bavarianCard = getCardsForRole(gameDatabase, afterCatholicLeague).find(
      (card) => card.id === "card_1620_bavarian_army",
    );

    expect(afterCatholicLeague.memory_tags).toContain("catholic_league_encouraged");
    expect(bavarianCard?.briefing).toMatch(/Munich|League/i);
    expect(bavarianCard?.situation).toMatch(/price|Bavarian|Maximilian/i);
  });

  it("lets hard restitution and rejected Leipzig terms add a Saxon rupture dispatch", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const restrainedDeck = getCardsForRole(gameDatabase, {
      ...state,
      memory_tags: ["restitution_narrow_cases", "leipzig_compromise"],
    }).map((card) => card.id);
    const ruptureDeck = getCardsForRole(gameDatabase, {
      ...state,
      memory_tags: ["restitution_edict_issued", "leipzig_rejected"],
      pressures: {
        ...state.pressures,
        foreign_intervention_risk: 82,
      },
    }).map((card) => card.id);

    expect(restrainedDeck).not.toContain("card_1631_saxon_break");
    expect(ruptureDeck).toContain("card_1631_saxon_break");
    expect(ruptureDeck.indexOf("card_1631_saxon_break")).toBeGreaterThan(
      ruptureDeck.indexOf("card_1631_intervention_crisis"),
    );
  });

  it("lets fiscal pressure close the least credible Wallenstein reward alternative", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const card = gameDatabase.cards.find(
      (item) => item.id === "card_1628_mecklenburg_reward",
    )!;
    const payWithoutLand = card.options.find(
      (option) => option.id === "opt_pay_wallenstein_without_land",
    )!;

    expect(
      getOptionAvailability(payWithoutLand, {
        ...state,
        pressures: {
          ...state.pressures,
          fiscal_capacity: 31,
        },
      }),
    ).toMatchObject({
      available: false,
      reason: expect.stringContaining("treasury"),
    });
    expect(
      getOptionAvailability(payWithoutLand, {
        ...state,
        pressures: {
          ...state.pressures,
          fiscal_capacity: 58,
        },
      }),
    ).toMatchObject({ available: true });
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

  it("derives active threshold tags from pressure levels without storing them as choices", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const thresholdState = {
      ...state,
      pressures: {
        ...state.pressures,
        estate_trust: 72,
        fiscal_capacity: 18,
        foreign_intervention_risk: 81,
      },
    };
    const activeThresholds = getActivePressureThresholds(
      gameDatabase,
      thresholdState,
    );
    const tags = activeThresholds.flatMap((threshold) => threshold.memory_tags);

    expect(tags).toContain("threshold_estate_trust_high");
    expect(tags).toContain("threshold_fiscal_capacity_crisis");
    expect(tags).toContain("threshold_foreign_intervention_crisis");
    expect(thresholdState.memory_tags).not.toContain(
      "threshold_fiscal_capacity_crisis",
    );
  });

  it("uses threshold tags to add pressure consequence and reward dispatches", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const visibleCardIds = getCardsForRole(gameDatabase, {
      ...state,
      pressures: {
        ...state.pressures,
        estate_trust: 72,
        fiscal_capacity: 18,
        foreign_intervention_risk: 81,
      },
    }).map((card) => card.id);

    expect(visibleCardIds).toContain("card_threshold_estates_offer_credit");
    expect(visibleCardIds).toContain("card_threshold_army_arrears");
    expect(visibleCardIds).toContain("card_threshold_foreign_courts");
  });

  it("shows active pressure thresholds only in the private designer report", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const report = getDesignerReport(gameDatabase, {
      ...state,
      pressures: {
        ...state.pressures,
        dynastic_security: 78,
        devastation: 82,
      },
    });

    expect(report.active_thresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threshold_id: "threshold_dynastic_security_high",
          label: expect.stringMatching(/succession/i),
        }),
        expect.objectContaining({
          threshold_id: "threshold_devastation_crisis",
          label: expect.stringMatching(/devastation/i),
        }),
      ]),
    );
  });

  it("explains hidden cards and locked options for the private designer view", () => {
    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const kleslState = seekTo(gameDatabase, state, "card_1618_remove_klesl");
    const kleslCard = getCurrentCard(gameDatabase, kleslState)!;
    const afterRetainingKlesl = chooseOption(
      gameDatabase,
      kleslState,
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

    const dependentState = {
      ...seekTo(gameDatabase, state, "card_1623_electoral_transfer"),
      pressures: {
        ...state.pressures,
        // estate trust below the option's floor locks the course; military kept
        // out of crisis so no crisis card interrupts the electoral-transfer card.
        military_dependence: 60,
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

  function endedWith(
    pressures: Partial<GameState["pressures"]>,
    tags: string[] = [],
  ) {
    const base = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    return scoreOutcome(gameDatabase, {
      ...base,
      completed: true,
      memory_tags: tags,
      pressures: { ...base.pressures, ...pressures },
    });
  }

  it("ends as Captive of the Sword when military dependence runs to the extreme", () => {
    expect(endedWith({ military_dependence: 92 }).title).toBe(
      "Captive of the Sword",
    );
  });

  it("lets a dynastic collapse override a lesser failure", () => {
    expect(
      endedWith({ military_dependence: 92, dynastic_security: 12 }).title,
    ).toBe("The House Brought Low");
  });

  it("reaches a devastation failure ending at the extreme", () => {
    expect(endedWith({ devastation: 88 }).title).toBe("A Realm Laid Waste");
  });

  it("does not trigger a failure ending from a merely middling run", () => {
    expect(endedWith({ military_dependence: 60, devastation: 50 }).title).toBe(
      "Dynasty Secured, Peace Deferred",
    );
  });

  it("derives each failure ending's trigger from the crisis pressure thresholds", () => {
    const base = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    // Lower the military-dependence crisis line in a custom database; the collapse
    // point follows it, so a high-but-not-extreme dependence now ends the reign.
    const database = {
      ...gameDatabase,
      pressure_thresholds: gameDatabase.pressure_thresholds.map((threshold) =>
        threshold.kind === "crisis" &&
        threshold.pressure === "military_dependence"
          ? {
              ...threshold,
              condition: { pressure: "military_dependence" as const, min: 40 },
            }
          : threshold,
      ),
    };
    const outcome = scoreOutcome(database, {
      ...base,
      completed: true,
      pressures: { ...base.pressures, military_dependence: 55 },
    });
    expect(outcome.title).toBe("Captive of the Sword");
  });

  it("ends the run at once when a choice drives a pressure to collapse", () => {
    const role = gameDatabase.playable_roles[0];
    const baseCard = {
      role_id: role.id,
      phase_id: "phase_prewar_settlement",
      date_label: "test",
      historian_note: "n",
      source_refs: ["src_wilson_europes_tragedy"],
      causal_claim_ids: [gameDatabase.causal_claims[0].id],
      review_status: "reviewed" as const,
      briefing: "b",
      situation: "s",
    };
    const opt = (id: string, extra = {}) => ({
      id,
      label: id,
      consequence: "c",
      effects: {},
      causal_claim_ids: [gameDatabase.causal_claims[0].id],
      ...extra,
    });
    const database = {
      ...gameDatabase,
      cards: [
        {
          ...baseCard,
          id: "card_spike",
          title: "Spike",
          options: [
            opt("opt_spike", { effects: { military_dependence: 70 } }),
            opt("opt_calm"),
          ],
        },
        { ...baseCard, id: "card_next", title: "Next", options: [opt("opt_a"), opt("opt_b")] },
        { ...baseCard, id: "card_last", title: "Last", options: [opt("opt_c"), opt("opt_d")] },
      ],
    } as typeof gameDatabase;

    let state = createInitialGameState(database, role.id);
    expect(getCurrentCard(database, state)?.id).toBe("card_spike");

    state = chooseOption(database, state, "card_spike", "opt_spike");

    // Two cards remain, but military dependence has collapsed: the run is over.
    expect(state.completed).toBe(true);
    expect(getCurrentCard(database, state)).toBeNull();
  });

  it("warns as a pressure approaches its collapse threshold, not before", () => {
    const base = createInitialGameState(gameDatabase, "role_ferdinand_ii");

    // The opening position is nowhere near any collapse ending.
    expect(getPressureWarnings(base.pressures, gameDatabase.pressure_thresholds)).toHaveLength(0);

    const strained = getPressureWarnings(
      {
        ...base.pressures,
        military_dependence: 80,
        estate_trust: 20,
      },
      gameDatabase.pressure_thresholds,
    );
    const flagged = strained.map((warning) => warning.pressure);
    expect(flagged).toContain("military_dependence");
    expect(flagged).toContain("estate_trust");
    expect(flagged).not.toContain("imperial_authority");
  });

  it("locks an option once an excluded memory tag is present", () => {
    const base = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const option = {
      id: "opt_amnesty",
      label: "Offer broad amnesty",
      consequence: "c",
      effects: {},
      causal_claim_ids: [gameDatabase.causal_claims[0].id],
      excludes_memory_tags: ["blood_court_executions"],
      unavailable_text: "Impossible after the executions in Prague.",
    };

    expect(getOptionAvailability(option, base).available).toBe(true);

    const afterBloodCourt = {
      ...base,
      memory_tags: ["blood_court_executions"],
    };
    const locked = getOptionAvailability(option, afterBloodCourt);
    expect(locked.available).toBe(false);
    expect(locked.reason).toBe("Impossible after the executions in Prague.");
  });

  it("keeps an option locked until its required memory tag is earned", () => {
    const base = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const option = {
      id: "opt_recall",
      label: "Recall the general",
      consequence: "c",
      effects: {},
      causal_claim_ids: [gameDatabase.causal_claims[0].id],
      requires_memory_tags: ["wallenstein_empowered"],
      unavailable_text: "There is no such general to recall.",
    };

    expect(getOptionAvailability(option, base).available).toBe(false);
    expect(
      getOptionAvailability(option, {
        ...base,
        memory_tags: ["wallenstein_empowered"],
      }).available,
    ).toBe(true);
  });

  function syntheticDeck(cards: unknown[]) {
    return { ...gameDatabase, cards } as typeof gameDatabase;
  }
  const baseCardFields = () => ({
    role_id: gameDatabase.playable_roles[0].id,
    phase_id: "phase_prewar_settlement",
    date_label: "test",
    historian_note: "n",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: [gameDatabase.causal_claims[0].id],
    review_status: "reviewed" as const,
    briefing: "b",
    situation: "s",
  });
  const mkOption = (id: string, extra = {}) => ({
    id,
    label: id,
    consequence: "c",
    effects: {},
    causal_claim_ids: [gameDatabase.causal_claims[0].id],
    ...extra,
  });

  it("applies an option's scheduled effects only after the given delay", () => {
    const database = syntheticDeck([
      {
        ...baseCardFields(),
        id: "card_a",
        title: "A",
        options: [
          mkOption("opt_a_schedule", {
            scheduled_effects: [
              {
                after: 1,
                effects: { military_dependence: 30 },
                note: "The bill for the army comes due.",
              },
            ],
          }),
          mkOption("opt_a_other"),
        ],
      },
      { ...baseCardFields(), id: "card_b", title: "B", options: [mkOption("opt_b"), mkOption("opt_b2")] },
      { ...baseCardFields(), id: "card_c", title: "C", options: [mkOption("opt_c"), mkOption("opt_c2")] },
    ]);

    let state = createInitialGameState(database, gameDatabase.playable_roles[0].id);
    const m0 = state.pressures.military_dependence;

    state = chooseOption(database, state, "card_a", "opt_a_schedule");
    expect(state.pressures.military_dependence).toBe(m0); // not yet

    state = chooseOption(database, state, "card_b", "opt_b");
    expect(state.pressures.military_dependence).toBe(m0 + 30); // fires after the delay
    expect(state.log.at(-1)?.deferred_notes).toContain(
      "The bill for the army comes due.",
    );
  });

  it("forces a crisis card to the front when a pressure is in crisis", () => {
    const database = syntheticDeck([
      { ...baseCardFields(), id: "card_normal", title: "Normal", options: [mkOption("opt_n1"), mkOption("opt_n2")] },
      {
        ...baseCardFields(),
        id: "card_crisis",
        title: "Crisis",
        requires_memory_tags: ["threshold_fiscal_capacity_crisis"],
        options: [mkOption("opt_x1"), mkOption("opt_x2")],
      },
      { ...baseCardFields(), id: "card_after", title: "After", options: [mkOption("opt_a1"), mkOption("opt_a2")] },
    ]);
    const base = createInitialGameState(database, gameDatabase.playable_roles[0].id);

    // No crisis: the normal card comes first in deck order.
    expect(getCurrentCard(database, base)?.id).toBe("card_normal");

    // Fiscal in crisis makes the crisis card eligible; it jumps the queue.
    const inCrisis = { ...base, pressures: { ...base.pressures, fiscal_capacity: 20 } };
    expect(getCurrentCard(database, inCrisis)?.id).toBe("card_crisis");
  });

  it("deepens an unaddressed crisis each turn", () => {
    const database = syntheticDeck([
      { ...baseCardFields(), id: "card_a", title: "A", options: [mkOption("opt_a"), mkOption("opt_a2")] },
      { ...baseCardFields(), id: "card_b", title: "B", options: [mkOption("opt_b"), mkOption("opt_b2")] },
    ]);
    let state = {
      ...createInitialGameState(database, gameDatabase.playable_roles[0].id),
      pressures: {
        ...createInitialGameState(database, gameDatabase.playable_roles[0].id).pressures,
        fiscal_capacity: 20,
      },
    };

    state = chooseOption(database, state, "card_a", "opt_a");

    // The choice did not touch fiscal capacity, but the crisis has deepened.
    expect(state.pressures.fiscal_capacity).toBeLessThan(20);
  });

  it("does not skip a card that becomes eligible earlier in the deck after a choice", () => {
    const role = gameDatabase.playable_roles[0];
    const baseCard = {
      role_id: role.id,
      phase_id: "phase_prewar_settlement",
      date_label: "test",
      historian_note: "n",
      source_refs: ["src_wilson_europes_tragedy"],
      causal_claim_ids: [gameDatabase.causal_claims[0].id],
      review_status: "reviewed" as const,
      briefing: "b",
      situation: "s",
    };
    const opt = (id: string, extra = {}) => ({
      id,
      label: id,
      consequence: "c",
      effects: {},
      causal_claim_ids: [gameDatabase.causal_claims[0].id],
      ...extra,
    });
    const database = {
      ...gameDatabase,
      cards: [
        {
          ...baseCard,
          id: "card_unlocked",
          title: "Unlocked",
          requires_memory_tags: ["unlock_me"],
          options: [opt("opt_unlocked_a"), opt("opt_unlocked_b")],
        },
        {
          ...baseCard,
          id: "card_trigger",
          title: "Trigger",
          options: [
            opt("opt_trigger", { memory_tags: ["unlock_me"] }),
            opt("opt_trigger_b"),
          ],
        },
        {
          ...baseCard,
          id: "card_last",
          title: "Last",
          options: [opt("opt_last_a"), opt("opt_last_b")],
        },
      ],
    } as typeof gameDatabase;

    let state = createInitialGameState(database, role.id);
    // card_unlocked is gated out, so the trigger card comes first.
    expect(getCurrentCard(database, state)?.id).toBe("card_trigger");

    state = chooseOption(database, state, "card_trigger", "opt_trigger");

    // Choosing opt_trigger grants "unlock_me", making card_unlocked eligible.
    // It sits earlier in the deck, but must still be shown next, not skipped.
    expect(getCurrentCard(database, state)?.id).toBe("card_unlocked");
  });
});
