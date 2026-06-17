// USAGE: node scripts/apply-chronicle.mjs scripts/chronicle/phase1.json [more.json ...]
//
// Overlays impersonal-chronicle prose onto data/cards/cards.json.
// Idempotent: override files hold ABSOLUTE target strings, so re-running is a no-op.
// Only player-facing prose is touched (title?, briefing, situation, option label/
// consequence). All traceability fields (source_refs, causal_claim_ids, review_status,
// counterfactual_source_status, research_tags, historian_note) are left untouched.

import { readFileSync, writeFileSync } from "node:fs";

const cardsPath = new URL("../data/cards/cards.json", import.meta.url);
const overrideArgs = process.argv.slice(2);
if (overrideArgs.length === 0) {
  console.error("No override files given.");
  process.exit(1);
}

const cards = JSON.parse(readFileSync(cardsPath, "utf8"));
const cardById = new Map(cards.map((card) => [card.id, card]));

let cardsTouched = 0;
let optionsTouched = 0;
const missing = [];

for (const arg of overrideArgs) {
  const overrides = JSON.parse(readFileSync(arg, "utf8"));
  for (const [cardId, patch] of Object.entries(overrides)) {
    const card = cardById.get(cardId);
    if (!card) {
      missing.push(`card ${cardId} (in ${arg})`);
      continue;
    }
    let touched = false;
    for (const field of ["title", "briefing", "situation"]) {
      if (typeof patch[field] === "string" && patch[field].trim()) {
        card[field] = patch[field];
        touched = true;
      }
    }
    if (patch.options) {
      const optById = new Map((card.options ?? []).map((o) => [o.id, o]));
      for (const [optId, optPatch] of Object.entries(patch.options)) {
        const option = optById.get(optId);
        if (!option) {
          missing.push(`option ${optId} in card ${cardId} (in ${arg})`);
          continue;
        }
        for (const field of ["label", "consequence"]) {
          if (typeof optPatch[field] === "string" && optPatch[field].trim()) {
            option[field] = optPatch[field];
          }
        }
        optionsTouched += 1;
      }
    }
    // Variants are overlaid by index; null/omitted entries are skipped.
    for (const key of ["memory_variants", "pressure_variants"]) {
      if (!Array.isArray(patch[key])) continue;
      const target = card[key];
      if (!Array.isArray(target)) {
        missing.push(`${key} on card ${cardId} (in ${arg})`);
        continue;
      }
      patch[key].forEach((variantPatch, index) => {
        if (!variantPatch || !target[index]) return;
        for (const field of ["title", "date_label", "briefing", "situation"]) {
          if (
            typeof variantPatch[field] === "string" &&
            variantPatch[field].trim()
          ) {
            target[index][field] = variantPatch[field];
          }
        }
      });
      touched = true;
    }
    if (touched) cardsTouched += 1;
  }
}

writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n");

console.log(`Applied chronicle overrides: ${cardsTouched} cards, ${optionsTouched} options.`);
if (missing.length) {
  console.error("MISSING TARGETS:\n  " + missing.join("\n  "));
  process.exit(2);
}
