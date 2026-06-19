// USAGE: node scripts/scaffold-character.mjs --id role_x --actor actor_x --name "Name" --office "Office"
//
// Emits a complete, schema-valid PLACEHOLDER for a new playable role: the axes,
// thresholds, and role record (with collapse/outcome endings), all scoped to the
// new role_id and marked needs_review so they cannot ship until reviewed (gate G4).
// Structure (axis ids, threshold lines, collapse tiers, failure priority) is cloned
// from an existing role as sensible defaults; replace the TODO prose and re-tune.
//
// After running: `npm run validate:data` passes, and
// `npx tsx scripts/check-character.ts <id>` runs (gates will fail until you author
// the deck and tune — that is the point).

import { readFileSync, writeFileSync } from "node:fs";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const id = arg("id");
const actor = arg("actor");
const name = arg("name");
const office = arg("office") ?? "TODO office";
const template = arg("template") ?? "role_ferdinand_ii";

if (!id || !actor || !name) {
  console.error("Required: --id <role_x> --actor <actor_x> --name <Name> [--office <Office>] [--template <roleId>]");
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const write = (p, v) => writeFileSync(new URL(`../data/${p}`, import.meta.url), JSON.stringify(v, null, 2) + "\n");

const variables = read("game_variables/game_variables.json");
const thresholds = read("pressure_thresholds/pressure_thresholds.json");
const roles = read("playable_roles/playable_roles.json");

if (roles.some((r) => r.id === id)) {
  console.error(`Role ${id} already exists.`);
  process.exit(1);
}
const tmpl = roles.find((r) => r.id === template);
if (!tmpl) {
  console.error(`Template role ${template} not found.`);
  process.exit(1);
}

// Axes: same ids/valence as the template, placeholder labels.
const newAxes = variables
  .filter((v) => v.role_id === template)
  .map((v) => ({
    role_id: id,
    id: v.id,
    name: `TODO ${v.id}`,
    description: "TODO describe this axis for this role.",
    low_label: "TODO low",
    high_label: "TODO high",
    high_is_dangerous: v.high_is_dangerous,
  }));

// Thresholds: same lines/tiers as the template, role-prefixed ids/tags, needs_review.
const newThresholds = thresholds
  .filter((t) => t.role_id === template)
  .map((t) => ({
    role_id: id,
    id: t.id.replace(/^threshold_/, `threshold_${id}_`),
    pressure: t.pressure,
    kind: t.kind,
    condition: t.condition,
    label: "TODO threshold label",
    summary: "TODO threshold summary.",
    memory_tags: t.memory_tags.map((tag) => `${id}_${tag}`),
    ...(t.collapse_tier ? { collapse_tier: t.collapse_tier } : {}),
    source_refs: t.source_refs,
    review_status: "needs_review",
  }));

const placeholderEnding = {
  title: "TODO Ending Title",
  legacy: "TODO legacy.",
  inheritance: "TODO inheritance.",
  comparison: "TODO comparison.",
  path_signals: [],
};

const collapse_endings = {};
for (const axis of tmpl.failure_priority) {
  collapse_endings[axis] = { ...placeholderEnding, path_signals: [`TODO ${axis} collapse`] };
}

const initial_pressures = {};
for (const axis of newAxes) initial_pressures[axis.id] = 50;

const newRole = {
  id,
  actor_id: actor,
  name,
  office,
  why_playable: "TODO why this character is worth playing.",
  player_wants: ["TODO want"],
  constraints: ["TODO constraint"],
  resources: ["TODO resource"],
  success_conditions: ["TODO success condition"],
  failure_conditions: ["TODO failure condition"],
  mvp_suitable: false,
  initial_pressures,
  failure_priority: [...tmpl.failure_priority],
  collapse_endings,
  outcome_endings: [{ ...placeholderEnding, title: "TODO Default Outcome" }],
  outcome_path_signals: [],
  woodcuts: { default: tmpl.woodcuts.default, by_phase: {} },
  historical_outcome: "TODO Default Outcome",
  source_refs: [...tmpl.source_refs],
  review_status: "needs_review",
};

write("game_variables/game_variables.json", [...variables, ...newAxes]);
write("pressure_thresholds/pressure_thresholds.json", [...thresholds, ...newThresholds]);
write("playable_roles/playable_roles.json", [...roles, newRole]);

console.log(`Scaffolded ${id} (${name}).`);
console.log(`  + ${newAxes.length} axes, ${newThresholds.length} thresholds, 1 role record (all needs_review).`);
console.log(`Next: replace the TODO prose, author the deck in data/cards/cards.json (role_id: ${id}),`);
console.log(`then run: npm run validate:data && npx tsx scripts/check-character.ts ${id}`);
