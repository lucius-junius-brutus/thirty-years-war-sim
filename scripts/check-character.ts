// USAGE: npx tsx scripts/check-character.ts [roleId]   (default role_ferdinand_ii)
//
// Runs the per-character acceptance gates that define "done" for a playable role.
// A character is ready to ship only when G1-G4 pass. G5 is an informational
// reachability report. Exits non-zero if any hard gate fails.
//
//   G1  Historical line reaches the historical outcome (no collapse; matches the
//       role's declared historical_outcome).
//   G2  No easy out: uniformly hardline AND uniformly conciliatory play both fail.
//   G3  Both-sides completeness: no option is pure-gain or pure-cost (axis valence).
//   G4  Wilson-grounding: every one of the role's cards is review_status "reviewed".
//   G5  Reachability (report): cards never reached across the probed lines.

import { gameDatabase } from "../src/data/gameDatabase";
import {
  chooseOption,
  createInitialGameState,
  getCurrentCard,
  getOptionAvailability,
  getOptionsForCard,
  getRole,
  getRoleAxes,
  scoreOutcome,
  type GameState,
} from "../src/game/engine";
import type { CardOptionRecord } from "../src/domain/types";

const roleId = process.argv[2] ?? "role_ferdinand_ii";
const role = getRole(gameDatabase, roleId);
const dangerAxes = new Set<string>(
  getRoleAxes(gameDatabase, roleId)
    .filter((axis) => axis.high_is_dangerous)
    .map((axis) => axis.id),
);

function hardness(option: CardOptionRecord): number {
  const e = option.effects as Record<string, number>;
  const g = (k: string) => e[k] ?? 0;
  // Up for order/coercion/restoration; down for accommodation. (Drives the extremes.)
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

function play(pick: Picker) {
  let state: GameState = createInitialGameState(gameDatabase, roleId);
  const seen: string[] = [];
  let guard = 0;
  while (!state.completed && guard++ < 300) {
    const card = getCurrentCard(gameDatabase, state);
    if (!card) break;
    seen.push(card.id);
    const available = getOptionsForCard(card, state).filter(
      (o) => getOptionAvailability(o, state).available,
    );
    if (available.length === 0) break;
    state = chooseOption(gameDatabase, state, card.id, pick(available).id);
  }
  return { outcome: scoreOutcome(gameDatabase, state), seen, played: state.log.length };
}

const historical = play(
  (a) => a.find((o) => o.historical_option === true) ?? a[0],
);
const hardline = play((a) => [...a].sort((x, y) => hardness(y) - hardness(x))[0]);
const conciliatory = play((a) => [...a].sort((x, y) => hardness(x) - hardness(y))[0]);

const results: { gate: string; pass: boolean; detail: string }[] = [];

// G1
{
  // The historical line must reach the role's declared historical outcome. That
  // outcome can be a victory, a qualified survival, or a specific defeat (a losing
  // character like Frederick V has a defeat as its historical outcome) — so G1
  // checks the title, not the failure flag.
  const o = historical.outcome;
  const titleOk = role.historical_outcome
    ? o.title === role.historical_outcome
    : !o.failure;
  results.push({
    gate: "G1 historical -> historical outcome",
    pass: titleOk && historical.played > 0,
    detail: `reached "${o.title}"${o.failure ? " (collapse)" : ""} (${historical.played} cards)` +
      (role.historical_outcome ? `; expected "${role.historical_outcome}"` : "; no declared outcome"),
  });
}

// G2 — for most roles, both extremes must collapse. For a losing/claimant role
// (one that declares clean_victory_titles), bold play ruins you and cautious play
// survives but hollow; the guarantee is that neither extreme reaches the real
// prize, and that boldness still has consequences (at least one extreme fails).
{
  const clean = role.clean_victory_titles ?? [];
  const reachesPrize = (o: typeof hardline.outcome) => clean.includes(o.title);
  const g2pass = clean.length
    ? !reachesPrize(hardline.outcome) &&
      !reachesPrize(conciliatory.outcome) &&
      (hardline.outcome.failure || conciliatory.outcome.failure)
    : hardline.outcome.failure && conciliatory.outcome.failure;
  results.push({
    gate: "G2 no easy out",
    pass: g2pass,
    detail:
      `hardline "${hardline.outcome.title}"${hardline.outcome.failure ? " (fails)" : ""}; ` +
      `conciliatory "${conciliatory.outcome.title}"${conciliatory.outcome.failure ? " (fails)" : ""}` +
      (clean.length ? `; neither may reach: ${clean.join(", ")}` : "; both must fail"),
  });
}

// G3
{
  const good = (k: string, v: number) => (dangerAxes.has(k) ? -v : v);
  const oneSided: string[] = [];
  for (const card of gameDatabase.cards) {
    if (card.role_id !== roleId || card.id.includes("threshold")) continue;
    for (const option of card.options) {
      const g = Object.entries(option.effects ?? {})
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => good(k, v as number));
      if (g.length < 2) continue;
      if (!(g.some((x) => x > 0) && g.some((x) => x < 0))) {
        oneSided.push(`${card.id}/${option.id}`);
      }
    }
  }
  results.push({
    gate: "G3 both-sides completeness",
    pass: oneSided.length === 0,
    detail: oneSided.length ? `one-sided: ${oneSided.join(", ")}` : "every option carries a real tradeoff",
  });
}

// G4
{
  const unreviewed = gameDatabase.cards
    .filter((c) => c.role_id === roleId && c.review_status !== "reviewed")
    .map((c) => `${c.id} (${c.review_status})`);
  results.push({
    gate: "G4 Wilson-grounding (reviewed)",
    pass: unreviewed.length === 0,
    detail: unreviewed.length ? `not reviewed: ${unreviewed.join(", ")}` : "all cards reviewed",
  });
}

// G5 (report only)
const reached = new Set([...historical.seen, ...hardline.seen, ...conciliatory.seen]);
const neverReached = gameDatabase.cards
  .filter((c) => c.role_id === roleId && !reached.has(c.id))
  .map((c) => c.id);

console.log(`\nAcceptance gates for ${role.name} (${roleId})\n`);
let allPass = true;
for (const r of results) {
  allPass = allPass && r.pass;
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.gate}`);
  console.log(`        ${r.detail}`);
}
console.log(
  `\n  ----  G5 reachability (report): ${neverReached.length} card(s) not reached by the probed lines` +
    (neverReached.length ? `:\n        ${neverReached.join(", ")}` : ""),
);
console.log(`\n${allPass ? "ALL HARD GATES PASS" : "HARD GATES FAILING"}\n`);
process.exit(allPass ? 0 : 1);
