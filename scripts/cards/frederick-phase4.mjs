// USAGE: node scripts/cards/frederick-phase4.mjs
// Idempotent: Frederick V's "Exile" arc (cards 19-24) + claims. These play only
// on lines that survive the 1620-23 catastrophe - the "better than history" tail.

import { readFileSync, writeFileSync } from "node:fs";
const read = (p) => JSON.parse(readFileSync(new URL(`../../data/${p}`, import.meta.url), "utf8"));
const write = (p, v) => writeFileSync(new URL(`../../data/${p}`, import.meta.url), JSON.stringify(v, null, 2) + "\n");
const SRC = ["src_wilson_europes_tragedy"];

const claim = (id, fact, cc) => ({
  id, historical_fact: fact,
  source_backed_interpretation: `Wilson's account of Frederick's exile and the foreign interventions frames this turn. ${cc}`,
  causal_claim: cc,
  game_abstraction: "A decision in exile, weighing a chance of restoration against deeper dependence on foreign arms.",
  player_facing_text: cc,
  mechanical_effect: "Trades a chance at the lands and the cause against agency and the patience of foreign courts.",
  confidence: "medium", review_status: "needs_review", source_refs: SRC,
});

const claims = [
  claim("claim_fred_exile_court", "After 1620 Frederick kept a court-in-exile at The Hague, sustaining the claim and intriguing for restoration.", "Maintaining a government-in-exile keeps the cause alive at constant cost and on foreign sufferance; fading into private life preserves what little remains but ends the struggle."),
  claim("claim_fred_danish", "Frederick pinned hopes on Christian IV of Denmark, whose 1625-29 intervention against the emperor was beaten back.", "Banking the cause on a foreign king's war offers a chance of restoration but makes Frederick a piece in another's game."),
  claim("claim_fred_restitution", "By the late 1620s the emperor, at his height, would consider only a partial and conditional restoration of Frederick on humiliating terms.", "Taking partial restoration recovers something of the lands at the price of renouncing the cause; refusing keeps faith and keeps him landless."),
  claim("claim_fred_swedish", "Gustavus Adolphus's 1630-32 intervention reopened the war and Frederick joined the Swedish king in hope of restoration.", "Returning in Sweden's train is the cause's last real chance and its deepest dependence; the restored prince would be Sweden's client, not his own man."),
  claim("claim_fred_gustavus_terms", "Gustavus offered Frederick a restoration that would have made him a Swedish client; the two never settled terms before Frederick's death.", "Accepting client-kingship recovers the lands as another's vassal; holding out for an independent restoration keeps his dignity and may keep him landless."),
  claim("claim_fred_death", "Frederick died of plague at Mainz in November 1632, weeks after Gustavus's death at Lützen, the claim unredeemed.", "He bequeathed an unredeemed claim to his son Charles Louis, who would regain the Lower Palatinate and a (new, eighth) electoral dignity at the Peace of Westphalia in 1648."),
];

const link = (term, dossier_id) => ({ term, dossier_id });
const opt = (id, label, consequence, effects, extra = {}) => ({ id, label, consequence, effects, ...extra });
const card = (id, date, phase, title, briefing, situation, claimId, options, links = []) => ({
  id, role_id: "role_frederick_v", phase_id: phase, date_label: date, title, briefing, situation,
  historian_note: "Authored from Wilson's account of Frederick's exile and the foreign interventions.",
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
  card("card_fred_exile_court", "1620s", "phase_palatinate_consolidation", "The Court in Exile",
    "Driven from your lands, you keep a court at The Hague - a government without a country, sustained by your wife's spirit and your in-laws' charity. You can hold it together as the living claim to all you lost, or fold it and husband what little the family still holds.",
    "The exile court costs more than it has. Keep the claim alive, or let it rest.",
    "claim_fred_exile_court",
    [
      opt("opt_fred_keep_court", "Keep the court and the claim alive.",
        "In the event Frederick kept his court and his cause through the exile years, on hope and on others' money.",
        { confessional_legitimacy: 6, foreign_intervention_risk: 8, fiscal_capacity: -8 },
        { historical_option: true, memory_tags: ["court_in_exile"] }),
      opt("opt_fred_fade_private", "Fold the court and husband what remains.",
        "Letting the claim rest spares the family its ruin and confesses the cause is spent.",
        { fiscal_capacity: 6, dynastic_security: 4, confessional_legitimacy: -10, foreign_intervention_risk: -6 }),
    ],
    [link("the Dutch", "dossier_protestant_union")]),
  card("card_fred_danish", "1625-1626", "phase_danish_wallenstein", "The Danish Hope",
    "Christian IV of Denmark takes up the Protestant war and the Lower Saxon command. His campaign could carry your restoration on its banners - or it could fail, and leave you the more plainly a beggar at foreign courts.",
    "The Dane marches. Pin the cause on him, or keep your distance.",
    "claim_fred_danish",
    [
      opt("opt_fred_pin_denmark", "Pin the cause on Christian's intervention.",
        "In the event the Danish war was beaten out of Germany by 1629, and the hope pinned to it went down with it.",
        { confessional_legitimacy: 6, dynastic_security: 3, foreign_intervention_risk: 12, military_dependence: 4 },
        { historical_option: true, memory_tags: ["danish_hope"] }),
      opt("opt_fred_keep_clear_denmark", "Keep clear of the Danish adventure.",
        "Standing aside preserves what dignity a landless prince keeps, but lets the one army fighting your enemy fight without you.",
        { foreign_intervention_risk: -8, confessional_legitimacy: -6, estate_trust: -4 }),
    ],
    [link("Christian IV", "dossier_danish_crown")]),
  card("card_fred_restitution", "1627-1628", "phase_restitution_overreach", "The Restitution Question",
    "At the summit of his power the emperor will consider restoring you - in part, conditionally, and on terms that confess you were rightly punished. It is the road back to some of your lands, paved with the renunciation of everything you fought for.",
    "The emperor offers a partial restoration on his terms. Take what is offered, or refuse it.",
    "claim_fred_restitution",
    [
      opt("opt_fred_refuse_partial", "Refuse; hold out for a full and honorable restoration.",
        "In the event Frederick would not buy back a fragment of his lands with the surrender of his cause, and stayed landless.",
        { confessional_legitimacy: 4, estate_trust: 2, imperial_authority: -4, dynastic_security: -6 },
        { historical_option: true, memory_tags: ["refused_partial_restoration"] }),
      opt("opt_fred_take_partial", "Take the partial restoration the emperor offers.",
        "Recovering a portion of the lands means confessing before all that the gamble was a crime - and that you have repented it.",
        { imperial_authority: 8, dynastic_security: 12, confessional_legitimacy: -12, estate_trust: -6 },
        { memory_tags: ["took_partial_restoration"] }),
    ],
    [link("Edict of Restitution", "dossier_edict_of_restitution")]),
  card("card_fred_swedish", "1631", "phase_swedish_wallenstein_crisis", "The Swedish Hope",
    "Gustavus Adolphus of Sweden lands in Germany and breaks the emperor's armies. The war is reopened, and with it the only real chance of your restoration - if you will follow in the Swede's train and on the Swede's terms.",
    "Gustavus offers to carry your cause. Join him, or hold back.",
    "claim_fred_swedish",
    [
      opt("opt_fred_join_gustavus", "Return in Gustavus's train.",
        "In the event Frederick joined the Swedish king, the cause's last real chance bound to a foreign crown's will.",
        { confessional_legitimacy: 8, dynastic_security: 4, foreign_intervention_risk: 12, military_dependence: 6 },
        { historical_option: true, memory_tags: ["swedish_hope"] }),
      opt("opt_fred_hold_back_sweden", "Hold back from the Swedish gamble.",
        "Refusing to be carried preserves the last of your independence and forfeits the last of your chances.",
        { foreign_intervention_risk: -8, confessional_legitimacy: -6, dynastic_security: -4 }),
    ],
    [link("Gustavus Adolphus", "dossier_gustavus_adolphus")]),
  card("card_fred_gustavus_terms", "1632", "phase_swedish_wallenstein_crisis", "Frederick and Gustavus",
    "Marching with the Swedes through your own lost lands, you must settle what your restoration would mean. Gustavus will give it - as his client, his vassal in all but name. To insist on an independent restoration is to risk having none at all.",
    "The Swede will restore you on his terms. Accept the client's crown, or hold for your own.",
    "claim_fred_gustavus_terms",
    [
      opt("opt_fred_client_king", "Accept restoration as Sweden's client.",
        "In the event the terms were never settled; but the price of a Swedish restoration was always to be Sweden's man.",
        { dynastic_security: 10, confessional_legitimacy: 4, foreign_intervention_risk: 10, imperial_authority: -4 },
        { historical_option: true, memory_tags: ["gustavus_client"] }),
      opt("opt_fred_hold_independence", "Hold out for an independent restoration.",
        "Keeping your dignity may keep you landless, with no patron willing to restore a prince who will not be owned.",
        { imperial_authority: 4, foreign_intervention_risk: -6, dynastic_security: -8 }),
    ],
    [link("Gustavus Adolphus", "dossier_gustavus_adolphus")]),
  card("card_fred_death", "November 1632", "phase_swedish_wallenstein_crisis", "Death at Mainz",
    "Plague takes you at Mainz, weeks after Gustavus falls at Lützen and the Swedish thunderbolt is spent. The claim you carried for thirteen years is still unredeemed. What you leave is a name, a grievance, and a son.",
    "The reckoning comes. What passes to your heir.",
    "claim_fred_death",
    [
      opt("opt_fred_claim_to_heir", "Bequeath the unredeemed claim to your son.",
        "In the event the claim outlived the man: Charles Louis would win back the Lower Palatinate and a new electoral dignity at Westphalia in 1648.",
        { confessional_legitimacy: 4, dynastic_security: 3, imperial_authority: -2, foreign_intervention_risk: 2 },
        { historical_option: true, memory_tags: ["claim_to_heir"] }),
      opt("opt_fred_let_claim_lapse", "Make your peace and let the claim lapse with you.",
        "Releasing your son from the grievance buys him a quieter life and ends the house's old quarrel unwon.",
        { imperial_authority: 4, confessional_legitimacy: -6, dynastic_security: -2 }),
    ],
    [link("Battle of Lützen", "dossier_lutzen")]),
];

const upsert = (path, batch) => {
  const ids = new Set(batch.map((x) => x.id));
  write(path, [...read(path).filter((x) => !ids.has(x.id)), ...batch]);
};
upsert("causal_claims/causal_claims.json", claims);
upsert("cards/cards.json", cards);
console.log(`Frederick phase 4: ${cards.length} cards, ${claims.length} claims upserted.`);
