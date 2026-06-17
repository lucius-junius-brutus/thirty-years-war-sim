// USAGE: node scripts/mark-historical-options.mjs
//
// Idempotent. Sets historical_option:true on the historically-accurate option of
// each base card that lacked one, and clears the flag from that card's other
// options so exactly one option per card carries it. The chosen option encodes
// "what Ferdinand (or the imperial/Habsburg side) actually did," used by the
// counterfactual ledger and the historical-line acceptance test.
//
// Each attribution is justified from Wilson, Europe's Tragedy. A handful are
// genuinely arguable (the real decision was muddier than any single option) and
// are flagged ARGUABLE below.

import { readFileSync, writeFileSync } from "node:fs";

const cardsPath = new URL("../data/cards/cards.json", import.meta.url);

// card_id -> option_id that was historically taken.
const HISTORICAL = {
  // The ecclesiastical reservation was never enforced strictly nor formally
  // renegotiated; the disputed lands festered, deferred until a concrete case
  // (Donauwoerth 1607, Cologne) forced a ruling. ARGUABLE vs. the "living
  // compact" reading, but deferral-until-crisis is the descriptive pattern.
  card_1555_augsburg_settlement: "opt_augsburg_deferred_inheritance",

  // The Protestant Union (1608) and Catholic League (1609) formed and were
  // tolerated; the imperial framework did not effectively suppress them.
  card_1608_security_blocs: "opt_leagues_constitutional_insurance",

  // Rudolf II granted the Letter of Majesty in 1609 as a broad charter of
  // Bohemian religious liberty (the narrowing came later, under Habsburg crown
  // and church pressure, and triggered 1618).
  card_1609_letter_of_majesty: "opt_majesty_broad_charter",

  // Vienna branded the defenestration a revolt and refused real accommodation,
  // treating the appeal to the Letter of Majesty as a mask for rebellion.
  card_1618_prague_defenestration: "opt_public_punishment",

  // The late-1618 mediation (Saxon and others) collapsed; the crown would not
  // concede its disputed rights.
  card_1618_mediation_channel: "opt_let_mediation_fail",

  // Ferdinand was elected Holy Roman Emperor at Frankfurt (28 Aug 1619) even as
  // Bohemia deposed him; he made securing the imperial title the priority.
  card_1619_imperial_election: "opt_prioritize_electors",

  // He used the imperial dignity to frame Bohemia's resistance as rebellion
  // against the lawful emperor, not merely its king.
  card_1619_frankfurt_coronation: "opt_crown_as_mandate",

  // Treaty of Munich (Oct 1619): Ferdinand accepted Maximilian's terms — League
  // command under Tilly, full compensation, Upper Austria as security, and the
  // promise of the electoral title.
  card_1620_bavarian_army: "opt_bavarian_military_assistance",

  // He secured Saxony (John George) by promising respect for the religious
  // peace and Lutheran rights, with Lusatia as pawn.
  card_1620_saxon_question: "opt_reassure_saxony",

  // Exemplary punishment: the "Blood Court" of Prague, 27 rebel leaders executed
  // June 1621, the lesson made to travel.
  card_1620_white_mountain_aftermath: "opt_exemplary_punishment",

  // Wholesale confiscation of rebel estates on a grand scale, redistributed to
  // loyalists and used (with the debased-coinage consortium) to fund the war.
  card_1621_confiscations: "opt_large_confiscations",

  // Spanish forces (Spinola) occupied the Lower Palatinate openly from 1620-21,
  // coordinated with the imperial/League war and the electoral transfer.
  // ARGUABLE: Ferdinand was wary of appearing a Spanish client, but the
  // Spanish role on the Rhine was overt and coordinated.
  card_1621_spanish_rhine: "opt_coordinate_with_spain",

  // The war was funded chiefly through the contribution system levied on
  // occupied and loyal lands alike (Wilson's central fiscal mechanism).
  card_1622_league_finance: "opt_contribution_system",

  // After the electoral transfer (Feb 1623) and victories, Ferdinand pressed
  // the advantage rather than settling, helping provoke Danish intervention.
  card_1623_peace_feelers: "opt_continue_pressure",

  // Aggressive Catholic restoration in the hereditary lands (Verneuerte
  // Landesordnung 1627; expulsion of nobles who would not convert), prelude to
  // the Edict of Restitution (1629).
  card_1627_restoration_mandates: "opt_push_restoration",
};

const cards = JSON.parse(readFileSync(cardsPath, "utf8"));
let changed = 0;
const errors = [];

for (const [cardId, optionId] of Object.entries(HISTORICAL)) {
  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    errors.push(`unknown card ${cardId}`);
    continue;
  }
  if (!card.options.some((o) => o.id === optionId)) {
    errors.push(`card ${cardId} has no option ${optionId}`);
    continue;
  }
  for (const option of card.options) {
    const shouldBe = option.id === optionId;
    if (Boolean(option.historical_option) !== shouldBe) changed++;
    if (shouldBe) option.historical_option = true;
    else if ("historical_option" in option) delete option.historical_option;
  }
}

if (errors.length) {
  console.error("ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}

// Verify exactly one historical option on every non-threshold card.
const orphans = cards
  .filter((c) => !c.id.includes("threshold"))
  .filter((c) => c.options.filter((o) => o.historical_option === true).length !== 1)
  .map((c) => c.id);

writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n");
console.log(`Applied. Option flags changed: ${changed}.`);
if (orphans.length) {
  console.log(`Base cards still without exactly one historical option: ${orphans.length}`);
  orphans.forEach((id) => console.log("  " + id));
} else {
  console.log("Every base card now has exactly one historical option.");
}
