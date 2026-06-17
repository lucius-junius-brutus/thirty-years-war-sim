// USAGE: node scripts/tune-historical-balance.mjs
//
// Idempotent balance tuning of specific option effects, by assignment to target
// values. Goal: Ferdinand's recorded line should land in the survivable warning
// band ("Hard Victory, Unquiet Empire"), while uniformly hardline or uniformly
// conciliatory play still fails. Each adjustment is justified below.
//
// Re-runnable: sets effects to fixed targets, so applying twice is a no-op.

import { readFileSync, writeFileSync } from "node:fs";

const cardsPath = new URL("../data/cards/cards.json", import.meta.url);

// [cardId, optionId, pressure, newValue, why]
const ADJUSTMENTS = [
  // --- Military dependence: keep the historical line in the warning band
  // ("Wallenstein dangerous") below the terminal "captive of the sword" line.
  // Dependence is also carried by memory tags gating the forced courses.
  ["card_1620_march_on_prague", "opt_march_direct_prague", "military_dependence", 3,
    "Marching the League army straight on Prague used Bavarian force but added little new dependence beyond the Munich bargain already counted."],
  ["card_threshold_military_creditors", "opt_threshold_pay_military_creditors", "military_dependence", 4,
    "Paying the creditors relieved the immediate crisis; the standing dependence is already represented by the contracts that created it."],
  ["card_1632_recall_wallenstein", "opt_recall_wallenstein_broad", "military_dependence", 9,
    "Gollersdorf (1632) was the peak of dependence, but Ferdinand kept the standing he used to break Wallenstein in 1634; the spike belongs in the danger band, not at outright captivity, since the historical arc corrects it with the assassination."],

  // Military dependence was over-weighted as single-card spikes. The dependence
  // is also carried structurally by memory tags (bavarian_dependence_high,
  // wallenstein_empowered) that gate the forced courses, so trimming the raw
  // spikes keeps the mechanic while letting the historical line stay just below
  // the terminal "captive of the sword" line, as Ferdinand did (he reasserted
  // control over Wallenstein rather than being permanently captured by him).
  ["card_1620_bavarian_army", "opt_bavarian_military_assistance", "military_dependence", 12,
    "Munich 1619 created real but not total dependence; tag carries the rest."],
  ["card_1625_wallenstein_army", "opt_contract_wallenstein_army", "military_dependence", 6,
    "Wallenstein's 1625 contract raised dependence sharply but Ferdinand kept the power to dismiss him (1630) and did. The immediate beat is trimmed because the contract also schedules a larger deferred dependence cost ('the army grows a power beside the throne') that carries the weight."],
  ["card_1628_mecklenburg_reward", "opt_grant_mecklenburg_wallenstein", "military_dependence", 5,
    "Granting Mecklenburg marked the height of Wallenstein's standing, but it landed atop the deferred contract cost; trimming the immediate beat keeps the 1628-30 peak in the danger band that Ferdinand survived and then broke at Regensburg (1630)."],
  ["card_1623_electoral_transfer", "opt_transfer_to_bavaria", "military_dependence", 7,
    "The electoral transfer deepened reliance on Bavaria but was primarily a constitutional, not a military, commitment."],

  // Foreign-intervention risk on the historical line was pushing past the
  // collapse margin (>=88), implying outsiders dictated the Empire's fate. But
  // Ferdinand survived even the Danish and Swedish interventions to his death in
  // 1637: foreign risk should sit high in the crisis band (Sweden intervened),
  // not past the deposition line. These trims are on options the uniformly
  // hardline line does NOT take, so hardline still collapses on foreign risk.
  ["card_1623_peace_feelers", "opt_continue_pressure", "foreign_intervention_risk", 6,
    "Pressing the advantage after 1623 invited intervention, but the Danish/Swedish entries had several causes beyond imperial assertiveness."],
  ["card_1623_electoral_transfer", "opt_transfer_to_bavaria", "foreign_intervention_risk", 7,
    "The electoral transfer alarmed Protestant and foreign opinion, but was one provocation among many."],
  ["card_1625_lower_saxon_neutrality", "opt_refuse_lower_saxon_neutrality", "foreign_intervention_risk", 6,
    "Refusing Lower Saxon neutrality helped bring Denmark in, but Christian IV had his own dynastic motives in the Lower Saxon Circle."],
  ["card_1621_ban_of_frederick", "opt_issue_upper_ban", "foreign_intervention_risk", 3,
    "The ban on Frederick alarmed Protestant Europe, but the Palatine cause's foreign backers were already engaged; the ban formalized more than it provoked."],
  ["card_1622_palatine_settlement", "opt_palatine_keep_ban", "foreign_intervention_risk", 3,
    "Holding the ban kept the Palatine wound open, but the decisive foreign alarm came with the electoral transfer, counted separately."],
  ["card_1627_palatine_peace_opening", "opt_require_frederick_personal_submission", "foreign_intervention_risk", 4,
    "Demanding personal submission foreclosed a settlement, but by 1627 foreign intervention turned more on Swedish and French calculation than on the Palatine terms."],
  ["card_1628_mecklenburg_reward", "opt_grant_mecklenburg_wallenstein", "foreign_intervention_risk", 5,
    "Dispossessing the Mecklenburg dukes for Wallenstein alarmed the north and the Baltic powers, but the decisive Swedish provocation was the Edict of Restitution that followed."],
  ["card_1627_restoration_mandates", "opt_push_restoration", "foreign_intervention_risk", 5,
    "Restoration in the hereditary lands alarmed Protestant opinion, but the decisive foreign provocation was the Empire-wide Edict of Restitution two years later, counted separately."],
  ["card_1629_restitution_edict", "opt_issue_restitution_edict", "foreign_intervention_risk", 8,
    "The Edict of Restitution (1629) was the single greatest provocation to foreign intervention, helping bring Sweden in. It stays the largest single foreign beat, but trimmed so the historical line sits in the high 'Sweden intervened' band rather than past the line where outsiders dictate the Empire's fate, which Ferdinand never reached: he died emperor in 1637."],
  ["card_1631_intervention_crisis", "opt_reject_leipzig", "foreign_intervention_risk", 2,
    "Rejecting the Leipzig Convention pushed the neutralist Protestant estates toward Sweden, the 1631 nadir (Breitenfeld). But Ferdinand survived this peak; the spike belongs in the danger band so the line can reach the 1634-35 recovery (Nordlingen, the Peace of Prague) that drew the estates back."],
  ["card_1631_saxon_break", "opt_accept_saxon_break_as_war", "foreign_intervention_risk", 2,
    "Saxony's break to Sweden marked the depth of foreign intervention, but treating it as open war (rather than capitulating) kept the door open to the later reconciliation at Prague."],

  // The Peace of Prague (1635) was the central imperial recovery: Saxony and the
  // Lutheran estates were reconciled to the emperor and left the Swedish
  // alliance. The historical version was encoded as a mild estate gain with a
  // foreign *increase*; in fact it drew the German estates out of the foreign
  // coalition (foreign relief) and substantially restored estate trust, even
  // though its exclusions and the open French entry kept the war going.
  ["card_1635_prague_peace", "opt_prague_historical_exclusions", "estate_trust", 16,
    "Prague reconciled Saxony and most Lutheran estates to the emperor; trust recovers markedly even though the exclusions left some outside the settlement."],
  ["card_1635_prague_peace", "opt_prague_historical_exclusions", "foreign_intervention_risk", -10,
    "Drawing the German estates out of the Swedish alliance was a real reduction in foreign leverage inside the Empire, even as France entered openly on its own account."],

  // --- Both-sides completeness: a handful of options carried only costs or only
  // gains. Each gets its missing side so no choice is a free lunch or a pure
  // sacrifice.
  ["card_1625_lower_saxon_neutrality", "opt_force_lower_saxony_by_league", "imperial_authority", 6,
    "Compelling the wavering circle by armed force projected imperial authority (the gain) at the cost of trust, devastation, and foreign alarm."],
  ["card_1634_remove_wallenstein", "opt_wallenstein_reconcile_narrow", "imperial_authority", 4,
    "Reconciling with Wallenstein while narrowing his command let the emperor be seen to manage his general rather than be managed (the gain), though the dependence and his grievance remained."],
  ["card_1637_ferdinand_iii_election", "opt_secure_ferdinand_iii", "fiscal_capacity", -6,
    "Securing Ferdinand III's election as King of the Romans (1636) was bought with electoral capitulations and inducements — a real fiscal cost beside the dynastic gain."],
];

const cards = JSON.parse(readFileSync(cardsPath, "utf8"));
let changed = 0;
const errors = [];

for (const [cardId, optionId, pressure, value] of ADJUSTMENTS) {
  const card = cards.find((c) => c.id === cardId);
  const option = card?.options.find((o) => o.id === optionId);
  if (!option) {
    errors.push(`missing ${cardId} / ${optionId}`);
    continue;
  }
  option.effects ??= {};
  if (option.effects[pressure] !== value) {
    option.effects[pressure] = value;
    changed++;
  }
}

if (errors.length) {
  console.error("ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}

writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n");
console.log(`Balance adjustments applied. Effects changed: ${changed}.`);
