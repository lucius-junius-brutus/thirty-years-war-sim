// USAGE: node scripts/retitle-cards.mjs
//
// Idempotent. Replaces flat or administrative card titles with sharper, more
// evocative ones that name the dilemma. Titles live only in cards.json (the
// phase override files do not set them), so this edits cards.json directly.

import { readFileSync, writeFileSync } from "node:fs";

const cardsPath = new URL("../data/cards/cards.json", import.meta.url);

const TITLES = {
  card_1555_augsburg_settlement: "A Peace Built on Silence",
  card_1608_security_blocs: "Two Armed Camps",
  card_1609_letter_of_majesty: "The Letter of Majesty",
  card_1618_mediation_channel: "The Last Channel",
  card_1619_imperial_election: "The Vacant Throne",
  card_1620_saxon_question: "Keeping Saxony Out",
  card_1625_lower_saxon_neutrality: "The North Takes Up Arms",
  card_1625_wallenstein_army: "Wallenstein's Offer",
  card_1627_palatine_peace_opening: "The Exile Sues for Terms",
  card_1627_restoration_mandates: "Faith by Decree",
  card_1636_hessen_amnesty: "The Last Holdouts",
  card_1637_ferdinand_iii_election: "A Crown for the Son",
};

const cards = JSON.parse(readFileSync(cardsPath, "utf8"));
let changed = 0;
const errors = [];

for (const [id, title] of Object.entries(TITLES)) {
  const card = cards.find((c) => c.id === id);
  if (!card) {
    errors.push(`unknown card ${id}`);
    continue;
  }
  if (card.title !== title) {
    card.title = title;
    changed++;
  }
}

if (errors.length) {
  console.error("ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}

writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n");
console.log(`Titles updated: ${changed}.`);
