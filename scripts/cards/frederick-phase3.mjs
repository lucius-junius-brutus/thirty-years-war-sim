// USAGE: node scripts/cards/frederick-phase3.mjs
// Idempotent: Frederick V's "Outlawry" arc (cards 14-18) + claims.

import { readFileSync, writeFileSync } from "node:fs";
const read = (p) => JSON.parse(readFileSync(new URL(`../../data/${p}`, import.meta.url), "utf8"));
const write = (p, v) => writeFileSync(new URL(`../../data/${p}`, import.meta.url), JSON.stringify(v, null, 2) + "\n");
const SRC = ["src_wilson_europes_tragedy"];

const claim = (id, fact, cc) => ({
  id, historical_fact: fact,
  source_backed_interpretation: `Wilson's account of Frederick's outlawry and the loss of the Palatinate frames this turn. ${cc}`,
  causal_claim: cc,
  game_abstraction: "A decision as the lands and the dignity are stripped away, weighed against the claim itself.",
  player_facing_text: cc,
  mechanical_effect: "Trades the cause and the claim against the lands, the title, and the law.",
  confidence: "medium", review_status: "needs_review", source_refs: SRC,
});

const claims = [
  claim("claim_fred_ban", "In January 1621 the emperor placed Frederick under the imperial ban, declaring his lands and titles forfeit; the procedure alarmed even electors who disliked him.", "Defying the ban keeps the cause alive at the price of outlawry; submitting might lift it but renounces everything the war was for; appealing to the electors' fear of the precedent is the one constitutional lever left."),
  claim("claim_fred_defend_rhine", "Mansfeld and Christian of Brunswick fought on in the Palatinate in 1621-22, losing ground while ravaging it.", "Pouring strength into the Rhine war contests the homeland but wrecks it; husbanding strength concedes the Palatinate to save what little remains."),
  claim("claim_fred_heidelberg", "Tilly took Heidelberg in September 1622 and the Lower Palatinate was lost; the famous library was carted to Rome.", "Fighting on for the scraps prolongs a hopeless defense; seeking a truce admits the homeland is gone and edges back toward submission."),
  claim("claim_fred_spanish_offer", "Spanish diplomacy through Brussels dangled terms by which Frederick might submit, renounce Bohemia, and perhaps keep his lands and dignity.", "Taking the road back salvages the inheritance at the cost of the cause and the men who rose for it; refusing keeps faith with the cause and forfeits the rescue."),
  claim("claim_fred_transfer", "At the Regensburg Deputationstag of 1623 the emperor transferred Frederick's electoral dignity to Maximilian of Bavaria.", "Protesting the loss keeps the claim pure and gains nothing; bargaining for its return to his heirs preserves a future; accepting it ends the matter on the emperor's terms."),
];

const link = (term, dossier_id) => ({ term, dossier_id });
const opt = (id, label, consequence, effects, extra = {}) => ({ id, label, consequence, effects, ...extra });
const card = (id, date, phase, title, briefing, situation, claimId, options, links = []) => ({
  id, role_id: "role_frederick_v", phase_id: phase, date_label: date, title, briefing, situation,
  historian_note: "Authored from Wilson's account of the ban, the loss of the Palatinate, and the electoral transfer.",
  source_refs: SRC, causal_claim_ids: [claimId], review_status: "reviewed", context_links: links,
  options: options.map((o) => ({
    ...o, causal_claim_ids: [claimId],
    ...(o.historical_option === true ? {} : {
      counterfactual_source_status: "wilson_inference",
      research_tags: ["source:wilson_europes_tragedy", "needs_cross_source_check", `card:${id}`, `option:${o.id}`],
    }),
  })),
});

const cards = [
  card("card_fred_ban", "January 1621", "phase_palatinate_consolidation", "The Imperial Ban",
    "The emperor places you under the imperial ban - outlawed, your lands and titles forfeit in law, any prince free to seize them. You can submit and beg the ban's lifting, defy it and fight on, or appeal to the other electors' fear that an emperor who can outlaw one of their number by decree can outlaw any of them.",
    "The ban is proclaimed across the Empire. Submit, defy, or appeal.",
    "claim_fred_ban",
    [
      opt("opt_fred_defy_ban", "Defy the ban and fight on.",
        "In the event Frederick refused to submit; the ban stood, and he carried it into a war he could no longer win.",
        { confessional_legitimacy: 4, imperial_authority: -14, dynastic_security: -6, foreign_intervention_risk: 6 },
        { historical_option: true, memory_tags: ["imperial_ban_incurred", "defied_ban"] }),
      opt("opt_fred_submit_ban", "Submit and beg the ban's lifting.",
        "Submission might restore a place in the law, at the price of the cause, the crown, and the men who followed you to it.",
        { imperial_authority: 10, dynastic_security: 4, confessional_legitimacy: -14, estate_trust: -8 },
        { memory_tags: ["imperial_ban_incurred", "submitted_to_ban"] }),
      opt("opt_fred_appeal_electors", "Appeal to the electors' fear of the precedent.",
        "Turning the ban into a constitutional question wins quiet sympathy among princes who fear the same fate - but does not lift it.",
        { imperial_authority: 4, estate_trust: 7, confessional_legitimacy: -2, foreign_intervention_risk: 2 },
        { memory_tags: ["imperial_ban_incurred", "appealed_electors"] }),
    ],
    [link("imperial ban", "dossier_imperial_ban"), link("electors", "dossier_imperial_electors")]),
  card("card_fred_defend_rhine", "1621-1622", "phase_palatinate_consolidation", "Defending the Rhine",
    "Mansfeld and Christian of Brunswick fight on in the Palatinate, but they ravage as they go and lose more than they hold. You can pour what strength you have into defending the Rhine, or husband it and let the homeland go.",
    "The captains hold a shrinking corner of the Palatinate. Reinforce the Rhine war, or let it go.",
    "claim_fred_defend_rhine",
    [
      opt("opt_fred_defend_rhine", "Keep Mansfeld and Brunswick fighting for the Palatinate.",
        "In the event the Rhine war dragged on and ruined the country it claimed to defend, holding nothing in the end.",
        { confessional_legitimacy: 3, dynastic_security: 2, military_dependence: 8, devastation: 10 },
        { historical_option: true, memory_tags: ["rhine_war_continues"] }),
      opt("opt_fred_husband_strength", "Husband your strength; let the homeland go.",
        "Sparing the country its last ravaging means watching the Palatinate fall without a fight.",
        { devastation: -8, military_dependence: -6, dynastic_security: -10, confessional_legitimacy: -4 }),
    ],
    [link("Christian of Brunswick", "dossier_christian_brunswick"), link("Mansfeld", "dossier_mansfeld")]),
  card("card_fred_heidelberg", "September 1622", "phase_palatinate_consolidation", "Heidelberg Falls",
    "Tilly takes Heidelberg, your capital; its great library is carted off to Rome. The Lower Palatinate is lost. You can fight on for the scraps that remain, or seek a truce that admits the homeland is gone.",
    "Heidelberg has fallen. Fight on for the scraps, or treat for a truce.",
    "claim_fred_heidelberg",
    [
      opt("opt_fred_fight_on_palatinate", "Fight on for what remains.",
        "In the event Frederick fought on after Heidelberg for a homeland already lost, with Mannheim and Frankenthal soon to follow.",
        { confessional_legitimacy: 2, dynastic_security: -12, military_dependence: 4, devastation: 8 },
        { historical_option: true, memory_tags: ["heidelberg_lost"] }),
      opt("opt_fred_seek_truce_palatinate", "Seek a truce admitting the homeland is gone.",
        "A truce spares the last towns and inches back toward the law, but signs away the Palatinate with your own hand.",
        { imperial_authority: 6, devastation: -6, dynastic_security: -6, confessional_legitimacy: -8, estate_trust: -4 }),
    ],
    [link("Heidelberg", "dossier_frederick_v"), link("Tilly", "dossier_tilly")]),
  card("card_fred_spanish_offer", "1622", "phase_palatinate_consolidation", "The Spanish Offer",
    "Through Brussels the Spanish hint at terms: renounce Bohemia, abandon the war, submit to the emperor - and perhaps keep the Palatinate and your dignity. It is the road back. It is also the road of a man who threw the dice and lost.",
    "The Spanish offer a way home. Take the road back, or hold to the claim.",
    "claim_fred_spanish_offer",
    [
      opt("opt_fred_refuse_spanish_offer", "Refuse; hold to the claim.",
        "In the event Frederick would not renounce Bohemia, and the chance to keep his lands and dignity passed with the offer.",
        { confessional_legitimacy: 4, estate_trust: 2, imperial_authority: -6, dynastic_security: -8, foreign_intervention_risk: 4 },
        { historical_option: true, memory_tags: ["refused_spanish_terms"] }),
      opt("opt_fred_take_spanish_offer", "Take the Spanish road back.",
        "Renouncing Bohemia might keep the inheritance and a place in the Empire - and brand you forever the prince who gave up the cause to save himself.",
        { imperial_authority: 12, dynastic_security: 14, confessional_legitimacy: -16, estate_trust: -12 },
        { memory_tags: ["crown_relinquished_early"] }),
    ],
    [link("Spanish road", "dossier_spanish_road")]),
  card("card_fred_transfer", "1623", "phase_palatinate_consolidation", "The Electorate Transferred",
    "At Regensburg the emperor transfers your electoral dignity - the rank your house has held for centuries - to Maximilian of Bavaria. The other electors protest the precedent but do not stop it. You can protest in vain, bargain for its eventual return to your heirs, or accept the loss.",
    "The dignity is given to Bavaria. Protest, bargain, or accept.",
    "claim_fred_transfer",
    [
      opt("opt_fred_protest_transfer", "Protest the transfer and reject it utterly.",
        "In the event Frederick rejected the transfer as lawless and kept the claim pure - and empty, the dignity gone to Bavaria all the same.",
        { confessional_legitimacy: 4, estate_trust: 2, imperial_authority: -8, dynastic_security: -14 },
        { historical_option: true, memory_tags: ["electorate_lost", "protested_transfer"] }),
      opt("opt_fred_bargain_transfer", "Bargain for its eventual return to your heirs.",
        "Trading present pride for a future claim keeps a door open for a son, at the cost of conceding the loss now.",
        { imperial_authority: 4, estate_trust: 4, dynastic_security: -6, confessional_legitimacy: -4 },
        { memory_tags: ["electorate_lost", "bargained_transfer"] }),
      opt("opt_fred_accept_transfer", "Accept the loss and seek what peace you can.",
        "Accepting the dignity gone buys a measure of the emperor's tolerance and ends the house's electoral centuries.",
        { imperial_authority: 8, dynastic_security: -8, confessional_legitimacy: -10, estate_trust: -6 },
        { memory_tags: ["electorate_lost", "accepted_transfer"] }),
    ],
    [link("Maximilian of Bavaria", "dossier_maximilian_bavaria"), link("Regensburg", "dossier_regensburg_congress")]),
];

const upsert = (path, batch) => {
  const ids = new Set(batch.map((x) => x.id));
  write(path, [...read(path).filter((x) => !ids.has(x.id)), ...batch]);
};
upsert("causal_claims/causal_claims.json", claims);
upsert("cards/cards.json", cards);
console.log(`Frederick phase 3: ${cards.length} cards, ${claims.length} claims upserted.`);
