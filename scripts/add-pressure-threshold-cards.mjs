import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, data) {
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(data, null, 2)}\n`,
  );
}

function trackedOption(
  id,
  label,
  consequence,
  effects,
  claimId,
  memoryTags,
  status = "wilson_inference",
) {
  return {
    id,
    label,
    consequence,
    effects,
    causal_claim_ids: [claimId],
    memory_tags: memoryTags,
    counterfactual_source_status: status,
    research_tags: [
      "source:wilson_europes_tragedy",
      "needs_cross_source_check",
      "pressure_threshold_system",
    ],
  };
}

function thresholdCard({
  id,
  tag,
  date,
  phase,
  title,
  briefing,
  situation,
  note,
  claimId,
  links = [],
  options,
}) {
  return {
    id,
    role_id: "role_ferdinand_ii",
    phase_id: phase,
    date_label: date,
    title,
    briefing,
    situation,
    historian_note: note,
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: [claimId],
    review_status: "needs_review",
    requires_memory_tags: [tag],
    context_links: links.length ? links : undefined,
    options,
  };
}

let cards = readJson("data/cards/cards.json").filter(
  (card) => !card.id.startsWith("card_threshold_"),
);

const pressureCards = [
  thresholdCard({
    id: "card_threshold_estates_offer_credit",
    tag: "threshold_estate_trust_high",
    date: "When estate trust is high",
    phase: "phase_palatinate_consolidation",
    title: "Credit Still Offered by the Estates",
    briefing:
      "Several moderate estates answer that imperial terms can still be carried into their diets, provided old liberties are named rather than swallowed in silence.",
    situation:
      "This credit is not affection. It is a usable belief that obedience may still preserve privilege, confession, and local jurisdiction better than armed refusal.",
    note:
      "Wilson repeatedly emphasizes that imperial government depended on cooperation by estates and princes, not command alone.",
    claimId: "claim_legalism_reassures_estates",
    links: [{ term: "estates", dossier_id: "dossier_bohemian_estates" }],
    options: [
      trackedOption(
        "opt_threshold_use_estate_credit_for_settlement",
        "Use the opening to put disputed claims before a controlled diet.",
        "The court spends trust on procedure. More estates remain reachable, though zealous councillors complain that law is being made slow just when victory should speak clearly.",
        {
          estate_trust: -4,
          imperial_authority: 4,
          foreign_intervention_risk: -5,
          confessional_legitimacy: -2,
        },
        "claim_legalism_reassures_estates",
        ["threshold_estate_credit_spent"],
      ),
      trackedOption(
        "opt_threshold_bank_estate_credit",
        "Preserve the opening for a later settlement rather than spend it at once.",
        "The court avoids a quarrel today. The estates' confidence remains useful, but petitioners who expected action begin counting delay as policy.",
        {
          estate_trust: 2,
          imperial_authority: -2,
          confessional_legitimacy: -2,
        },
        "claim_legalism_reassures_estates",
        ["threshold_estate_credit_reserved"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_estate_guarantees",
    tag: "threshold_estate_trust_crisis",
    date: "When estate trust collapses",
    phase: "phase_swedish_wallenstein_crisis",
    title: "Guarantees Before Obedience",
    briefing:
      "Petitions arrive asking not for favor but for written security. Estates that once disputed policy now ask what prevents any privilege from being narrowed after submission.",
    situation:
      "Every concession now looks like admission of weakness, and every refusal strengthens the argument that only armed guarantees can preserve liberties.",
    note:
      "The game abstracts Wilson's wider constitutional point: fear of overreach made settlement harder even after imperial victories.",
    claimId: "claim_restitution_edict_overreach",
    links: [{ term: "privilege", dossier_id: "dossier_bohemian_estates" }],
    options: [
      trackedOption(
        "opt_threshold_issue_estate_guarantees",
        "Offer written guarantees while preserving obedience in form.",
        "Some moderates receive language they can carry home. Catholic hardliners and victorious officers hear that rebellion has taught the court to bargain.",
        {
          estate_trust: 8,
          imperial_authority: -5,
          confessional_legitimacy: -4,
          foreign_intervention_risk: -4,
        },
        "claim_restitution_edict_overreach",
        ["threshold_estate_guarantees_offered"],
      ),
      trackedOption(
        "opt_threshold_refuse_estate_guarantees",
        "Refuse guarantees and insist that obedience precede every privilege.",
        "The court keeps the order of authority intact. The petitions leave unanswered, and foreign patrons gain another file of grievances.",
        {
          imperial_authority: 5,
          estate_trust: -7,
          foreign_intervention_risk: 6,
        },
        "claim_restitution_edict_overreach",
        ["threshold_estate_guarantees_refused"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_army_arrears",
    tag: "threshold_fiscal_capacity_crisis",
    date: "When army finance breaks",
    phase: "phase_danish_wallenstein",
    title: "Arrears on Every Table",
    briefing:
      "Paymasters, colonels, creditors, and allied agents arrive with the same account in different hands. Soldiers can be promised discipline, but not fed by paper.",
    situation:
      "The question before council is no longer how to finance policy. It is which policy survives the arrears.",
    note:
      "Wilson treats war finance and contribution systems as central to the war's political escalation.",
    claimId: "claim_army_finance_devastation",
    links: [{ term: "contribution", dossier_id: "dossier_wallenstein" }],
    options: [
      trackedOption(
        "opt_threshold_shift_arrears_to_contributions",
        "Authorize heavier contributions until pay can be restored.",
        "The army stays in being by pressing the lands harder. Every requisition makes the emperor's war visible in barns, cellars, and town accounts.",
        {
          fiscal_capacity: 10,
          devastation: 10,
          estate_trust: -7,
          military_dependence: 4,
        },
        "claim_army_finance_devastation",
        ["threshold_contributions_deepened"],
      ),
      trackedOption(
        "opt_threshold_reduce_commands_to_save_credit",
        "Disband unreliable companies and save credit for the core army.",
        "The treasury breathes a little. Commanders protest, allies doubt the army's reach, and the crown accepts a smaller instrument.",
        {
          fiscal_capacity: 7,
          military_dependence: -4,
          dynastic_security: -5,
          devastation: -4,
        },
        "claim_army_finance_devastation",
        ["threshold_army_reduced_for_credit"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_treasury_bargain",
    tag: "threshold_fiscal_capacity_high",
    date: "When the treasury has credit",
    phase: "phase_danish_wallenstein",
    title: "Ready Money, Rare Freedom",
    briefing:
      "The treasury is not rich, but it can still answer a demand without granting land, title, or command in place of coin.",
    situation:
      "Money gives the court a kind of liberty that victory alone does not: the ability to refuse some dangerous bargains.",
    note:
      "This is a game abstraction from Wilson's emphasis on the political power created by fiscal scarcity.",
    claimId: "claim_wallenstein_army_solves_capacity_creates_autonomy",
    links: [{ term: "Wallenstein", dossier_id: "dossier_wallenstein" }],
    options: [
      trackedOption(
        "opt_threshold_pay_to_keep_command_free",
        "Use ready credit to keep military rewards within ordinary grants.",
        "Officers grumble less when paid, and fewer servants need to be made princes. The treasury buys constitutional quiet at real cost.",
        {
          fiscal_capacity: -8,
          military_dependence: -7,
          estate_trust: 4,
        },
        "claim_wallenstein_army_solves_capacity_creates_autonomy",
        ["threshold_credit_used_for_command"],
      ),
      trackedOption(
        "opt_threshold_hold_treasury_for_succession",
        "Reserve credit for succession and diplomacy.",
        "The court keeps money for the next bargain. Commanders notice that their accounts remain second to dynastic business.",
        {
          dynastic_security: 5,
          fiscal_capacity: -2,
          military_dependence: 3,
        },
        "claim_ferdinand_iii_election_secures_dynasty_with_limits",
        ["threshold_credit_reserved_for_succession"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_military_creditors",
    tag: "threshold_military_dependence_crisis",
    date: "When military dependence is extreme",
    phase: "phase_swedish_wallenstein_crisis",
    title: "The Price of Armed Servants",
    briefing:
      "The men who keep armies in the field now send counsel as well as accounts. They ask whether policy will follow the soldiers who make policy possible.",
    situation:
      "To refuse them risks the instrument of survival. To satisfy them teaches every prince that imperial necessity can be made to pay.",
    note:
      "This abstracts the recurring Bavarian and Wallenstein problem: military capacity could become leverage over imperial policy.",
    claimId: "claim_wallenstein_army_solves_capacity_creates_autonomy",
    links: [
      { term: "Wallenstein", dossier_id: "dossier_wallenstein" },
      { term: "Bavarian", dossier_id: "dossier_maximilian_bavaria" }
    ],
    options: [
      trackedOption(
        "opt_threshold_pay_military_creditors",
        "Satisfy the armed creditors before they become rivals.",
        "The army remains usable, but obedience is purchased in public view. The price of survival becomes a precedent.",
        {
          military_dependence: 6,
          fiscal_capacity: -8,
          imperial_authority: -3,
          dynastic_security: 4,
        },
        "claim_wallenstein_army_solves_capacity_creates_autonomy",
        ["threshold_military_creditors_paid"],
      ),
      trackedOption(
        "opt_threshold_reassert_command_over_creditors",
        "Reassert command and risk a break with military creditors.",
        "The court reminds servants that credit is not sovereignty. The reminder is lawful, dangerous, and expensive if the army hesitates.",
        {
          imperial_authority: 6,
          military_dependence: -5,
          dynastic_security: -6,
          estate_trust: 2,
        },
        "claim_wallenstein_liquidation_restores_control_stains_legality",
        ["threshold_command_reasserted_over_creditors"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_foreign_courts",
    tag: "threshold_foreign_intervention_crisis",
    date: "When foreign intervention risk is extreme",
    phase: "phase_swedish_wallenstein_crisis",
    title: "Foreign Courts Find Their Cause",
    briefing:
      "Envoys report that imperial quarrels are being translated abroad into the language of balance, protection, recovery, and religion.",
    situation:
      "The court may still claim domestic law. Other crowns now answer that domestic law has become a European danger.",
    note:
      "Wilson frames the widening war as a fusion of imperial settlement, dynastic security, and foreign-policy calculation.",
    claimId: "claim_leipzig_rejection_drives_saxony_to_sweden",
    links: [
      { term: "Sweden", dossier_id: "dossier_swedish_crown" },
      { term: "France", dossier_id: "dossier_french_crown" }
    ],
    options: [
      trackedOption(
        "opt_threshold_send_public_reassurances_abroad",
        "Send public reassurances to deny foreign courts their pretext.",
        "The papers make intervention harder to justify, but they also bind the emperor to words that allies and estates will quote back at him.",
        {
          foreign_intervention_risk: -8,
          estate_trust: 4,
          imperial_authority: -3,
        },
        "claim_leipzig_rejection_drives_saxony_to_sweden",
        ["threshold_foreign_reassurances_sent"],
      ),
      trackedOption(
        "opt_threshold_answer_foreign_pressure_with_victory",
        "Answer foreign pressure by seeking a decisive military demonstration.",
        "Victory might silence patrons and clients together. Failure would prove that the Empire has become Europe's battlefield.",
        {
          imperial_authority: 5,
          foreign_intervention_risk: 5,
          devastation: 7,
          dynastic_security: -4,
        },
        "claim_leipzig_rejection_drives_saxony_to_sweden",
        ["threshold_foreign_pressure_answered_by_arms"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_succession_breathing_space",
    tag: "threshold_dynastic_security_high",
    date: "When succession is secure",
    phase: "phase_prague_succession",
    title: "A Crown Not Yet in Panic",
    briefing:
      "Councillors note that succession no longer has to be bought in the same breath as every military demand. The dynasty has room to choose its concessions.",
    situation:
      "Security can make moderation easier, but it can also tempt the court to spend less on settlement because the house itself is safe.",
    note:
      "This is the reward side of Ferdinand's dynastic problem: security changes what concessions are politically bearable.",
    claimId: "claim_ferdinand_iii_election_secures_dynasty_with_limits",
    links: [{ term: "succession", dossier_id: "dossier_ferdinand_ii" }],
    options: [
      trackedOption(
        "opt_threshold_use_security_for_moderation",
        "Use dynastic security to offer wider settlement terms.",
        "The court can concede without sounding desperate. Catholic allies complain, but some estates hear strength rather than retreat.",
        {
          estate_trust: 8,
          foreign_intervention_risk: -6,
          confessional_legitimacy: -5,
          dynastic_security: -3,
        },
        "claim_ferdinand_iii_election_secures_dynasty_with_limits",
        ["threshold_security_spent_on_settlement"],
      ),
      trackedOption(
        "opt_threshold_guard_security_for_house",
        "Guard dynastic security and make fewer settlement promises.",
        "The house remains safer, but the Empire hears less of reconciliation and more of continuity.",
        {
          dynastic_security: 4,
          estate_trust: -4,
          foreign_intervention_risk: 3,
        },
        "claim_ferdinand_iii_election_secures_dynasty_with_limits",
        ["threshold_security_guarded"],
      ),
    ],
  }),
  thresholdCard({
    id: "card_threshold_devastation_petitions",
    tag: "threshold_devastation_crisis",
    date: "When devastation is extreme",
    phase: "phase_prague_succession",
    title: "The Lands Petition Against Ruin",
    briefing:
      "Town councils, territorial officers, and ecclesiastical administrators send reports that no longer separate war policy from hunger, flight, billeting, and unpaid contribution.",
    situation:
      "Devastation has become an argument in council. Even loyal men ask what obedience can mean if the lands that obey are consumed.",
    note:
      "Wilson treats wartime devastation and material exhaustion as political facts, not merely background suffering.",
    claimId: "claim_army_finance_devastation",
    links: [{ term: "contribution", dossier_id: "dossier_wallenstein" }],
    options: [
      trackedOption(
        "opt_threshold_relieve_devastated_lands",
        "Order relief and contribution limits in the worst-hit lands.",
        "The order gives loyal estates words to defend obedience. Commanders answer that armies cannot march on mercy alone.",
        {
          devastation: -9,
          estate_trust: 7,
          fiscal_capacity: -6,
          military_dependence: 3,
        },
        "claim_army_finance_devastation",
        ["threshold_devastation_relief_ordered"],
      ),
      trackedOption(
        "opt_threshold_keep_contributions_flowing",
        "Keep contributions flowing until peace is closer.",
        "The army remains supplied, and the petitions grow darker. Peace itself begins to look like the only relief still credible.",
        {
          fiscal_capacity: 5,
          devastation: 7,
          estate_trust: -6,
          foreign_intervention_risk: 3,
        },
        "claim_army_finance_devastation",
        ["threshold_contributions_kept_flowing"],
      ),
    ],
  }),
];

const deathIndex = cards.findIndex((card) => card.id === "card_1637_ferdinand_death");
if (deathIndex < 0) {
  throw new Error("Cannot place pressure threshold cards before final death card");
}
cards.splice(deathIndex, 0, ...pressureCards);

writeJson("data/cards/cards.json", cards);
