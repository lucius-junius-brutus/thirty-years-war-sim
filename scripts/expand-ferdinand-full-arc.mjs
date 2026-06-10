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

function upsertById(items, nextItems) {
  const byId = new Map(items.map((item) => [item.id, item]));
  nextItems.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

function option(
  id,
  label,
  consequence,
  effects,
  claimId,
  {
    historical = false,
    memory = [],
    status = "wilson_inference",
    tags = [],
    requires_pressures,
    unavailable_text,
    hidden_when_unavailable = true,
  } = {},
) {
  const item = {
    id,
    label,
    consequence,
    effects,
    causal_claim_ids: [claimId],
    historical_option: historical || undefined,
    memory_tags: memory.length ? memory : undefined,
  };
  if (!historical) {
    item.research_tags = tags.length ? tags : [status];
    item.counterfactual_source_status = status;
  }
  if (requires_pressures) item.requires_pressures = requires_pressures;
  if (unavailable_text) item.unavailable_text = unavailable_text;
  if (requires_pressures) item.hidden_when_unavailable = hidden_when_unavailable;
  return item;
}

function claim(id, fact, interpretation, causal, abstraction, facing, effect) {
  return {
    id,
    historical_fact: fact,
    source_backed_interpretation: interpretation,
    causal_claim: causal,
    game_abstraction: abstraction,
    player_facing_text: facing,
    mechanical_effect: effect,
    confidence: "high",
    review_status: "needs_review",
    source_refs: ["src_wilson_europes_tragedy"],
  };
}

function decision(id, date, situation, constraints, options, stakes, claimId) {
  return {
    id,
    actor_or_power_center_id: "actor_ferdinand_ii",
    date_label: date,
    situation,
    known_constraints: constraints,
    plausible_options: options,
    stakes,
    causal_claim_ids: [claimId],
    confidence: "high",
    review_status: "needs_review",
    source_refs: ["src_wilson_europes_tragedy"],
  };
}

const phases = readJson("data/phases/phases.json");
const claims = readJson("data/causal_claims/causal_claims.json");
const decisionPoints = readJson("data/decision_points/decision_points.json");
let cards = readJson("data/cards/cards.json");

const newPhases = [
  {
    id: "phase_danish_wallenstein",
    name: "Danish, Lower Saxon, and Wallenstein phase",
    start_year: 1624,
    end_year: 1629,
    summary:
      "Lower Saxon neutrality, Danish intervention, imperial army finance, Wallenstein's ascent, and the chance to convert victory into settlement.",
    source_refs: ["src_wilson_europes_tragedy"],
    review_status: "needs_review",
  },
  {
    id: "phase_swedish_wallenstein_crisis",
    name: "Swedish intervention and Wallenstein crisis",
    start_year: 1630,
    end_year: 1634,
    summary:
      "The Edict, Regensburg, Swedish intervention, Saxony's break, Wallenstein's recall, and the destruction of trust between emperor and general.",
    source_refs: ["src_wilson_europes_tragedy"],
    review_status: "needs_review",
  },
  {
    id: "phase_prague_succession",
    name: "Peace of Prague and succession",
    start_year: 1634,
    end_year: 1637,
    summary:
      "Nordlingen restores leverage, Prague offers an imperial settlement, exclusions keep war alive, and Ferdinand secures his son's election before death.",
    source_refs: ["src_wilson_europes_tragedy"],
    review_status: "needs_review",
  },
];

const newClaims = [
  claim(
    "claim_styrian_reform_forms_ferdinand_legalism",
    "Ferdinand revived reform commissions in Inner Austria from 1598 after careful preparation and consultation.",
    "Wilson presents Inner Austria as the place where Catholic restoration, dynastic loyalty, legal narrowness, and force were combined systematically.",
    "Success in Styria encouraged Ferdinand's later confidence that disputed privileges could be narrowed legally and enforced politically.",
    "The pre-1617 formation card sets Ferdinand's governing instinct before Bohemia erupts.",
    "The archduke learns that careful force can look like law.",
    "Confessional legitimacy and dynastic security rise while estate trust narrows.",
  ),
  claim(
    "claim_lower_saxon_neutrality_escalates_danish_phase",
    "By 1624-1625 Lower Saxon and Danish questions brought neutrality, bishoprics, and circle authority into the war.",
    "Wilson frames the issue as imperial authority and church-land politics, not merely Protestant rescue.",
    "Refusing an autonomous Lower Saxon neutrality widened the war while preserving Ferdinand's claim to common imperial order.",
    "Neutrality becomes a pressure gate between territorial liberty and imperial command.",
    "Lower Saxon neutrality cannot remain harmless.",
    "Imperial authority can rise at the cost of intervention risk and devastation.",
  ),
  claim(
    "claim_wallenstein_army_solves_capacity_creates_autonomy",
    "Ferdinand relied on Wallenstein's credit, recruiting, and contribution system after 1625.",
    "Wilson treats Wallenstein's army as a solution to imperial capacity and a new military-fiscal power center.",
    "The army reduces dependence on Bavaria while increasing devastation and command autonomy.",
    "Fiscal weakness makes Wallenstein options more attractive and later more dangerous.",
    "The emperor can buy an army by letting the army feed itself.",
    "Military dependence and devastation rise when Wallenstein is empowered.",
  ),
  claim(
    "claim_1627_palatine_peace_opening_missed",
    "Frederick V made concessions in 1627, but Ferdinand still required personal submission.",
    "Wilson says agreement was close and the humiliation question helped collapse the opening.",
    "Insisting on visible submission preserved rebellion-punishment logic but kept the Palatine grievance alive.",
    "A proxy-submission branch can soften later Palatine and Bavarian cards.",
    "A near peace can fail over the form of obedience.",
    "Peace viability falls if submission is made non-negotiable.",
  ),
  claim(
    "claim_mecklenburg_reward_magnifies_overreach_fear",
    "Ferdinand rewarded Wallenstein with Mecklenburg after Danish defeat.",
    "Wilson emphasizes how unprecedented territorial elevation frightened Protestant princes and Catholic allies.",
    "Paying military debt with territory increased fear that imperial victory could overturn dynastic possession.",
    "Territorial rewards lower fiscal pressure while raising overreach and intervention risk.",
    "A commander becomes a prince, and every prince reads the precedent.",
    "Military dependence and foreign intervention risk rise when old dynasties can be displaced.",
  ),
  claim(
    "claim_lubeck_peace_creates_settlement_chance",
    "The 1629 Peace of Lubeck removed Denmark on generous terms.",
    "Wilson presents the peace as pragmatic and potentially useful against Sweden, but not a general settlement.",
    "Generosity toward Denmark could free resources, but the unresolved religious settlement remained explosive.",
    "A generous peace can create a later Edict fork.",
    "Denmark leaves; the Empire is not yet pacified.",
    "Peace viability rises unless restitution policy consumes the opening.",
  ),
  claim(
    "claim_regensburg_checks_ferdinand_and_dismisses_wallenstein",
    "At Regensburg in 1630, electoral pressure forced Wallenstein's dismissal while Ferdinand sought wider consent.",
    "Wilson treats the congress as a check on imperial overreach and a moment of weakened military readiness.",
    "Conceding to electors lowered fear of overreach but left Ferdinand exposed to Swedish momentum.",
    "High estate alarm can force military concessions.",
    "Consent has a price, and the price is the general.",
    "Military dependence falls unevenly while military capacity weakens.",
  ),
  claim(
    "claim_leipzig_rejection_drives_saxony_to_sweden",
    "Ferdinand rejected the Leipzig Protestant off-ramp and demanded disarmament.",
    "Wilson says this compounded the Edict error and helped push Saxony toward Gustavus.",
    "Refusing legal Protestant security narrowed the middle path and made intervention more effective.",
    "High intervention risk adds Swedish crisis dispatches.",
    "A Lutheran elector runs out of neutral ground.",
    "Foreign intervention risk rises and estate trust falls when Saxony is refused.",
  ),
  claim(
    "claim_wallenstein_recall_necessity_recreates_autonomy",
    "After Swedish victories Ferdinand recalled Wallenstein with broad powers.",
    "Wilson presents the recall as driven by necessity and shadowed by renewed autonomy.",
    "The recall restores military capacity while recreating the independent command problem.",
    "Military pressure can unlock Wallenstein's return.",
    "The man dismissed as dangerous returns as necessary.",
    "Military dependence rises with restored capacity.",
  ),
  claim(
    "claim_wallenstein_liquidation_restores_control_stains_legality",
    "Ferdinand's patents released officers from obedience to Wallenstein before his murder at Eger.",
    "Wilson treats suspicion as plausible while noting the political burial of compromising evidence.",
    "Removing Wallenstein restored command but left a legal and moral stain inside imperial politics.",
    "High military dependence creates a forced rupture card.",
    "The army is recovered by cutting away its maker.",
    "Military dependence falls, while trust and legitimacy suffer.",
  ),
  claim(
    "claim_prague_peace_settles_too_narrowly",
    "The Peace of Prague compromised with Saxony and many Lutherans but excluded key enemies.",
    "Wilson says its exclusions undermined its general-peace character.",
    "The settlement restores imperial cooperation while preserving anti-imperial constituencies.",
    "A broad or narrow amnesty branch determines late-war persistence.",
    "Peace is made, but not for everyone who can still fight.",
    "Peace viability rises or falls according to amnesty breadth.",
  ),
  claim(
    "claim_ferdinand_iii_election_secures_dynasty_with_limits",
    "Ferdinand II secured Ferdinand III's election as king of the Romans in 1636-1637.",
    "Wilson notes the success came with consultation constraints and remaining war burdens.",
    "Dynastic continuity was achieved at the price of constitutional limits and inherited crises.",
    "The end state should measure legacy, not simple victory.",
    "A son is elected; the war is not ended.",
    "Dynastic security rises while imperial freedom remains constrained.",
  ),
];

const newDecisions = [
  decision(
    "dp_1598_styrian_reform",
    "1598-1605",
    "Ferdinand returns to Inner Austria with Protestant estate privileges still standing and Catholic advisers urging him to revive the reform commission.",
    ["His father had conceded privileges under pressure.", "The Estates remain necessary for taxation.", "Catholic advisers believe loyalty and confession must be joined.", "Open revolt remains possible if the provinces combine."],
    ["Revive the reform commission", "Preserve privileges while building Catholic officeholding", "Seek a new estate compact"],
    "This is Ferdinand's training ground: whether Catholic restoration can be made through law, patronage, sequencing, and force.",
    "claim_styrian_reform_forms_ferdinand_legalism",
  ),
  decision(
    "dp_1625_lower_saxon_neutrality",
    "1625",
    "Lower Saxon estates and Denmark press the language of neutrality while imperial and League forces see that neutrality shielding enemies will hollow out imperial authority.",
    ["Denmark can widen the war.", "Imperial circles claim legal liberties.", "Church land disputes remain unsettled."],
    ["Refuse neutrality", "Recognize a temporary neutrality", "Use League pressure to force compliance"],
    "The choice decides whether imperial order is asserted by law, concession, or arms.",
    "claim_lower_saxon_neutrality_escalates_danish_phase",
  ),
  decision(
    "dp_1625_wallenstein_army",
    "1625",
    "Ferdinand needs a field army larger than his treasury can sustain.",
    ["Bavaria and the League remain indispensable.", "The crown lacks ready cash.", "Credit depends on confidence in commanders and rewards."],
    ["Contract Wallenstein", "Limit the army", "Remain League-dependent"],
    "Military capacity can be purchased, but the price is autonomy and burden on the lands.",
    "claim_wallenstein_army_solves_capacity_creates_autonomy",
  ),
  decision(
    "dp_1627_palatine_peace_opening",
    "1627",
    "Frederick V offers concessions as imperial fortunes rise, but the form of submission remains contested.",
    ["Bavaria expects reward.", "Frederick resists humiliation.", "The Palatine question connects to foreign courts."],
    ["Require personal submission", "Accept proxy submission", "Trade restoration for security"],
    "A near settlement can reduce the war's grievance core or fail over obedience.",
    "claim_1627_palatine_peace_opening_missed",
  ),
  decision(
    "dp_1628_mecklenburg_reward",
    "1627-1628",
    "Wallenstein must be paid and secured after victory against Denmark.",
    ["Imperial cash is short.", "Old dynasties watch the Palatine precedent.", "The army expects reward."],
    ["Transfer Mecklenburg", "Grant temporary administration", "Find money instead of land"],
    "The reward can keep the army together while alarming the Empire.",
    "claim_mecklenburg_reward_magnifies_overreach_fear",
  ),
  decision(
    "dp_1629_lubeck_peace",
    "1629",
    "Denmark is beaten on the mainland but not destroyed, while Sweden and Mantua draw attention.",
    ["Denmark still has islands.", "The Lower Saxons are exposed.", "A harsh peace may prolong war."],
    ["Generous peace", "Punitive peace", "Broaden peace into settlement"],
    "One enemy can be removed, but the general settlement remains unresolved.",
    "claim_lubeck_peace_creates_settlement_chance",
  ),
  decision(
    "dp_1630_regensburg_wallenstein",
    "1630",
    "The electors demand relief from Wallenstein and imperial overreach while Ferdinand seeks consent and dynastic progress.",
    ["Electoral consent matters.", "Wallenstein's army frightens allies.", "Sweden has landed in Pomerania."],
    ["Dismiss Wallenstein", "Retain him with limits", "Trade army reform for succession support"],
    "Consent can be bought, but the military price may be severe.",
    "claim_regensburg_checks_ferdinand_and_dismisses_wallenstein",
  ),
  decision(
    "dp_1631_leipzig_off_ramp",
    "1631",
    "Saxony and other Protestant estates seek a lawful middle course as Sweden's presence and Magdeburg's ruin change the field.",
    ["The Edict alarms Lutherans.", "Gustavus seeks German allies.", "Tilly's pressure can make neutrality impossible."],
    ["Reject Leipzig", "Suspend the Edict and accept mediation", "Offer private concessions"],
    "Saxony can still be held near the Empire, or pushed into Sweden's camp.",
    "claim_leipzig_rejection_drives_saxony_to_sweden",
  ),
  decision(
    "dp_1632_recall_wallenstein",
    "1632",
    "Swedish victories force Ferdinand to consider the commander he dismissed.",
    ["Tilly and the League cannot restore the situation alone.", "Wallenstein will demand broad powers.", "Bavaria fears both Sweden and Wallenstein."],
    ["Recall with broad powers", "Recall with limits", "Use coalition command"],
    "Necessity may re-create the power center previously dismantled.",
    "claim_wallenstein_recall_necessity_recreates_autonomy",
  ),
  decision(
    "dp_1634_remove_wallenstein",
    "1634",
    "Wallenstein's opaque negotiations and inactivity make defection fears plausible in Vienna.",
    ["The army's loyalty is uncertain.", "An open trial may expose embarrassing concessions.", "Spain and Bavaria press alternatives."],
    ["Release officers and remove him", "Arrest and try him", "Reconcile under narrow command"],
    "The emperor can regain the army only by choosing a dangerous legal path.",
    "claim_wallenstein_liquidation_restores_control_stains_legality",
  ),
  decision(
    "dp_1635_prague_peace",
    "1635",
    "Nordlingen restores leverage and Saxony is ready for a settlement.",
    ["The Edict must be compromised.", "Bavaria and loyalists expect their rewards protected.", "France and Sweden can use excluded Germans."],
    ["Monarchical-elector peace", "Broader amnesty settlement", "Hard Catholic settlement"],
    "The peace can recover the Empire or preserve the war's excluded enemies.",
    "claim_prague_peace_settles_too_narrowly",
  ),
  decision(
    "dp_1636_ferdinand_iii_election",
    "1636-1637",
    "Ferdinand II's health fails while the dynasty still needs elected continuity.",
    ["Electors can demand capitulation limits.", "War finance remains unresolved.", "Delay risks succession uncertainty."],
    ["Secure the election", "Buy broader enthusiasm", "Delay for military leverage"],
    "Dynastic security can be won without ending the war.",
    "claim_ferdinand_iii_election_secures_dynasty_with_limits",
  ),
];

const dossierLinks = {
  card_1555_augsburg_settlement: [
    { term: "Religious Peace of Augsburg", dossier_id: "dossier_peace_of_augsburg" },
    { term: "Peace of Augsburg", dossier_id: "dossier_peace_of_augsburg" },
  ],
  card_1609_letter_of_majesty: [
    { term: "Letter of Majesty", dossier_id: "dossier_letter_of_majesty" },
    { term: "Bohemian estates", dossier_id: "dossier_bohemian_estates" },
  ],
  card_1598_styrian_reform: [
    { term: "Inner Austria", dossier_id: "dossier_inner_austria" },
    { term: "Ferdinand", dossier_id: "dossier_ferdinand_ii" },
  ],
  card_1618_remove_klesl: [
    { term: "Klesl", dossier_id: "dossier_khlesl" },
  ],
  card_1620_bavarian_army: [
    { term: "Maximilian", dossier_id: "dossier_maximilian_bavaria" },
    { term: "Munich", dossier_id: "dossier_munich_treaty" },
  ],
  card_1621_ban_of_frederick: [
    { term: "Frederick", dossier_id: "dossier_frederick_v" },
    { term: "imperial ban", dossier_id: "dossier_imperial_ban" },
  ],
  card_1623_electoral_transfer: [
    { term: "Maximilian", dossier_id: "dossier_maximilian_bavaria" },
    { term: "Frederick", dossier_id: "dossier_frederick_v" },
  ],
  card_1629_restitution_edict: [
    { term: "Edict of Restitution", dossier_id: "dossier_edict_of_restitution" },
    { term: "Peace of Augsburg", dossier_id: "dossier_peace_of_augsburg" },
  ],
};

cards = cards.map((card) => {
  const next = { ...card };
  if (dossierLinks[card.id]) next.context_links = dossierLinks[card.id];
  if (card.id === "card_1623_electoral_transfer") {
    next.pressure_variants = [
      {
        conditions: [{ pressure: "military_dependence", min: 70 }],
        briefing:
          "The memorials from Munich no longer read as requests. They read as accounts due. Maximilian's service in Bohemia, the League's expense, and the unsettled Palatine title are now presented together.",
        situation:
          "The electors hear that the emperor must reward useful loyalty, but several courts warn that an electoral title cannot be moved without wounding the balance of the Empire.",
      },
    ];
    next.options = next.options.map((item) =>
      item.id === "opt_preserve_electoral_balance"
        ? {
            ...item,
            requires_pressures: [
              { pressure: "military_dependence", max: 64 },
              { pressure: "estate_trust", min: 45 },
            ],
            unavailable_text:
              "Bavarian claims now bind the settlement too tightly for a balance policy to be credible.",
            hidden_when_unavailable: true,
          }
        : item,
    );
  }
  if (card.id === "card_1622_catholic_restoration") {
    next.id = "card_1627_restoration_mandates";
    next.date_label = "1627-1628";
    next.title = "Mandates in the Hereditary Lands";
    next.phase_id = "phase_danish_wallenstein";
    next.decision_point_id = undefined;
    delete next.requires_memory_tags;
    next.briefing =
      "Reports from Bohemia, Moravia, and Austria list pastors removed, churches inspected, offices watched, and noble houses pressed toward conformity.";
    next.situation =
      "Catholic loyalists ask that victory now be made visible in worship, schooling, marriage, office, and landholding. Other advisers warn that sudden uniformity will send property, labor, and hatred abroad with the exiles.";
  }
  if (card.id === "card_1623_peace_feelers") {
    delete next.requires_memory_tags;
  }
  if (card.id === "card_1629_restitution_edict") {
    delete next.requires_memory_tags;
  }
  return next;
});

const newCards = [
  {
    id: "card_1598_styrian_reform",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1598_styrian_reform",
    phase_id: "phase_prewar_settlement",
    date_label: "1598-1605",
    title: "The Styrian Lesson",
    briefing:
      "From Graz come the papers of an earlier victory. In Inner Austria, Ferdinand has seen Protestant schools closed, pastors expelled, town councils altered, and Catholic officeholding rebuilt under the cover of princely right.",
    situation:
      "The Estates did not vanish. They withheld taxes, petitioned, threatened emigration, and then mostly remained. The lesson carried forward is dangerous because it appears to have worked: prepare carefully, divide provinces, keep within a narrow reading of law, and act once conscience and counsel are aligned.",
    historian_note:
      "Wilson treats Inner Austria as the formative setting for Ferdinand's legalistic Catholic restoration before the Bohemian crisis.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_styrian_reform_forms_ferdinand_legalism"],
    review_status: "needs_review",
    context_links: [
      { term: "Inner Austria", dossier_id: "dossier_inner_austria" },
      { term: "Ferdinand", dossier_id: "dossier_ferdinand_ii" }
    ],
    options: [
      option("opt_styrian_reform_commission", "Trust the Styrian method: legal commissions, Catholic officeholding, and force when needed.", "The archduke's confidence hardens. Restoration can be imagined as obedience to law rather than innovation.", { confessional_legitimacy: 8, dynastic_security: 8, estate_trust: -6, imperial_authority: 4 }, "claim_styrian_reform_forms_ferdinand_legalism", { historical: true, memory: ["styrian_method_confirmed"] }),
      option("opt_styrian_slow_patronage", "Use patronage and Catholic appointments, but avoid spectacular expulsions.", "Catholic recovery continues more quietly. Zealous advisers ask whether caution has become surrender.", { confessional_legitimacy: 3, dynastic_security: 4, estate_trust: 3, fiscal_capacity: -2 }, "claim_styrian_reform_forms_ferdinand_legalism", { status: "wilson_inference", memory: ["styrian_patronage_gradual"] }),
      option("opt_styrian_estate_compact", "Seek a new compact with the estates before renewing the commission.", "The Estates gain a language of consent. Ferdinand gains fewer enemies and a less certain conscience.", { estate_trust: 8, confessional_legitimacy: -6, dynastic_security: -2, imperial_authority: -3 }, "claim_styrian_reform_forms_ferdinand_legalism", { status: "game_inference", memory: ["styrian_estate_compact"] }),
    ],
  },
  {
    id: "card_1625_lower_saxon_neutrality",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1625_lower_saxon_neutrality",
    phase_id: "phase_danish_wallenstein",
    date_label: "1625",
    title: "Lower Saxony Will Not Stay Quiet",
    briefing:
      "Letters from the north report assemblies claiming neutrality while Danish agents speak of protection, bishoprics, and the defence of endangered estates.",
    situation:
      "If neutrality is accepted without condition, an imperial circle may decide when imperial law binds it. If it is refused, Denmark may enter not as a distant king but as armed guardian of a threatened frontier.",
    historian_note:
      "Wilson frames the Danish-Lower Saxon phase around neutrality, bishoprics, circle politics, and imperial authority.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_lower_saxon_neutrality_escalates_danish_phase"],
    review_status: "needs_review",
    context_links: [{ term: "Lower Saxony", dossier_id: "dossier_john_george_saxony" }],
    options: [
      option("opt_refuse_lower_saxon_neutrality", "Refuse a neutrality that shelters Denmark's cause.", "Imperial orders speak of common liberty and obedience. Northern estates hear command; Denmark hears invitation.", { imperial_authority: 8, foreign_intervention_risk: 8, devastation: 5, estate_trust: -5 }, "claim_lower_saxon_neutrality_escalates_danish_phase", { historical: true, memory: ["lower_saxon_neutrality_refused"] }),
      option("opt_recognize_temporary_neutrality", "Recognize a temporary Kreis neutrality under imperial review.", "The north breathes for a season, but Catholic petitioners ask whether imperial law now waits upon every circle's convenience.", { estate_trust: 8, foreign_intervention_risk: -5, imperial_authority: -7, confessional_legitimacy: -4 }, "claim_lower_saxon_neutrality_escalates_danish_phase", { status: "wilson_inference", memory: ["lower_saxon_neutrality_recognized"] }),
      option("opt_force_lower_saxony_by_league", "Let League pressure compel the wavering estates.", "The language of law arrives with soldiers behind it. The warning is clear, and so is the danger.", { military_dependence: 8, foreign_intervention_risk: 10, estate_trust: -8, devastation: 6 }, "claim_lower_saxon_neutrality_escalates_danish_phase", { status: "game_inference", memory: ["league_pressure_north"] }),
    ],
  },
  {
    id: "card_1625_wallenstein_army",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1625_wallenstein_army",
    phase_id: "phase_danish_wallenstein",
    date_label: "1625",
    title: "A Field Army of Ferdinand's Own",
    briefing:
      "A proposal reaches court promising men faster than the treasury can pay them. Credit, commissions, contributions, and the commander's name will do what ordinary revenue cannot.",
    situation:
      "The emperor can remain dependent on Bavaria and the League, or he can accept an army whose purse lies in the lands it occupies and whose officers look upward through Wallenstein.",
    historian_note:
      "Wilson treats Wallenstein's system as both capacity solution and autonomous military-fiscal network.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_wallenstein_army_solves_capacity_creates_autonomy"],
    review_status: "needs_review",
    context_links: [{ term: "Wallenstein", dossier_id: "dossier_wallenstein" }],
    pressure_variants: [
      {
        conditions: [{ pressure: "fiscal_capacity", max: 34 }],
        briefing:
          "The treasury figures arrive in a poor hand and worse news. Arrears, pledges, and ally claims leave little room for an ordinary imperial army.",
      },
    ],
    options: [
      option("opt_contract_wallenstein_army", "Accept Wallenstein's contribution army.", "Recruiting begins with astonishing speed. So do complaints from the lands asked to feed it.", { fiscal_capacity: 8, military_dependence: 15, devastation: 10, imperial_authority: 5 }, "claim_wallenstein_army_solves_capacity_creates_autonomy", { historical: true, memory: ["wallenstein_empowered"] }),
      option("opt_limit_wallenstein_powers", "Authorize a smaller army under tighter warrants.", "The court keeps the commander on a shorter leash, and receives a smaller instrument in return.", { military_dependence: 5, devastation: 3, fiscal_capacity: -5, imperial_authority: 2 }, "claim_wallenstein_army_solves_capacity_creates_autonomy", { status: "wilson_inference", memory: ["wallenstein_limited"] }),
      option("opt_remain_league_dependent", "Remain with League and Spanish support rather than build a new system.", "Maximilian's value rises again. The emperor avoids one dangerous servant by leaning harder on another ally.", { military_dependence: 10, fiscal_capacity: -4, estate_trust: 2, dynastic_security: -5 }, "claim_wallenstein_army_solves_capacity_creates_autonomy", { status: "game_inference", memory: ["league_dependence_confirmed"] }),
    ],
  },
  {
    id: "card_1627_palatine_peace_opening",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1627_palatine_peace_opening",
    phase_id: "phase_danish_wallenstein",
    date_label: "1627",
    title: "Frederick Nearly Bends",
    briefing:
      "After Danish reverses, word arrives that Frederick will yield more than before: Bohemia renounced, Maximilian accepted for life, submission offered by proxy.",
    situation:
      "The remaining question is not whether Frederick loses face, but how much face the emperor requires him to lose in public before peace can be made.",
    historian_note:
      "Wilson notes that agreement was close, but Ferdinand's demand for personal submission helped close the opening.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_1627_palatine_peace_opening_missed"],
    review_status: "needs_review",
    context_links: [{ term: "Frederick", dossier_id: "dossier_frederick_v" }],
    options: [
      option("opt_require_frederick_personal_submission", "Require Frederick's personal submission to imperial authority.", "The dignity of punishment is preserved. The settlement slips away on the form of obedience.", { imperial_authority: 5, foreign_intervention_risk: 6, estate_trust: -3 }, "claim_1627_palatine_peace_opening_missed", { historical: true, memory: ["palatine_submission_required"] }),
      option("opt_accept_proxy_submission", "Accept proxy submission and secure the renunciations.", "A humiliating journey is spared. Bavaria asks what certainty remains when rebellion can be softened by parchment.", { foreign_intervention_risk: -8, estate_trust: 6, military_dependence: 4, confessional_legitimacy: -4 }, "claim_1627_palatine_peace_opening_missed", { status: "wilson_inference", memory: ["palatine_proxy_settlement"] }),
      option("opt_restore_palatine_security_terms", "Trade limited restoration for security and reparations.", "The Palatine cause is divided from the mercenary war, but every clause must pass through Bavarian suspicion.", { fiscal_capacity: 3, estate_trust: 4, military_dependence: 6, foreign_intervention_risk: -5 }, "claim_1627_palatine_peace_opening_missed", { status: "game_inference", memory: ["palatine_security_bargain"] }),
    ],
  },
  {
    id: "card_1628_mecklenburg_reward",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1628_mecklenburg_reward",
    phase_id: "phase_danish_wallenstein",
    date_label: "1627-1628",
    title: "Mecklenburg as Payment",
    briefing:
      "The commander who raised the army now seeks a reward large enough to satisfy credit, honor, and arrears. Mecklenburg lies under imperial displeasure.",
    situation:
      "To pay with land is easier than paying with money. It also tells every prince that victory may move old houses out and new servants in.",
    historian_note:
      "Wilson presents Wallenstein's elevation in Mecklenburg as a key overreach signal.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_mecklenburg_reward_magnifies_overreach_fear"],
    review_status: "needs_review",
    context_links: [{ term: "Wallenstein", dossier_id: "dossier_wallenstein" }],
    requires_memory_tags: ["wallenstein_empowered"],
    options: [
      option("opt_grant_mecklenburg_wallenstein", "Grant Mecklenburg to Wallenstein.", "The army's maker is paid in princely coin. The Empire studies the precedent with fear.", { fiscal_capacity: 8, military_dependence: 9, foreign_intervention_risk: 9, estate_trust: -8 }, "claim_mecklenburg_reward_magnifies_overreach_fear", { historical: true, memory: ["mecklenburg_to_wallenstein"] }),
      option("opt_mecklenburg_temporary_administration", "Grant administration without hereditary title.", "Wallenstein receives substance without the full shock of a ducal transfer. The distinction satisfies few, but alarms fewer.", { fiscal_capacity: 3, military_dependence: 5, foreign_intervention_risk: 3, estate_trust: -2 }, "claim_mecklenburg_reward_magnifies_overreach_fear", { status: "wilson_inference", memory: ["mecklenburg_admin_only"] }),
      option("opt_pay_wallenstein_without_land", "Seek cash and movable confiscations instead.", "The old dynastic order is spared a warning, but the treasury groans and the army waits.", { fiscal_capacity: -10, military_dependence: 3, estate_trust: 3, dynastic_security: -3 }, "claim_mecklenburg_reward_magnifies_overreach_fear", { status: "game_inference", memory: ["wallenstein_no_princely_reward"] }),
    ],
  },
  {
    id: "card_1629_lubeck_peace",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1629_lubeck_peace",
    phase_id: "phase_danish_wallenstein",
    date_label: "1629",
    title: "Peace at Lubeck",
    briefing:
      "Christian of Denmark has lost the mainland war but not his kingdom. Negotiators ask whether the emperor wants vengeance, compensation, or one enemy removed before Sweden moves.",
    situation:
      "A generous peace can look like weakness to friends expecting spoils. A punitive peace can keep Denmark in the field when the north is already too open.",
    historian_note:
      "Wilson emphasizes the generosity and strategic logic of Lubeck, especially the wish to remove Denmark.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_lubeck_peace_creates_settlement_chance"],
    review_status: "needs_review",
    context_links: [{ term: "Peace at Lubeck", dossier_id: "dossier_peace_of_lubeck" }],
    options: [
      option("opt_lubeck_generous_peace", "Return Danish provinces if Christian abandons the Lower Saxons.", "Denmark leaves the war. The abandoned estates learn what imperial peace costs them.", { foreign_intervention_risk: -5, devastation: -4, confessional_legitimacy: -3, imperial_authority: 4 }, "claim_lubeck_peace_creates_settlement_chance", { historical: true, memory: ["lubeck_generous_peace"] }),
      option("opt_lubeck_punitive_terms", "Demand compensation and sharper guarantees.", "Friends applaud a harder peace. Denmark hesitates, and Swedish calculations improve.", { fiscal_capacity: 5, foreign_intervention_risk: 8, devastation: 5, confessional_legitimacy: 3 }, "claim_lubeck_peace_creates_settlement_chance", { status: "wilson_inference", memory: ["lubeck_punitive_terms"] }),
      option("opt_lubeck_general_settlement", "Use Lubeck to open a general imperial settlement.", "The war party complains that victory is being spent too cheaply; moderates see the first real door in years.", { estate_trust: 8, foreign_intervention_risk: -8, confessional_legitimacy: -6, imperial_authority: -2 }, "claim_lubeck_peace_creates_settlement_chance", { status: "wilson_inference", memory: ["lubeck_general_settlement"] }),
    ],
  },
  {
    id: "card_1630_regensburg_wallenstein",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1630_regensburg_wallenstein",
    phase_id: "phase_swedish_wallenstein_crisis",
    date_label: "1630",
    title: "Regensburg: The Price of Consent",
    briefing:
      "Electoral complaints arrive in a single chorus: contributions, Mecklenburg, the army, the Edict, and Wallenstein's shadow over imperial liberties.",
    situation:
      "Ferdinand seeks consent and dynastic advantage. The electors answer that consent begins with the dismissal of the man who made imperial victory so frightening.",
    historian_note:
      "Wilson treats Regensburg as collective imperial politics checking Ferdinand's overreach.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_regensburg_checks_ferdinand_and_dismisses_wallenstein"],
    review_status: "needs_review",
    context_links: [
      { term: "Regensburg", dossier_id: "dossier_regensburg_congress" },
      { term: "Wallenstein", dossier_id: "dossier_wallenstein" }
    ],
    options: [
      option("opt_dismiss_wallenstein_regensburg", "Dismiss Wallenstein to recover electoral consent.", "The electors receive the sacrifice. Sweden receives a less ready enemy.", { estate_trust: 7, military_dependence: -8, dynastic_security: -5, imperial_authority: -2 }, "claim_regensburg_checks_ferdinand_and_dismisses_wallenstein", { historical: true, memory: ["wallenstein_dismissed"] }),
      option("opt_keep_wallenstein_regensburg", "Keep Wallenstein with reduced powers.", "The army remains; consent thins. The congress begins to look less like settlement than warning.", { military_dependence: 6, estate_trust: -10, foreign_intervention_risk: 6, imperial_authority: 3 }, "claim_regensburg_checks_ferdinand_and_dismisses_wallenstein", { status: "wilson_inference", memory: ["wallenstein_retained_1630"] }),
      option("opt_trade_army_reform_succession", "Offer army reform in exchange for succession support.", "The bargain protects the dynasty more than the field army. It buys time, not peace.", { dynastic_security: 8, military_dependence: -3, estate_trust: 3, fiscal_capacity: -3 }, "claim_regensburg_checks_ferdinand_and_dismisses_wallenstein", { status: "game_inference", memory: ["regensburg_succession_bargain"] }),
    ],
  },
  {
    id: "card_1631_intervention_crisis",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1631_leipzig_off_ramp",
    phase_id: "phase_swedish_wallenstein_crisis",
    date_label: "1631",
    title: "The Door Stands Open",
    briefing:
      "Reports from Saxony and the Protestant estates no longer ask only for delay. They speak of armed security, lawful defence, and the Swedish king already on imperial soil.",
    situation:
      "If Ferdinand offers no public settlement, the middle party may cease to be middle. If he yields too much, Catholic allies ask what victory and law were for.",
    historian_note:
      "Wilson says Ferdinand's refusal of the Leipzig off-ramp compounded the Edict error and helped drive Saxony toward Sweden.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_leipzig_rejection_drives_saxony_to_sweden"],
    review_status: "needs_review",
    requires_pressures: [{ pressure: "foreign_intervention_risk", min: 70 }],
    context_links: [{ term: "Saxony", dossier_id: "dossier_john_george_saxony" }],
    options: [
      option("opt_reject_leipzig", "Reject Leipzig and command disarmament.", "Saxon neutrality breaks under the weight of command. Sweden gains the ally it needed.", { imperial_authority: 4, estate_trust: -12, foreign_intervention_risk: 12, devastation: 8 }, "claim_leipzig_rejection_drives_saxony_to_sweden", { historical: true, memory: ["leipzig_rejected"] }),
      option("opt_suspend_edict_for_saxony", "Suspend the Edict and accept Saxon mediation.", "The Catholic party murmurs, but the Lutheran elector remains reachable.", { estate_trust: 12, foreign_intervention_risk: -10, confessional_legitimacy: -8, imperial_authority: -3 }, "claim_leipzig_rejection_drives_saxony_to_sweden", { status: "wilson_inference", memory: ["leipzig_compromise"] }),
      option("opt_private_saxon_concessions", "Offer private concessions while refusing a public bloc.", "The court tries to buy trust without admitting necessity. The answer depends on how much trust remains.", { estate_trust: 4, foreign_intervention_risk: -3, confessional_legitimacy: -3 }, "claim_leipzig_rejection_drives_saxony_to_sweden", { status: "wilson_inference", memory: ["leipzig_private_terms"] }),
    ],
  },
  {
    id: "card_1632_recall_wallenstein",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1632_recall_wallenstein",
    phase_id: "phase_swedish_wallenstein_crisis",
    date_label: "1632",
    title: "Gollersdorf",
    briefing:
      "After Swedish victories, the dismissed general receives visitors again. He will not return as a mere servant who can be corrected by every ally's complaint.",
    situation:
      "The army can be restored quickly only by granting powers that make the court uneasy. Without him, Bavaria and scattered commands must carry the war.",
    historian_note:
      "Wilson presents Wallenstein's recall as necessity joined to broad delegation.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_wallenstein_recall_necessity_recreates_autonomy"],
    review_status: "needs_review",
    context_links: [{ term: "Wallenstein", dossier_id: "dossier_wallenstein" }],
    options: [
      option("opt_recall_wallenstein_broad", "Recall Wallenstein with broad Gollersdorf powers.", "The imperial army gathers around its old magnet. So do old fears.", { military_dependence: 14, dynastic_security: 8, estate_trust: -5, devastation: 6 }, "claim_wallenstein_recall_necessity_recreates_autonomy", { historical: true, memory: ["wallenstein_recalled_broad"] }),
      option("opt_recall_wallenstein_limited", "Recall him under written limits.", "The court asks for a safer miracle. Wallenstein weighs whether such a command is worth taking.", { military_dependence: 7, dynastic_security: 4, estate_trust: -2 }, "claim_wallenstein_recall_necessity_recreates_autonomy", { status: "wilson_inference", memory: ["wallenstein_recalled_limited"] }),
      option("opt_bavarian_coalition_command", "Build a coalition command without him.", "The old dependency returns under worse circumstances. Maximilian is necessary again.", { military_dependence: 8, dynastic_security: -8, estate_trust: 2, foreign_intervention_risk: 5 }, "claim_wallenstein_recall_necessity_recreates_autonomy", { status: "game_inference", memory: ["coalition_command_1632"] }),
    ],
  },
  {
    id: "card_1633_wallenstein_peace",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1634_remove_wallenstein",
    phase_id: "phase_swedish_wallenstein_crisis",
    date_label: "1633",
    title: "The General Makes His Own Peace",
    briefing:
      "Wallenstein's letters and silences grow harder to read. Some reports say he seeks settlement; others say he seeks command of the settlement itself.",
    situation:
      "To tolerate his diplomacy may split the enemy. To supervise it may provoke him. To prepare alternatives may turn suspicion into rupture.",
    historian_note:
      "Wilson treats Wallenstein's opaque diplomacy as a real source of mistrust even if outright treason remains difficult to prove cleanly.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_wallenstein_liquidation_restores_control_stains_legality"],
    review_status: "needs_review",
    requires_memory_tags: ["wallenstein_recalled_broad"],
    context_links: [{ term: "Wallenstein", dossier_id: "dossier_wallenstein" }],
    options: [
      option("opt_prepare_wallenstein_alternatives", "Build Spanish and Bavarian alternatives to Wallenstein.", "Trust becomes a military plan. The general reads the plan as accusation.", { military_dependence: -2, estate_trust: -3, dynastic_security: 3 }, "claim_wallenstein_liquidation_restores_control_stains_legality", { historical: true, memory: ["wallenstein_rupture_begun"] }),
      option("opt_authorize_wallenstein_talks", "Authorize his peace soundings under explicit warrant.", "The court turns danger into instrument, but every ally fears what the instrument may sign.", { foreign_intervention_risk: -4, estate_trust: 4, military_dependence: 7, confessional_legitimacy: -4 }, "claim_wallenstein_liquidation_restores_control_stains_legality", { status: "wilson_inference", memory: ["wallenstein_talks_authorized"] }),
      option("opt_confront_wallenstein_directly", "Confront and renegotiate his powers.", "The wound is opened before the army chooses sides.", { imperial_authority: 4, military_dependence: -5, dynastic_security: -3 }, "claim_wallenstein_liquidation_restores_control_stains_legality", { status: "game_inference", memory: ["wallenstein_confronted"] }),
    ],
  },
  {
    id: "card_1634_remove_wallenstein",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1634_remove_wallenstein",
    phase_id: "phase_swedish_wallenstein_crisis",
    date_label: "January-February 1634",
    title: "Dead or Alive",
    briefing:
      "Patents are drafted releasing officers from obedience. The matter can be made legal in form only if the army first ceases to be his.",
    situation:
      "An arrest risks delay, trial, and exposure. A removal by force recovers command swiftly, but the chancery will inherit the stain.",
    historian_note:
      "Wilson describes Ferdinand's patents and the political burial after Eger.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_wallenstein_liquidation_restores_control_stains_legality"],
    review_status: "needs_review",
    requires_memory_tags: ["wallenstein_rupture_begun"],
    context_links: [{ term: "Wallenstein", dossier_id: "dossier_wallenstein" }],
    options: [
      option("opt_wallenstein_dead_or_alive", "Release the officers and authorize dead-or-alive removal.", "Wallenstein falls at Eger. The army returns to obedience; the papers do not return to innocence.", { military_dependence: -14, imperial_authority: 7, estate_trust: -6, dynastic_security: 5 }, "claim_wallenstein_liquidation_restores_control_stains_legality", { historical: true, memory: ["wallenstein_removed_by_force"] }),
      option("opt_wallenstein_arrest_trial", "Arrest him for trial before imperial authority.", "The legal road is cleaner and slower. Every day gives the army time to ask whom it serves.", { imperial_authority: 3, military_dependence: -7, dynastic_security: -5, estate_trust: 4 }, "claim_wallenstein_liquidation_restores_control_stains_legality", { status: "wilson_inference", memory: ["wallenstein_trial"] }),
      option("opt_wallenstein_reconcile_narrow", "Reconcile and narrow his command.", "The crisis is postponed inside a smaller circle. Bavaria and Spain do not mistake postponement for safety.", { military_dependence: 6, foreign_intervention_risk: 3, dynastic_security: -4 }, "claim_wallenstein_liquidation_restores_control_stains_legality", { status: "game_inference", memory: ["wallenstein_reconciled"] }),
    ],
  },
  {
    id: "card_1635_prague_peace",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1635_prague_peace",
    phase_id: "phase_prague_succession",
    date_label: "1635",
    title: "The Peace of Prague",
    briefing:
      "After Nordlingen, Saxon articles come within reach. The Edict can be quieted, armies joined under emperor and Empire, and many Lutheran estates brought home.",
    situation:
      "The danger lies in the names left outside the pardon. Every excluded prince, exile, and army becomes useful to France or Sweden.",
    historian_note:
      "Wilson calls Prague a broad settlement undermined by exclusions.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_prague_peace_settles_too_narrowly"],
    review_status: "needs_review",
    context_links: [
      { term: "Peace of Prague", dossier_id: "dossier_peace_of_prague" },
      { term: "Edict", dossier_id: "dossier_edict_of_restitution" }
    ],
    options: [
      option("opt_prague_historical_exclusions", "Make the elector peace and exclude the hard cases.", "Saxony returns. The excluded learn that foreign protection is now their last court of appeal.", { estate_trust: 8, imperial_authority: 8, foreign_intervention_risk: 7, confessional_legitimacy: -3 }, "claim_prague_peace_settles_too_narrowly", { historical: true, memory: ["prague_exclusions_hardline"] }),
      option("opt_prague_broad_amnesty", "Broaden the amnesty while protecting core loyalist rewards.", "The settlement cuts deeper into the enemy's German support, but loyal beneficiaries ask which promises still hold.", { estate_trust: 12, foreign_intervention_risk: -10, military_dependence: 5, confessional_legitimacy: -5 }, "claim_prague_peace_settles_too_narrowly", { status: "wilson_inference", memory: ["prague_amnesty_broad"], requires_pressures: [{ pressure: "estate_trust", min: 50 }], unavailable_text: "Too much trust has been spent for a broad amnesty to command belief." }),
      option("opt_prague_hard_catholic_terms", "Use Nordlingen to demand a harder Catholic settlement.", "Victory is spent like a confession of strength. The peace party thins; foreign patrons gain clients.", { confessional_legitimacy: 8, estate_trust: -12, foreign_intervention_risk: 10, imperial_authority: 4 }, "claim_prague_peace_settles_too_narrowly", { status: "game_inference", memory: ["prague_hard_terms"] }),
    ],
  },
  {
    id: "card_1636_hessen_amnesty",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1635_prague_peace",
    phase_id: "phase_prague_succession",
    date_label: "1635-1636",
    title: "The Amnesty Question",
    briefing:
      "Hessen-Kassel still has soldiers, claims, and foreign suitors. Provisional acceptance of Prague will not become obedience unless terms are made real.",
    situation:
      "To press Westphalian bishoprics may satisfy friends and reopen war. To concede enough may remove an armed enemy while teaching every holdout to bargain.",
    historian_note:
      "Wilson treats Hessen-Kassel as a missed chance after Prague.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_prague_peace_settles_too_narrowly"],
    review_status: "needs_review",
    requires_memory_tags: ["prague_exclusions_hardline"],
    options: [
      option("opt_hessen_deal_fails", "Hold the line and let the deal fail if Wilhelm will not yield enough.", "The ban follows. Hessen returns to the anti-imperial war with a sharper grievance.", { imperial_authority: 4, foreign_intervention_risk: 6, estate_trust: -6, devastation: 4 }, "claim_prague_peace_settles_too_narrowly", { historical: true, memory: ["hessen_lost"] }),
      option("opt_hessen_security_concessions", "Offer security concessions to close the Hessen deal.", "One dangerous army may be removed from the enemy list. Friends with claims in the region count the cost.", { foreign_intervention_risk: -6, estate_trust: 6, confessional_legitimacy: -3, military_dependence: 3 }, "claim_prague_peace_settles_too_narrowly", { status: "wilson_inference", memory: ["hessen_settled"] }),
      option("opt_hessen_military_pressure", "Use military pressure to compel obedience.", "The settlement speaks with cannon behind it. The war in the west hardens.", { imperial_authority: 3, devastation: 8, foreign_intervention_risk: 7, estate_trust: -5 }, "claim_prague_peace_settles_too_narrowly", { status: "game_inference", memory: ["hessen_forced"] }),
    ],
  },
  {
    id: "card_1637_ferdinand_iii_election",
    role_id: "role_ferdinand_ii",
    decision_point_id: "dp_1636_ferdinand_iii_election",
    phase_id: "phase_prague_succession",
    date_label: "1636-1637",
    title: "Regensburg Again",
    briefing:
      "The emperor's health is no longer a private matter. The electors can secure Ferdinand's son, but they can also write new restraints into the price of continuity.",
    situation:
      "To delay is to gamble with succession. To press forward is to accept that the next emperor will inherit both the crown and the conditions attached to it.",
    historian_note:
      "Wilson treats Ferdinand III's election as dynastic success bound by consultation limits and unresolved war.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_ferdinand_iii_election_secures_dynasty_with_limits"],
    review_status: "needs_review",
    context_links: [
      { term: "Regensburg", dossier_id: "dossier_regensburg_congress" },
      { term: "Ferdinand", dossier_id: "dossier_ferdinand_ii" }
    ],
    options: [
      option("opt_secure_ferdinand_iii", "Secure Ferdinand III's election as king of the Romans.", "The dynasty survives the emperor's body. The war survives the dynasty's success.", { dynastic_security: 16, imperial_authority: 3, estate_trust: 4 }, "claim_ferdinand_iii_election_secures_dynasty_with_limits", { historical: true, memory: ["ferdinand_iii_elected"] }),
      option("opt_buy_unanimous_succession", "Buy warmer consent with broader procedural guarantees.", "The election becomes less brittle and the crown less free.", { dynastic_security: 12, estate_trust: 8, imperial_authority: -5, fiscal_capacity: -3 }, "claim_ferdinand_iii_election_secures_dynasty_with_limits", { status: "wilson_inference", memory: ["succession_broad_capitulation"] }),
      option("opt_delay_succession_for_war", "Delay the election until military fortunes improve.", "The chancery gains negotiating room and loses sleep. Every fever now has constitutional meaning.", { dynastic_security: -14, imperial_authority: 2, fiscal_capacity: 3 }, "claim_ferdinand_iii_election_secures_dynasty_with_limits", { status: "game_inference", memory: ["succession_delayed"] }),
    ],
  },
  {
    id: "card_1637_ferdinand_death",
    role_id: "role_ferdinand_ii",
    phase_id: "phase_prague_succession",
    date_label: "February 1637",
    title: "The Emperor Dies",
    briefing:
      "Ferdinand dies with Bohemia held, the dynasty continued, and Catholic restoration rooted deeply in the hereditary lands.",
    situation:
      "The Empire is not at peace. Every unresolved file passes to Ferdinand III: amnesty, armies, foreign crowns, devastated lands, and the question of how much imperial authority can bear before it breaks cooperation.",
    historian_note:
      "Wilson marks Ferdinand II's death as dynastic continuity amid unresolved amnesty, fiscal, foreign, and military problems.",
    source_refs: ["src_wilson_europes_tragedy"],
    causal_claim_ids: ["claim_ferdinand_iii_election_secures_dynasty_with_limits"],
    review_status: "needs_review",
    options: [
      option("opt_receive_final_memorial", "Receive the final memorial of the reign.", "The record is sealed for the next emperor. Ferdinand's victories remain real; so do the wars they did not end.", {}, "claim_ferdinand_iii_election_secures_dynasty_with_limits", { historical: true, memory: ["ferdinand_ii_reign_complete"] }),
      option("opt_order_final_settlement_summary", "Order a final settlement summary for Ferdinand III.", "The clerks gather the unsettled questions into one inheritance: authority, confession, debt, armies, and peace.", {}, "claim_ferdinand_iii_election_secures_dynasty_with_limits", { status: "game_inference", memory: ["final_settlement_summary"] }),
    ],
  },
];

const desiredOrder = [
  "card_1555_augsburg_settlement",
  "card_1608_security_blocs",
  "card_1609_letter_of_majesty",
  "card_1598_styrian_reform",
  "card_1617_bohemian_enforcement",
  "card_1618_prague_defenestration",
  "card_1618_remove_klesl",
  "card_1618_mediation_channel",
  "card_1619_stormy_petition",
  "card_1619_imperial_election",
  "card_1619_frankfurt_coronation",
  "card_1620_bavarian_army",
  "card_1620_saxon_question",
  "card_1620_march_on_prague",
  "card_1620_white_mountain_aftermath",
  "card_1621_blood_court",
  "card_1621_confiscations",
  "card_1621_spanish_rhine",
  "card_1622_league_finance",
  "card_1621_ban_of_frederick",
  "card_1622_palatine_settlement",
  "card_1623_electoral_transfer",
  "card_1623_peace_feelers",
  "card_1625_lower_saxon_neutrality",
  "card_1625_wallenstein_army",
  "card_1627_palatine_peace_opening",
  "card_1627_restoration_mandates",
  "card_1628_mecklenburg_reward",
  "card_1629_lubeck_peace",
  "card_1629_restitution_edict",
  "card_1630_regensburg_wallenstein",
  "card_1631_intervention_crisis",
  "card_1632_recall_wallenstein",
  "card_1633_wallenstein_peace",
  "card_1634_remove_wallenstein",
  "card_1635_prague_peace",
  "card_1636_hessen_amnesty",
  "card_1637_ferdinand_iii_election",
  "card_1637_ferdinand_death",
];

cards = upsertById(cards, newCards);
const byId = new Map(cards.map((card) => [card.id, card]));
cards = desiredOrder.map((id) => {
  const card = byId.get(id);
  if (!card) throw new Error(`Missing card in desired order: ${id}`);
  return card;
});

writeJson("data/phases/phases.json", upsertById(phases, newPhases));
writeJson("data/causal_claims/causal_claims.json", upsertById(claims, newClaims));
writeJson("data/decision_points/decision_points.json", upsertById(decisionPoints, newDecisions));
writeJson("data/cards/cards.json", cards);
