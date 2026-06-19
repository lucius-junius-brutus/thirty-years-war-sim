# Character authoring guide

The repeatable recipe for adding a playable character so it is right the first time.
A character is **defined entirely in data**; nothing character-specific lives in
`engine.ts`. A character ships only when the acceptance gates pass.

## The acceptance gates (definition of done)

Run `npx tsx scripts/check-character.ts <roleId>`. G1–G5 are automated; G6–G7 are manual.

| Gate | What it checks | How |
| --- | --- | --- |
| **G1** | The historical line reaches the historical outcome (no collapse; matches `role.historical_outcome`) | check-character |
| **G2** | No easy out: uniformly hardline **and** uniformly conciliatory play both fail | check-character |
| **G3** | Both-sides completeness: no option is pure-gain or pure-cost (after axis valence) | check-character |
| **G4** | Wilson-grounding: every one of the role's cards is `review_status: reviewed` (validation also enforces reviewed → read sources) | check-character + `npm run validate:data` |
| **G5** | Reachability: report of cards the probed lines never reach (investigate any *base* card that never appears) | check-character (report) |
| **G6** | Editorial: titles vivid and specific; a dossier exists for every `context_link`; a clean read-through | manual |
| **G7** | One full manual playthrough feels coherent and fair | manual (`/run` the app) |

`scripts/probe-strategies.ts <roleId>` prints the three archetypal lines (historical /
hardline / conciliatory) with end pressures — the tuning oracle for G1 and G2.

## The role data contract

A role record in `data/playable_roles/playable_roles.json` must define:

- Identity: `id`, `actor_id`, `name`, `office`, `why_playable`, `player_wants`,
  `constraints`, `resources`, `success_conditions`, `failure_conditions`, `mvp_suitable`.
- `initial_pressures` — starting value (0–100) for each axis the role uses.
- `failure_priority` — axis order (most fatal first) for choosing a collapse ending.
- `collapse_endings` — prose per terminal/severe axis (title/legacy/inheritance/comparison/path_signals).
- `outcome_endings` — ordered non-failure endings; first whose `match` holds wins, an
  ending with no `match` is the always-true default (list it last).
- `outcome_path_signals` — additive ending notes appended when their tags are present.
- `woodcuts` — `{ default, by_phase }` mapping phase ids to header art.
- `historical_outcome` — the title G1 expects the historical line to reach.

Per role, also add (scoped by `role_id`): the **axes** in `game_variables.json` (label +
valence for each axis the role uses — axis ids are shared vocabulary) and the **thresholds**
in `pressure_thresholds.json` (crisis/reward lines; crisis thresholds need a `collapse_tier`:
`terminal` = reign-ending alone, `severe` = survivable until two collapse at once).

Cards live in `data/cards/cards.json` with `role_id`; dossiers, causal_claims, and woodcut
SVGs are shared assets.

## The authoring sequence

1. **Research the arc** (Wilson + local sources). For *this* character: their position and
   resources; the decisions they actually faced; what victory and failure looked like *for
   them*; the recorded historical line; the key counterfactuals (the "it could have gone
   otherwise" forks).
2. **Map to axes.** Pick the axis set and frame each axis in the character's terms (labels +
   valence). Decide which axes are terminal vs severe and where the crisis lines sit. Set
   initial pressures. Write the collapse endings and the outcome-ending rules (including the
   intended `historical_outcome`).
3. **Scaffold** the role skeleton: `node scripts/scaffold-character.mjs --id role_x --actor
   actor_x --name "Name" --office "Office"` (emits valid placeholder axes/thresholds/endings
   so `validate:data` passes and the gates run immediately). Then replace the placeholders.
4. **Author the deck.** For each card: date, briefing, situation, and options. Every option:
   - effects on the axes, with **both sides** (a real tradeoff — see G3), each Wilson-grounded
     (own deductions for counterfactuals, justified in the option or a causal_claim);
   - mark exactly one option `historical_option: true` (what the character actually did);
   - `context_links` to dossiers (write the dossier if missing); optional `scheduled_effects`
     (deferred costs) and `forced_course` (loss of agency under extreme pressure).
   Set `review_status: reviewed` only with `source_refs` to sources actually read.
5. **Tune to green.** Run `probe-strategies` + `check-character`; adjust effects until the
   historical line survives to its outcome (G1) and both extremes fail (G2). The historical
   line threads the needle because the character's *real* arc mixes coercion and accommodation
   and includes its recoveries — not because the engine floors anything.
6. **Editorial + playthrough** (G6, G7).

## Shared content & consistency (for the broad cast)

- The same event seen from two sides (White Mountain, the Edict, the Peace of Prague) must
  stay factually consistent. Keep canonical facts in shared **dossiers**; each character adds
  only the dossiers unique to their vantage.
- When two characters reference the same event, cross-check the dossier text rather than
  re-describing it per character.

## Anti-rework rules

- Never add character-specific branching to `engine.ts`. If a character needs new behavior,
  add a **data field + a generic engine rule**, not a hardcoded case.
- A half-built character should fail `validate:data` (missing axis/threshold/ending), not
  silently misbehave — keep the schema strict.
- Don't ship on "looks right." Ship on the gates.
</content>
