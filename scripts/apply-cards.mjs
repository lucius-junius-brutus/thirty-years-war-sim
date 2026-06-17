// USAGE: node scripts/apply-cards.mjs scripts/cards/phase1.json [more.json ...]
//
// Applies a Wilson-sourced rewrite pass to cards AND upserts dossiers, idempotently.
// Override file shape:
// {
//   "dossiers": {
//     "dossier_id": { title, dossier_type, summary, why_it_matters, source_refs[], review_status }
//   },
//   "cards": {
//     "card_id": {
//       review_status?, source_refs?[], briefing?, situation?, title?,
//       context_links?: [{ term, dossier_id }],
//       options?: { opt_id: { label?, consequence? } },
//       memory_variants?: [ { briefing?, situation?, title? } | null ],
//       pressure_variants?: [ ... ]
//     }
//   }
// }
// All strings are ABSOLUTE targets, so re-running is a no-op. Traceability fields not
// named here (causal_claim_ids, counterfactual_source_status, research_tags,
// historian_note) are left untouched.

import { readFileSync, writeFileSync } from "node:fs";

const cardsPath = new URL("../data/cards/cards.json", import.meta.url);
const dossiersPath = new URL("../data/dossiers/dossiers.json", import.meta.url);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("No override files given.");
  process.exit(1);
}

const cards = JSON.parse(readFileSync(cardsPath, "utf8"));
const dossiers = JSON.parse(readFileSync(dossiersPath, "utf8"));
const cardById = new Map(cards.map((c) => [c.id, c]));
const dossierById = new Map(dossiers.map((d) => [d.id, d]));

const DOSSIER_TYPES = new Set([
  "person",
  "document",
  "institution",
  "concept",
  "place",
  "treaty",
]);

let cardsTouched = 0;
let dossiersCreated = 0;
let dossiersUpdated = 0;
const errors = [];

for (const arg of args) {
  const override = JSON.parse(readFileSync(arg, "utf8"));

  for (const [id, patch] of Object.entries(override.dossiers ?? {})) {
    let dossier = dossierById.get(id);
    if (!dossier) {
      const missing = ["title", "dossier_type", "summary", "why_it_matters", "source_refs"].filter(
        (f) => patch[f] === undefined,
      );
      if (missing.length) {
        errors.push(`new dossier ${id} missing: ${missing.join(", ")} (in ${arg})`);
        continue;
      }
      dossier = { id, review_status: "reviewed", ...patch };
      dossiers.push(dossier);
      dossierById.set(id, dossier);
      dossiersCreated += 1;
    } else {
      Object.assign(dossier, patch);
      dossiersUpdated += 1;
    }
    if (!DOSSIER_TYPES.has(dossier.dossier_type)) {
      errors.push(`dossier ${id} bad dossier_type: ${dossier.dossier_type}`);
    }
  }

  for (const [id, patch] of Object.entries(override.cards ?? {})) {
    const card = cardById.get(id);
    if (!card) {
      errors.push(`card ${id} not found (in ${arg})`);
      continue;
    }
    for (const f of ["title", "briefing", "situation", "review_status"]) {
      if (typeof patch[f] === "string" && patch[f].trim()) card[f] = patch[f];
    }
    if (Array.isArray(patch.source_refs)) card.source_refs = patch.source_refs;
    if (Array.isArray(patch.context_links)) card.context_links = patch.context_links;
    if (patch.options) {
      const optById = new Map((card.options ?? []).map((o) => [o.id, o]));
      for (const [optId, optPatch] of Object.entries(patch.options)) {
        const option = optById.get(optId);
        if (!option) {
          errors.push(`option ${optId} not in card ${id} (in ${arg})`);
          continue;
        }
        for (const f of ["label", "consequence", "unavailable_text"]) {
          if (typeof optPatch[f] === "string" && optPatch[f].trim()) option[f] = optPatch[f];
        }
        for (const f of ["requires_memory_tags", "excludes_memory_tags", "requires_pressures", "scheduled_effects"]) {
          if (Array.isArray(optPatch[f])) option[f] = optPatch[f];
        }
        if (typeof optPatch.hidden_when_unavailable === "boolean") {
          option.hidden_when_unavailable = optPatch.hidden_when_unavailable;
        }
      }
    }
    for (const key of ["memory_variants", "pressure_variants"]) {
      if (!Array.isArray(patch[key]) || !Array.isArray(card[key])) continue;
      patch[key].forEach((vp, i) => {
        if (!vp || !card[key][i]) return;
        for (const f of ["title", "date_label", "briefing", "situation"]) {
          if (typeof vp[f] === "string" && vp[f].trim()) card[key][i][f] = vp[f];
        }
      });
    }
    cardsTouched += 1;
  }
}

writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n");
writeFileSync(dossiersPath, JSON.stringify(dossiers, null, 2) + "\n");

console.log(
  `cards: ${cardsTouched} updated | dossiers: ${dossiersCreated} created, ${dossiersUpdated} updated`,
);
if (errors.length) {
  console.error("ERRORS:\n  " + errors.join("\n  "));
  process.exit(2);
}
