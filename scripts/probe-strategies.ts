// USAGE: npx tsx scripts/probe-strategies.ts
//
// Diagnostic only (not committed gameplay). Plays a role's deck under three
// archetypal strategies and reports the outcome + end pressures of each:
//   - historical: the recorded option whenever offered;
//   - hardline:   the most "order at any cost" option each card (max hardness);
//   - conciliatory: the most accommodating option each card (min hardness).
// Hardness is derived from an option's effect signature, used only to drive the
// probe. The design goal: neither extreme should be a clean win — each must
// generate its own failing pressures (no easy out).

import { gameDatabase } from "../src/data/gameDatabase";
import {
  chooseOption,
  createInitialGameState,
  getCurrentCard,
  getOptionAvailability,
  getOptionsForCard,
  scoreOutcome,
  type GameState,
} from "../src/game/engine";
import type { CardOptionRecord } from "../src/domain/types";

function hardness(o: CardOptionRecord): number {
  const e = o.effects;
  const g = (k: keyof typeof e) => e[k] ?? 0;
  // Up for restoration/command/coercion; down for accommodation.
  return (
    g("imperial_authority") +
    g("confessional_legitimacy") +
    g("dynastic_security") -
    g("estate_trust") +
    g("foreign_intervention_risk") +
    g("devastation") +
    g("military_dependence")
  );
}

type Picker = (available: CardOptionRecord[]) => CardOptionRecord;

const pickers: Record<string, Picker> = {
  historical: (a) => a.find((o) => o.historical_option === true) ?? a[0],
  hardline: (a) => [...a].sort((x, y) => hardness(y) - hardness(x))[0],
  conciliatory: (a) => [...a].sort((x, y) => hardness(x) - hardness(y))[0],
};

function play(strategy: string, roleId: string) {
  let state: GameState = createInitialGameState(gameDatabase, roleId);
  let guard = 0;
  let played = 0;
  while (!state.completed && guard++ < 200) {
    const card = getCurrentCard(gameDatabase, state);
    if (!card) break;
    const available = getOptionsForCard(card, state).filter(
      (o) => getOptionAvailability(o, state).available,
    );
    if (available.length === 0) break;
    const choice = pickers[strategy](available);
    state = chooseOption(gameDatabase, state, card.id, choice.id);
    played++;
  }
  const outcome = scoreOutcome(gameDatabase, state);
  const p = state.pressures;
  const fmt = (n: number) => String(n).padStart(3);
  return { strategy, title: outcome.title, failure: outcome.failure, played, p, fmt };
}

const roleId = "role_ferdinand_ii";
const axes = Object.keys(createInitialGameState(gameDatabase, roleId).pressures);
console.log(
  "strategy".padEnd(13),
  "fail".padEnd(5),
  axes.map((a) => a.slice(0, 4).padStart(4)).join(" "),
  " outcome",
);
for (const strategy of Object.keys(pickers)) {
  const r = play(strategy, roleId);
  console.log(
    r.strategy.padEnd(13),
    String(r.failure).padEnd(5),
    axes.map((a) => r.fmt((r.p as Record<string, number>)[a])).join(" "),
    " " + r.title,
    `(${r.played} cards)`,
  );
}
