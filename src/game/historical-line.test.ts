import { describe, expect, it } from "vitest";
import { gameDatabase } from "../data/gameDatabase";
import {
  chooseOption,
  createInitialGameState,
  getCurrentCard,
  getOptionAvailability,
  getOptionsForCard,
  scoreOutcome,
  type GameState,
} from "./engine";

// Plays a role's line, choosing the historically-recorded option whenever the
// current card offers one (and it is available); for interrupts / threshold
// cards that carry no historical option, it takes the first available option as
// a neutral default. The acceptance guarantee: a player who replays history
// should reach the historical outcome, not a premature collapse.
function playHistoricalLine(database: typeof gameDatabase, roleId: string) {
  let state: GameState = createInitialGameState(database, roleId);
  const trail: { card: string; option: string; historical: boolean }[] = [];
  let guard = 0;
  while (!state.completed && guard++ < 200) {
    const card = getCurrentCard(database, state);
    if (!card) break;
    const options = getOptionsForCard(card, state);
    const available = options.filter(
      (o) => getOptionAvailability(o, state).available,
    );
    if (available.length === 0) break;
    const historical = available.find((o) => o.historical_option === true);
    const choice = historical ?? available[0];
    trail.push({
      card: card.id,
      option: choice.id,
      historical: Boolean(historical),
    });
    state = chooseOption(database, state, card.id, choice.id);
  }
  return { state, outcome: scoreOutcome(database, state), trail };
}

describe("historical line", () => {
  it("replaying Ferdinand's recorded choices reaches a hard, surviving victory", () => {
    const { outcome, state, trail } = playHistoricalLine(
      gameDatabase,
      "role_ferdinand_ii",
    );
    // Surface the trail and end-state when this fails, to guide balance tuning.
    const summary = {
      title: outcome.title,
      failure: outcome.failure,
      pressures: state.pressures,
      cardsPlayed: trail.length,
      tags: state.memory_tags,
    };
    const ctx = JSON.stringify(summary, null, 2);

    // The core guarantee: playing history does not end in collapse. Ferdinand II
    // died emperor in 1637 with the dynasty secured — a hard, qualified victory,
    // not a failure ending.
    expect(outcome.failure, ctx).toBe(false);
    // It runs the full arc to the reign's natural close, not an early exit.
    expect(trail.length, ctx).toBeGreaterThan(40);
    // The defining drama of the late reign — Wallenstein recalled at Gollersdorf,
    // then broken — yields its specific ending.
    expect(outcome.title, ctx).toBe("Army Recovered, Trust Spent");

    // "Hard victory, unquiet empire" in the pressures: commanding authority and a
    // secured dynasty, bought at the price of strained trust, a ravaged land, and
    // standing foreign intervention.
    expect(state.pressures.imperial_authority, ctx).toBeGreaterThanOrEqual(80);
    expect(state.pressures.dynastic_security, ctx).toBeGreaterThanOrEqual(80);
    expect(state.pressures.estate_trust, ctx).toBeLessThan(45);
    expect(state.pressures.foreign_intervention_risk, ctx).toBeGreaterThanOrEqual(70);
    expect(state.pressures.devastation, ctx).toBeGreaterThanOrEqual(70);
  });

  it("does not let uniformly hardline or uniformly conciliatory play slip through", () => {
    // No easy out: replaying history threads a needle. Always taking the most
    // coercive option, or always the most accommodating, must fail — each extreme
    // generates its own collapsing pressures.
    const stance = (sign: number) => (database: typeof gameDatabase) => {
      let state = createInitialGameState(database, "role_ferdinand_ii");
      let guard = 0;
      while (!state.completed && guard++ < 200) {
        const card = getCurrentCard(database, state);
        if (!card) break;
        const available = getOptionsForCard(card, state).filter(
          (o) => getOptionAvailability(o, state).available,
        );
        if (available.length === 0) break;
        const score = (o: (typeof available)[number]) => {
          const e = o.effects;
          return (
            (e.imperial_authority ?? 0) +
            (e.confessional_legitimacy ?? 0) +
            (e.dynastic_security ?? 0) -
            (e.estate_trust ?? 0) +
            (e.foreign_intervention_risk ?? 0) +
            (e.devastation ?? 0) +
            (e.military_dependence ?? 0)
          );
        };
        const choice = [...available].sort((a, b) => sign * (score(b) - score(a)))[0];
        state = chooseOption(database, state, card.id, choice.id);
      }
      return scoreOutcome(database, state);
    };

    expect(stance(1)(gameDatabase).failure).toBe(true); // uniformly hardline
    expect(stance(-1)(gameDatabase).failure).toBe(true); // uniformly conciliatory
  });
});
