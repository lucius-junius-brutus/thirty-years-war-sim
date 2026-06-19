# Plan: Adding playable characters without rework

**Goal:** add new playable characters such that each one is *right the first time* —
historically faithful, balanced, no dominant strategy, fully grounded — with very
little editing afterward.

## Guiding principle

A character is defined **entirely in data** and must pass a fixed set of **automated
acceptance gates** before it ships. No engine edits per character. "Right" is encoded
as objective pass/fail criteria, not taste applied after the fact.

The single biggest lever for low rework is doing one piece of infrastructure
(role-scoping) *before* authoring any new character — otherwise every character forces
edits to hardcoded engine prose and globally-scoped, emperor-framed axes/thresholds.

## Why we can't just add a character today (the rework traps)

Everything below is currently hardcoded to Ferdinand and would force per-character edits:

1. **Axis labels & valence** — `data/game_variables/game_variables.json` is global and
   emperor-framed ("Imperial Authority", "Confessional Legitimacy", `high_is_dangerous`).
   Wrong for a rebel (Frederick has no imperial authority to wield) or a duke.
2. **Crisis/collapse thresholds & tiers** — `data/pressure_thresholds/pressure_thresholds.json`
   is global. Which axes are *terminal* vs *severe*, and where the lines sit, differ per role
   (military_dependence is terminal for Ferdinand, not for a self-commanding Gustavus).
3. **Collapse endings** — `FAILURE_ENDING_PROSE` in `engine.ts` ("Captive of the Sword",
   "The House Brought Low", "Ferdinand III…") is Ferdinand/Habsburg-specific.
4. **Nuanced outcome endings** — `scoreOutcome` in `engine.ts` branches on Ferdinand memory
   tags (`blood_court_executions`, `wallenstein_recalled_broad`, `restitution_edict_issued`).
5. **Tooling/tests** hardcode `role_ferdinand_ii` (`probe-strategies.ts`,
   `historical-line.test.ts`, the one-sided audit, `engine.test.ts`).
6. **Woodcut mapping** (`woodcutByPhase` in `App.tsx`) is keyed to Ferdinand's phases.

## Phase 1 — Role-scoping refactor (infrastructure; behavior-preserving for Ferdinand)

Make the engine fully role-driven. Move character-specific content out of code into the
role record (or per-role data files), keeping axis IDs as a **shared vocabulary** while
allowing a per-role **subset** and per-role framing:

- **axes**: per-role label / low_label / high_label / `high_is_dangerous`, drawn from a
  shared set of axis IDs; a role may use a subset.
- **thresholds**: per-role crisis/reward lines + `collapse_tier` (terminal/severe).
- **collapse_endings**: per-role prose keyed by axis (replaces `FAILURE_ENDING_PROSE`).
- **outcome_endings**: per-role, data-driven rules (conditions on memory tags / pressures →
  title + legacy/inheritance/comparison), replacing `scoreOutcome`'s hardcoded branches.
- **failure_priority**: per-role ordering (default provided).

**Method (TDD, safety-net first):** extract Ferdinand's *current* hardcoded content verbatim
into his role data, then prove every existing test — including the `historical-line` and
`no-easy-out` acceptance tests — still passes unchanged. The refactor must be a no-op for
Ferdinand. Then parameterize the validation rig by `roleId`:
`probe-strategies.ts`, `historical-line.test.ts`, and the one-sided audit each take a role.

**Critical:** drive this refactor with a concrete *second* character in mind, so the
abstraction is validated against a genuinely different shape immediately — not built in a
vacuum on the single Ferdinand example (the #1 source of "build the wrong abstraction" rework).

## Phase 2 — Authoring spec + acceptance gates (the definition of done)

A documented recipe + a per-character checklist. A character ships only when all gates pass:

- **G1 Historical line → historical outcome** (automated): playing the recorded options runs
  the full arc and lands on the intended historical ending, not a generic collapse.
- **G2 No easy out** (automated): uniformly hardline *and* uniformly conciliatory lines both
  fail (or at minimum neither is a clean victory); each extreme drives its own failing pressures.
- **G3 Both-sides completeness** (automated): zero pure-gain / pure-cost options after axis
  valence (the existing audit, generalized per role).
- **G4 Wilson-grounding** (gated by data): every card/option `review_status: reviewed` with
  `source_refs` to read sources; counterfactual effects justified inline.
- **G5 Reachability/coverage** (automated via designer report): every card reachable, every
  option's gates satisfiable, no dead cards or unreachable forks.
- **G6 Editorial**: titles vivid and specific; a dossier exists for every `context_link`;
  prose passes a read-through.
- **G7 Manual playthrough** (the one human gate): a full play feels coherent and fair.

## Phase 3 — Author character #2 end-to-end (prove the pipeline)

The repeatable authoring sequence:

1. **Research** the arc (Wilson + local sources): the character's position, their actual
   decisions, what victory and failure looked like for *them*, the historical line, and the
   key counterfactuals.
2. **Map to axes**: choose the axis set + labels + valence + thresholds + tiers; set initial
   pressures; define collapse endings and outcome endings.
3. **Author the deck**: cards (date, briefing, situation), options (both-sides effects,
   `historical_option`, `context_links`, `scheduled_effects`, `forced_course`), dossiers,
   causal_claims, woodcut(s).
4. **Run the gates**; tune balance until G1+G2 are green using the generalized probe + tuning
   scripts (same loop used for Ferdinand).
5. **Editorial pass + manual playthrough.**

## Phase 4 — Codify and scale

Fold new learnings into the recipe/checklist so characters #3+ are fast. Maintain shared
content (cross-character dossiers; the same historical event seen from multiple sides) in a
shared library with a consistency check, so two characters never contradict each other on a
shared fact.

## Roster & sequencing

Real characters already in `data/actors`: **Maximilian I of Bavaria**, **Frederick V of the
Palatinate**, **John George I of Saxony** (the Spanish representative and Bohemian estate
leader are composites/placeholders; Gustavus Adolphus is not yet an actor).

**Recommended #2: Frederick V.** He is structurally the *opposite* of Ferdinand — a Calvinist
elector who gambles on the Bohemian crown and loses — so he stress-tests the per-role
abstraction the hardest (no imperial authority to wield; "confessional" = the Protestant
Union/Calvinist cause; "dynastic_security" = the Palatinate plus a gambled crown; "foreign
intervention" means whether *his* backers come through). His arc is short (1619 acceptance →
1620 White Mountain → 1623 loss of the electorate → exile), so it is the fastest, lowest-cost
way to validate the whole pipeline, and his historical line ends in a *specific defeat* —
which richly exercises the endings system. Then Maximilian (winner's arc) and John George.

Alternative if you'd rather derisk the first run with a closer-to-Ferdinand shape: **Maximilian**
(Catholic-imperial frame, a winner's arc) — easier to author but a weaker test of the abstraction.

## Decisions made (2026-06-19)

- **Character #2 = Frederick V of the Palatinate** — chosen specifically because he is the
  hardest stress test of the per-role abstraction (a losing rebel elector, opposite to
  Ferdinand in every axis). Phase 1 is designed against his needs, not Ferdinand's alone.
- **Target roster = many / most major players** — so we invest up front in (a) a robust
  per-role data model, (b) a **shared-content library** (events, dossiers, actors reused
  across characters with a consistency check so two perspectives never contradict each other),
  and (c) **authoring tooling** (a character scaffolder + a one-command per-role gate runner)
  that amortizes across the whole cast.

### What "many characters" adds to the architecture

- **Canonical world events.** The same event (White Mountain, the Edict, the Peace of Prague)
  recurs across decks from different viewpoints. Maintain a canonical event/dossier pool that
  every character's cards reference, so facts stay consistent and dossiers are written once.
- **Shared dossier pool + per-character additions.** Dossiers become a shared library keyed by
  concept; a new character adds only the dossiers unique to their vantage.
- **Authoring tooling worth building:** `scaffold-character.mjs` (emit role-data skeleton +
  empty deck template + woodcut stubs) and `check-character.mjs <roleId>` (run G1–G5 in one
  command). These pay back immediately across a large cast.
- **New actors are in scope** (Gustavus Adolphus, Christian IV, Richelieu, etc.); the role
  model and shared library are designed to cover non-Habsburg, non-imperial vantages from the start.

## Phase 1 task breakdown (next up, TDD throughout)

1. **Per-role axis model.** Add per-role axis definitions (id from shared vocab, labels,
   valence) to the role record; engine reads axes from the role, not global `game_variables`.
   Migrate Ferdinand's axes verbatim. Green-tests gate.
2. **Per-role thresholds + tiers.** Move crisis/reward lines and `collapse_tier` onto the role;
   engine reads them per role. Migrate Ferdinand's verbatim.
3. **Per-role collapse endings.** Replace `FAILURE_ENDING_PROSE` with role data; engine looks
   up endings by role. Migrate Ferdinand's verbatim.
4. **Per-role outcome endings.** Replace `scoreOutcome`'s hardcoded branches with a data-driven
   rule list per role (conditions on memory tags / pressures → title + prose). Migrate
   Ferdinand's branches into rules. This is the largest sub-task; do it test-first against the
   existing Ferdinand outcome tests.
5. **Parameterize the rig by `roleId`.** `probe-strategies.ts`, `historical-line.test.ts`, the
   one-sided audit, and the designer-report coverage check all take a role.
6. **Per-role woodcut mapping.** Move `woodcutByPhase` to role data (or a per-role map).
7. **Regression gate.** All existing tests + the Ferdinand acceptance tests pass unchanged —
   Phase 1 is a no-op for Ferdinand by construction.

Acceptance for Phase 1: Ferdinand fully described by his own role data with zero
character-specific constants left in `engine.ts`, and an empty-but-valid Frederick V role
loads without engine changes.
</content>
