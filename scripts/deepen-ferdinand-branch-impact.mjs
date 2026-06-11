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

function addLinks(card, links) {
  const existing = card.context_links ?? [];
  const seen = new Set(existing.map((link) => `${link.term}:${link.dossier_id}`));
  links.forEach((link) => {
    const key = `${link.term}:${link.dossier_id}`;
    if (!seen.has(key)) {
      existing.push(link);
      seen.add(key);
    }
  });
  card.context_links = existing;
}

function removeLink(card, term, dossierId) {
  card.context_links = (card.context_links ?? []).filter(
    (link) => !(link.term === term && link.dossier_id === dossierId),
  );
}

function addMemoryVariant(card, variant) {
  const variants = card.memory_variants ?? [];
  const key = variant.required_memory_tags.join("|");
  const index = variants.findIndex(
    (item) => item.required_memory_tags.join("|") === key,
  );
  if (index >= 0) {
    variants[index] = { ...variants[index], ...variant };
  } else {
    variants.push(variant);
  }
  card.memory_variants = variants;
}

function setOptionPressure(card, optionId, requiresPressures, unavailableText) {
  const option = card.options.find((item) => item.id === optionId);
  if (!option) {
    throw new Error(`Missing option ${optionId} on ${card.id}`);
  }
  option.requires_pressures = requiresPressures;
  option.unavailable_text = unavailableText;
  option.hidden_when_unavailable = false;
}

function cardById(cards, id) {
  const card = cards.find((item) => item.id === id);
  if (!card) {
    throw new Error(`Missing card ${id}`);
  }
  return card;
}

function option(id, label, consequence, effects, claimId, memoryTags, status) {
  const item = {
    id,
    label,
    consequence,
    effects,
    causal_claim_ids: [claimId],
    memory_tags: memoryTags,
  };
  if (status === "historical") {
    item.historical_option = true;
  } else {
    item.counterfactual_source_status = status;
    item.research_tags = [
      "source:wilson_europes_tragedy",
      "needs_cross_source_check",
      "branch_impact_pass",
    ];
  }
  return item;
}

let dossiers = readJson("data/dossiers/dossiers.json");
let cards = readJson("data/cards/cards.json");

dossiers = upsertById(dossiers, [
  {
    id: "dossier_protestant_union",
    title: "Protestant Union",
    dossier_type: "institution",
    summary:
      "Defensive association formed around Palatine leadership after confidence in ordinary imperial remedies weakened.",
    why_it_matters:
      "The Union made insecurity organizational. Even when it avoided open war, it gave Protestant estates correspondence, money, and a language of lawful defence.",
    source_refs: ["src_wilson_europes_tragedy", "src_wilson_sourcebook"],
    review_status: "needs_review",
  },
  {
    id: "dossier_catholic_league",
    title: "Catholic League",
    dossier_type: "institution",
    summary:
      "Association of Catholic estates under Bavarian direction, created as a confessional and security answer to Protestant coordination.",
    why_it_matters:
      "The League gave Ferdinand soldiers when his own means were thin, but it also made Maximilian's interests part of every later settlement.",
    source_refs: ["src_wilson_europes_tragedy", "src_vales_munich_treaty_1619"],
    review_status: "needs_review",
  },
  {
    id: "dossier_swedish_crown",
    title: "Swedish Crown",
    dossier_type: "institution",
    summary:
      "The Swedish monarchy under Gustavus Adolphus entered the German war as Protestant protector, Baltic power, and opponent of Habsburg consolidation.",
    why_it_matters:
      "Swedish intervention turned unresolved imperial settlement into a European military problem, especially once Saxony and other Lutherans lost confidence in Ferdinand's terms.",
    source_refs: ["src_wilson_europes_tragedy"],
    review_status: "needs_review",
  },
  {
    id: "dossier_danish_crown",
    title: "Danish Crown",
    dossier_type: "institution",
    summary:
      "The Danish monarchy under Christian IV entered the German war through Lower Saxon leadership, Protestant security claims, and Baltic interests.",
    why_it_matters:
      "Denmark's intervention widened Ferdinand's problem from Bohemian and Palatine punishment into northern imperial order, bishoprics, and foreign kings acting inside the Empire.",
    source_refs: ["src_wilson_europes_tragedy"],
    review_status: "needs_review",
  },
  {
    id: "dossier_french_crown",
    title: "French Crown",
    dossier_type: "institution",
    summary:
      "The Bourbon monarchy watched Habsburg success in the Empire as a dynastic and strategic danger before entering the war directly.",
    why_it_matters:
      "A settlement that excluded too many enemies could still leave France with clients, reasons, and openings to prolong the war.",
    source_refs: ["src_wilson_europes_tragedy"],
    review_status: "needs_review",
  },
]);

addLinks(cardById(cards, "card_1608_security_blocs"), [
  { term: "Protestant Union", dossier_id: "dossier_protestant_union" },
  { term: "Catholic League", dossier_id: "dossier_catholic_league" },
  { term: "Maximilian", dossier_id: "dossier_maximilian_bavaria" },
]);

addMemoryVariant(cardById(cards, "card_1620_bavarian_army"), {
  required_memory_tags: ["catholic_league_encouraged"],
  briefing:
    "Munich's hand is already strengthened. Since the court treated Catholic association as the necessary answer to Protestant coordination, Maximilian and the League now appear less as petitioners than as the instrument already chosen for rescue.",
  situation:
    "Bohemia, Transylvania, and Frederick's supporters still create an immediate force problem. The price is sharper: Bavarian command, compensation, and a voice in settlement now follow from an earlier policy as well as from present necessity.",
});
addMemoryVariant(cardById(cards, "card_1620_bavarian_army"), {
  required_memory_tags: ["leagues_tolerated"],
  briefing:
    "Because the leagues were tolerated as emergency instruments under imperial law, Munich can offer aid in the same guarded language. Maximilian and the Catholic League promise rescue while professing obedience to the public peace.",
  situation:
    "The offer is useful because it looks lawful; it is dangerous because the army that saves Bohemia will also carry claims for command, compensation, and consultation.",
});
addMemoryVariant(cardById(cards, "card_1620_bavarian_army"), {
  required_memory_tags: ["leagues_suppressed"],
  briefing:
    "The earlier condemnation of the leagues now returns as difficulty. Maximilian can still help, but the court must explain why Catholic armed association is unlawful in principle and indispensable in practice.",
  situation:
    "Bohemia requires force before ordinary imperial levies can answer. Accepting Bavarian aid under these conditions risks making necessity stronger than the very law invoked against faction.",
});

addLinks(cardById(cards, "card_1620_bavarian_army"), [
  { term: "Catholic League", dossier_id: "dossier_catholic_league" },
]);

const lowerSaxon = cardById(cards, "card_1625_lower_saxon_neutrality");
removeLink(lowerSaxon, "Danish", "dossier_peace_of_lubeck");
addLinks(lowerSaxon, [
  { term: "Lower Saxony", dossier_id: "dossier_john_george_saxony" },
  { term: "Danish", dossier_id: "dossier_danish_crown" },
]);

addLinks(cardById(cards, "card_1625_wallenstein_army"), [
  { term: "Bavaria", dossier_id: "dossier_maximilian_bavaria" },
  { term: "League", dossier_id: "dossier_catholic_league" },
]);

const mecklenburg = cardById(cards, "card_1628_mecklenburg_reward");
addLinks(mecklenburg, [
  { term: "Wallenstein", dossier_id: "dossier_wallenstein" },
]);
setOptionPressure(
  mecklenburg,
  "opt_pay_wallenstein_without_land",
  [{ pressure: "fiscal_capacity", min: 50 }],
  "The treasury cannot credibly satisfy Wallenstein's arrears without using land, offices, or future contributions.",
);

const lubeck = cardById(cards, "card_1629_lubeck_peace");
setOptionPressure(
  lubeck,
  "opt_lubeck_general_settlement",
  [
    { pressure: "foreign_intervention_risk", max: 62 },
    { pressure: "estate_trust", min: 38 },
  ],
  "Too much alarm has gathered for a general settlement to be credible without first quieting Protestant security fears.",
);

const restitution = cardById(cards, "card_1629_restitution_edict");
addMemoryVariant(restitution, {
  required_memory_tags: ["lubeck_generous_peace"],
  briefing:
    "The generous peace at Lubeck has removed Denmark without opening a general settlement. Catholic petitioners now press that victory and peace together should permit the old church claims to be made good.",
  situation:
    "A decree can satisfy those claims, but the same paper may tell Lutheran princes that moderation toward Denmark was only preparation for enforcement inside the Empire.",
});
addMemoryVariant(restitution, {
  required_memory_tags: ["restoration_pushed"],
  briefing:
    "Mandates in the hereditary lands have already made Catholic restoration visible in churches, schools, offices, and noble houses. The question now arrives in imperial form.",
  situation:
    "To issue an Edict is to carry the hereditary method into the wider Empire; to delay is to disappoint those who believed victory had proved the method lawful.",
});
addMemoryVariant(restitution, {
  required_memory_tags: ["palatine_proxy_settlement"],
  briefing:
    "The earlier willingness to accept proxy submission in the Palatine matter has preserved a language of settlement. The restitution petitions now test whether that restraint can survive Catholic victory.",
  situation:
    "A broad Edict would reverse the tone of compromise. A narrower interpretation may keep wavering Lutheran estates from treating every imperial paper as threat.",
});
setOptionPressure(
  restitution,
  "opt_trade_restitution_for_peace",
  [
    { pressure: "estate_trust", min: 42 },
    { pressure: "foreign_intervention_risk", max: 68 },
  ],
  "Trust has fallen too low, or foreign danger has risen too far, for restitution to buy peace by bargain alone.",
);

addLinks(restitution, [
  { term: "Lutheran", dossier_id: "dossier_peace_of_augsburg" },
]);

const regensburg = cardById(cards, "card_1630_regensburg_wallenstein");
addLinks(regensburg, [
  { term: "Mecklenburg", dossier_id: "dossier_wallenstein" },
  { term: "electors", dossier_id: "dossier_regensburg_congress" },
]);

const intervention = cardById(cards, "card_1631_intervention_crisis");
addMemoryVariant(intervention, {
  required_memory_tags: ["restitution_edict_issued"],
  briefing:
    "The Edict now travels ahead of every imperial envoy. Reports from Saxony and the Protestant estates no longer ask only for delay; they ask whether obedience can coexist with armed security.",
  situation:
    "The Swedish king is already on imperial soil. If Ferdinand offers no public settlement, the middle party may cease to be middle; if he yields too much, Catholic allies ask what victory and law were for.",
});
addMemoryVariant(intervention, {
  required_memory_tags: ["restitution_peace_bargain"],
  briefing:
    "Because restitution was treated as peace business rather than command alone, Saxon envoys still have language enough to ask for public terms before they choose arms.",
  situation:
    "The Swedish king is already on imperial soil, but the Lutheran middle has not yet lost every reason to bargain with the emperor.",
});
addLinks(intervention, [
  { term: "Swedish king", dossier_id: "dossier_swedish_crown" },
  { term: "Protestant estates", dossier_id: "dossier_protestant_union" },
  { term: "Edict", dossier_id: "dossier_edict_of_restitution" },
]);

const saxonBreakCard = {
  id: "card_1631_saxon_break",
  role_id: "role_ferdinand_ii",
  decision_point_id: "dp_1631_leipzig_off_ramp",
  phase_id: "phase_swedish_wallenstein_crisis",
  date_label: "1631",
  title: "Saxony Crosses the Line",
  briefing:
    "New dispatches report that Saxon counsel no longer trusts suspension by private word. The Edict remains public, Leipzig has been refused, and Swedish arms now offer the security that imperial law no longer seems to provide.",
  situation:
    "John George's step does not make Saxony a natural rebel. It shows that a loyal Lutheran elector can be driven from guarded obedience into armed partnership when the terms of obedience look unsafe.",
  historian_note:
    "Wilson links Ferdinand's refusal of the Leipzig off-ramp to Saxony's movement toward Sweden after the Edict of Restitution had already frightened Lutheran moderates.",
  source_refs: ["src_wilson_europes_tragedy"],
  causal_claim_ids: ["claim_leipzig_rejection_drives_saxony_to_sweden"],
  review_status: "needs_review",
  requires_memory_tags: ["restitution_edict_issued", "leipzig_rejected"],
  requires_pressures: [{ pressure: "foreign_intervention_risk", min: 75 }],
  context_links: [
    { term: "Saxony", dossier_id: "dossier_john_george_saxony" },
    { term: "Edict", dossier_id: "dossier_edict_of_restitution" },
    { term: "Swedish", dossier_id: "dossier_swedish_crown" },
  ],
  options: [
    option(
      "opt_accept_saxon_break_as_war",
      "Treat the Saxon alignment as rebellion and prepare for a wider imperial war.",
      "The court preserves the language of command. The price is that one more elector's obedience must now be recovered by arms.",
      {
        imperial_authority: 4,
        foreign_intervention_risk: 8,
        devastation: 8,
        estate_trust: -8,
      },
      "claim_leipzig_rejection_drives_saxony_to_sweden",
      ["saxony_alarm_confirmed"],
      "historical",
    ),
    option(
      "opt_reopen_saxon_terms_after_break",
      "Send public suspension terms to separate Saxony from Sweden.",
      "Envoys carry a late offer that may loosen Saxon commitment but cannot erase the proof that armed pressure forced the paper.",
      {
        estate_trust: 6,
        foreign_intervention_risk: -4,
        confessional_legitimacy: -5,
        imperial_authority: -3,
      },
      "claim_leipzig_rejection_drives_saxony_to_sweden",
      ["saxon_terms_reopened"],
      "wilson_inference",
    ),
  ],
};

cards = cards.filter((card) => card.id !== saxonBreakCard.id);
const recallIndex = cards.findIndex(
  (card) => card.id === "card_1632_recall_wallenstein",
);
if (recallIndex < 0) {
  throw new Error("Missing recall card for Saxon break insertion");
}
cards.splice(recallIndex, 0, saxonBreakCard);

const recall = cardById(cards, "card_1632_recall_wallenstein");
addLinks(recall, [
  { term: "Bavaria", dossier_id: "dossier_maximilian_bavaria" },
]);

const wallensteinPeace = cardById(cards, "card_1633_wallenstein_peace");
addLinks(wallensteinPeace, [
  { term: "settlement", dossier_id: "dossier_peace_of_prague" },
]);

const wallensteinRemoval = cardById(cards, "card_1634_remove_wallenstein");
addLinks(wallensteinRemoval, [
  { term: "Wallenstein", dossier_id: "dossier_wallenstein" },
]);

const prague = cardById(cards, "card_1635_prague_peace");
addMemoryVariant(prague, {
  required_memory_tags: ["wallenstein_removed_by_force"],
  briefing:
    "After Wallenstein's violent removal and Nordlingen's victory, Saxon articles come within reach. The court can speak again of imperial order, but officers and princes remember how command was recovered.",
  situation:
    "The Edict can be quieted, armies joined under emperor and Empire, and many Lutheran estates brought home. The danger lies in the names left outside the pardon.",
});
addMemoryVariant(prague, {
  required_memory_tags: ["restitution_peace_bargain"],
  briefing:
    "Because restitution was already treated as negotiable peace business, the Saxon articles now arrive less as surrender than as a form the court has made possible.",
  situation:
    "The settlement can restore obedience widely, but every excluded prince, exile, and army remains useful to France or Sweden.",
});
addLinks(prague, [
  { term: "France", dossier_id: "dossier_french_crown" },
  { term: "Sweden", dossier_id: "dossier_swedish_crown" },
  { term: "Saxon", dossier_id: "dossier_john_george_saxony" },
]);

const hessen = cardById(cards, "card_1636_hessen_amnesty");
addLinks(hessen, [
  { term: "France", dossier_id: "dossier_french_crown" },
  { term: "Prague", dossier_id: "dossier_peace_of_prague" },
]);

const succession = cardById(cards, "card_1637_ferdinand_iii_election");
addLinks(succession, [
  { term: "electors", dossier_id: "dossier_regensburg_congress" },
  { term: "Ferdinand's son", dossier_id: "dossier_ferdinand_ii" },
]);

writeJson("data/dossiers/dossiers.json", dossiers);
writeJson("data/cards/cards.json", cards);
