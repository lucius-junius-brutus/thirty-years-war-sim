// USAGE: node scripts/cards/frederick-phase2.mjs
// Idempotent: Frederick V's "The Unraveling" arc (cards 9-13) + claims.

import { readFileSync, writeFileSync } from "node:fs";
const read = (p) => JSON.parse(readFileSync(new URL(`../../data/${p}`, import.meta.url), "utf8"));
const write = (p, v) => writeFileSync(new URL(`../../data/${p}`, import.meta.url), JSON.stringify(v, null, 2) + "\n");
const SRC = ["src_wilson_europes_tragedy"];

const claim = (id, fact, cc) => ({
  id, historical_fact: fact,
  source_backed_interpretation: `Wilson's account of the Bohemian war's collapse frames this as a turn in Frederick's ruin. ${cc}`,
  causal_claim: cc,
  game_abstraction: "A decision as Frederick's cause comes apart, weighed against its cost to the dynasty.",
  player_facing_text: cc,
  mechanical_effect: "Trades the cause and morale against the lands, the dignity, and the law.",
  confidence: "medium", review_status: "needs_review", source_refs: SRC,
});

const claims = [
  claim("claim_fred_mansfeld", "Frederick's army depended on mercenary captains, above all Ernst von Mansfeld, whose unpaid men plundered the lands they crossed.", "Relying on freebooters keeps an army in the field but ravages the country and binds the cause to captains who answer to their own interest."),
  claim("claim_fred_two_fronts", "While Frederick held Bohemia, Spinola's Spanish army of Flanders overran the Lower Palatinate in 1620.", "He could not defend both the crown he had seized and the inheritance he had staked; holding Bohemia meant abandoning the Palatinate to the Spanish."),
  claim("claim_fred_white_mountain_eve", "On 8 November 1620 the imperial and League army confronted Frederick's smaller, unpaid force on the White Mountain outside Prague.", "Giving battle risked everything on one throw; withdrawing or seeking terms might have preserved an army to bargain with."),
  claim("claim_fred_white_mountain_after", "Frederick's army was broken in about an hour; he fled Prague and Bohemia within days, earning the mocking title of the Winter King.", "Flight kept the claim alive but surrendered the kingdom, the capital, and his standing; a last stand or a submission would have ended the war on other terms."),
  claim("claim_fred_peripheries", "After White Mountain, resistance flickered on in Silesia, Moravia, and Bethlen's east before collapsing.", "Fighting on from the peripheries kept the cause technically alive but invited the emperor's vengeance on those who had followed him."),
];

const link = (term, dossier_id) => ({ term, dossier_id });
const opt = (id, label, consequence, effects, extra = {}) => ({ id, label, consequence, effects, ...extra });
const card = (id, date, phase, title, briefing, situation, claimId, options, links = []) => ({
  id, role_id: "role_frederick_v", phase_id: phase, date_label: date, title, briefing, situation,
  historian_note: "Authored from Wilson's account of White Mountain and the collapse of Frederick's cause.",
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
  card("card_fred_mansfeld", "1620", "phase_bohemian_revolt", "Mansfeld and the Freebooters",
    "Your army is a patchwork of the Union's reluctant levies and hired captains - chief among them Ernst von Mansfeld, a soldier of fortune whose men feed themselves off the land. They can fight, but they obey their own interest and ravage friend and foe alike.",
    "The captains want their pay and their plunder. Keep them in the field, or do without.",
    "claim_fred_mansfeld",
    [
      opt("opt_fred_rely_mansfeld", "Keep Mansfeld and the mercenary captains in the field.",
        "In the event the freebooters fought Frederick's war and fed it on the country, holding an army together at the price of the lands it crossed.",
        { estate_trust: 5, military_dependence: 12, devastation: 9 },
        { historical_option: true, memory_tags: ["mansfeld_dependence"] }),
      opt("opt_fred_disband_freebooters", "Refuse the freebooters; rely on disciplined Union troops alone.",
        "Sparing the country leaves you a smaller, cleaner force - and far too weak to meet the imperial and Spanish armies gathering against you.",
        { military_dependence: -8, devastation: -6, dynastic_security: -8, estate_trust: -4 }),
    ],
    [link("Ernst von Mansfeld", "dossier_mansfeld")]),
  card("card_fred_two_fronts", "1620", "phase_bohemian_revolt", "The Spanish on the Rhine",
    "While you hold Bohemia, Spinola's Spanish army of Flanders crosses into the Lower Palatinate - your own homeland on the Rhine. You cannot defend both the kingdom you have taken and the inheritance you staked. One must be left to its fate.",
    "Word comes that the Spanish are in the Palatinate. Hold Bohemia, or turn for home.",
    "claim_fred_two_fronts",
    [
      opt("opt_fred_hold_bohemia", "Hold Bohemia and let the Palatinate be overrun.",
        "In the event the Spanish took the Lower Palatinate while Frederick clung to Prague; he kept the crown a little longer and lost the inheritance under it.",
        { estate_trust: 5, confessional_legitimacy: 3, dynastic_security: -14, devastation: 8 },
        { historical_option: true, memory_tags: ["palatinate_left_exposed"] }),
      opt("opt_fred_defend_palatinate", "Turn back to defend the Rhine, abandoning Bohemia.",
        "Saving the homeland means leaving the Bohemians who crowned you to the emperor - and confessing the crown was never truly held.",
        { dynastic_security: 8, estate_trust: -14, confessional_legitimacy: -8 }),
    ],
    [link("Spanish army of Flanders", "dossier_spanish_road")]),
  card("card_fred_white_mountain_eve", "November 1620", "phase_bohemian_revolt", "The Eve of White Mountain",
    "The imperial and League army under Tilly and Bucquoy has reached the white limestone hill outside Prague. Your force, unpaid and outnumbered, holds the high ground. Anhalt urges battle; others urge withdrawal behind Prague's walls, or a bid for terms while you still have an army to bargain with.",
    "The enemy forms up below the hill. Give battle, withdraw, or treat.",
    "claim_fred_white_mountain_eve",
    [
      opt("opt_fred_give_battle", "Give battle on the White Mountain.",
        "In the event the army was broken in a single hour. Everything staked on one throw was lost on it.",
        { confessional_legitimacy: 4, estate_trust: 2, dynastic_security: -12, devastation: 6 },
        { historical_option: true, memory_tags: ["gave_battle_white_mountain"] }),
      opt("opt_fred_withdraw_prague", "Withdraw behind Prague's walls and keep the army whole.",
        "Ceding the field preserves a force for another day, but cedes the country and the initiative with it.",
        { estate_trust: 4, confessional_legitimacy: 2, dynastic_security: -4, devastation: 4 }),
      opt("opt_fred_seek_terms_eve", "Seek terms while you still have an army.",
        "Bargaining from a battlefield might salvage the lands and a path back to the law - at the price of the crown and the cause that took it.",
        { imperial_authority: 8, dynastic_security: 6, confessional_legitimacy: -12, estate_trust: -10 },
        { memory_tags: ["sought_terms_early"] }),
    ],
    [link("Battle of White Mountain", "dossier_white_mountain"), link("Tilly", "dossier_tilly")]),
  card("card_fred_white_mountain_after", "November 1620", "phase_bohemian_revolt", "After White Mountain",
    "The battle is lost. Prague lies open, your army scattered, the crown of a single winter slipping from your head. You can attempt a last stand in the city, flee to gather the war elsewhere, or throw yourself on the emperor's mercy.",
    "Prague is yours for hours yet. Stand, flee, or submit.",
    "claim_fred_white_mountain_after",
    [
      opt("opt_fred_flee", "Flee Prague and carry the war elsewhere.",
        "In the event Frederick fled within days, the Winter King uncrowned - keeping the claim alive and losing everything that gave it substance.",
        { confessional_legitimacy: 3, dynastic_security: -10, estate_trust: -8, imperial_authority: -4, foreign_intervention_risk: 6 },
        { historical_option: true, memory_tags: ["fled_prague"] }),
      opt("opt_fred_last_stand", "A last stand in Prague.",
        "A doomed defense buys the cause a martyr's glory and the city a sack.",
        { confessional_legitimacy: 7, dynastic_security: -14, devastation: 12 }),
      opt("opt_fred_submit_mercy", "Throw yourself on the emperor's mercy.",
        "Submission might preserve something of the lands and a place in the law, at the cost of the cause and the men who rose for it.",
        { imperial_authority: 9, dynastic_security: 3, confessional_legitimacy: -14, estate_trust: -10 },
        { memory_tags: ["submitted_after_white_mountain"] }),
    ],
    [link("Winter King", "dossier_frederick_v")]),
  card("card_fred_peripheries", "1621", "phase_palatinate_consolidation", "Silesia and Moravia",
    "The crown is lost, but pockets still resist - the Silesian and Moravian estates, and Bethlen in the east. You can try to keep the war alive from the peripheries, or release your remaining adherents to make their peace and spare them the emperor's vengeance.",
    "Letters from Breslau and from Bethlen ask whether the war goes on. Fight on, or let them go.",
    "claim_fred_peripheries",
    [
      opt("opt_fred_fight_on_peripheries", "Keep the war alive from the peripheries.",
        "In the event resistance flickered on and was snuffed out; those who held to Frederick drew the emperor's vengeance down on themselves.",
        { confessional_legitimacy: 4, estate_trust: 3, imperial_authority: -4, devastation: 8, foreign_intervention_risk: 4 },
        { historical_option: true, memory_tags: ["fought_on_peripheries"] }),
      opt("opt_fred_release_adherents", "Release your adherents to make their peace.",
        "Sparing them the emperor's reprisals means watching the last of the cause dissolve into separate surrenders.",
        { devastation: -6, imperial_authority: 4, estate_trust: -6, confessional_legitimacy: -6 }),
    ],
    [link("Bethlen Gabor", "dossier_bethlen_gabor")]),
];

const upsert = (path, batch) => {
  const ids = new Set(batch.map((x) => x.id));
  write(path, [...read(path).filter((x) => !ids.has(x.id)), ...batch]);
};
upsert("causal_claims/causal_claims.json", claims);
upsert("cards/cards.json", cards);
console.log(`Frederick phase 2: ${cards.length} cards, ${claims.length} claims upserted.`);
