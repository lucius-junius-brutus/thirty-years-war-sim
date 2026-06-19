// USAGE: node scripts/cards/frederick-phase1.mjs
// Idempotent: adds Frederick V's "The Gamble" arc (cards 1-8), their causal
// claims, and one new dossier. Skips anything whose id already exists.

import { readFileSync, writeFileSync } from "node:fs";
const read = (p) => JSON.parse(readFileSync(new URL(`../../data/${p}`, import.meta.url), "utf8"));
const write = (p, v) => writeFileSync(new URL(`../../data/${p}`, import.meta.url), JSON.stringify(v, null, 2) + "\n");

const SRC = ["src_wilson_europes_tragedy"];

const claim = (id, fact, cc) => ({
  id,
  historical_fact: fact,
  source_backed_interpretation: `Wilson's account of the Bohemian war frames this as a hinge in Frederick's gamble. ${cc}`,
  causal_claim: cc,
  game_abstraction: "A decision in Frederick's Bohemian gamble, weighed against its later cost.",
  player_facing_text: cc,
  mechanical_effect: "Trades standing, the cause, the treasury, and the dynasty against one another.",
  confidence: "medium",
  review_status: "needs_review",
  source_refs: SRC,
});

const claims = [
  claim("claim_fred_crown_offer", "In 1619 the Bohemian estates deposed Ferdinand and offered their elective crown to Frederick V, head of the Protestant Union.", "Accepting the crown turns a secure elector into a rebel against the lawful emperor and stakes the Palatinate on a war; declining forfeits the Protestant cause's best champion."),
  claim("claim_fred_union", "The Protestant Union declined to make Frederick's Bohemian venture its own and signed the Treaty of Ulm (1620) agreeing neutrality.", "Without firm Union backing Frederick must lean on his own and mercenary forces, deepening his dependence on armies he does not control."),
  claim("claim_fred_foreign", "Frederick's father-in-law James I of England refused to endorse the usurpation, and Dutch help was limited; Frederick banked on foreign support that largely failed to come.", "Pinning the cause on foreign courts buys hope now but surrenders agency, making his fate turn on others' calculations."),
  claim("claim_fred_bethlen", "Frederick allied with Bethlen Gabor of Transylvania, who attacked the Habsburg lands from the east in 1619-1620.", "The Transylvanian alliance opens a second front and pressures Vienna, but ties the Protestant cause to an Ottoman-backed prince and alarms moderates."),
  claim("claim_fred_saxony", "Frederick failed to win Lutheran Saxony; John George, distrustful of the Calvinist adventure, sided with the emperor and occupied Lusatia and Silesia.", "Antagonizing or neglecting Lutheran Saxony loses the largest Protestant prince and brands Frederick a reckless Calvinist, splitting the Protestant side."),
  claim("claim_fred_coronation", "Frederick's Calvinist chaplain Scultetus stripped images from Prague's cathedral, offending Bohemian Lutherans and Catholics alike.", "Calvinist zeal at the coronation rallies the Reformed but alienates the broader population whose obedience the new king needs."),
  claim("claim_fred_treasury", "The Bohemian crown was bankrupt and Frederick could not pay his army, relying on contributions and unpaid mercenaries.", "Without money the war is fought on credit and plunder, eroding the treasury and the lands it should protect."),
  claim("claim_fred_estates", "Frederick ruled as a weak elective king dependent on the Bohemian estates, who retained their confederate powers.", "Conceding to the estates keeps their backing but leaves the crown too weak to act; asserting kingship risks losing the consent that elected him."),
];

const dossiers = [
  {
    id: "dossier_bethlen_gabor",
    title: "Bethlen Gabor",
    dossier_type: "person",
    summary: "Gabriel Bethlen, Calvinist Prince of Transylvania (1613-1629), an Ottoman vassal who repeatedly invaded Royal Hungary against the Habsburgs.",
    why_it_matters: "Bethlen's eastern offensives were the most effective military pressure on Vienna during the Bohemian war, but his Ottoman backing made him a compromising ally for a cause that claimed to defend Christendom's Protestants.",
    source_refs: SRC,
    review_status: "needs_review",
  },
];

const link = (term, dossier_id) => ({ term, dossier_id });

const card = (id, date, phase, title, briefing, situation, claimId, options, links = []) => ({
  id,
  role_id: "role_frederick_v",
  phase_id: phase,
  date_label: date,
  title,
  briefing,
  situation,
  historian_note: "Authored from Wilson's account of the Bohemian war and Frederick's gamble.",
  source_refs: SRC,
  causal_claim_ids: [claimId],
  review_status: "reviewed",
  context_links: links,
  options: options.map((o) => ({
    ...o,
    causal_claim_ids: [claimId],
    // Non-historical options are counterfactuals; track their grounding.
    ...(o.historical_option === true
      ? {}
      : {
          counterfactual_source_status: "wilson_inference",
          research_tags: [
            "source:wilson_europes_tragedy",
            "needs_cross_source_check",
            `card:${id}`,
            `option:${o.id}`,
          ],
        }),
  })),
});

const opt = (id, label, consequence, effects, extra = {}) => ({ id, label, consequence, effects, ...extra });

const cards = [
  card(
    "card_fred_crown_offer", "August 1619", "phase_bohemian_revolt",
    "The Crown Offered",
    "The estates of Bohemia have deposed Ferdinand and offer their elective crown to you - a Calvinist elector, head of the Protestant Union, son-in-law of the king of England. To accept is to make war on the lawful emperor and stake the Palatinate on its outcome. To decline is to leave the Protestant cause without its readiest champion.",
    "The Bohemian delegation waits on your answer. A crown, or the safety of your inheritance.",
    "claim_fred_crown_offer",
    [
      opt("opt_fred_accept_crown", "Accept the crown of Bohemia.",
        "In the event Frederick took the crown and the war with it. The Protestant world had its king; the Habsburgs had their rebel.",
        { confessional_legitimacy: 14, estate_trust: 12, imperial_authority: -16, dynastic_security: -10, foreign_intervention_risk: 6, military_dependence: 4 },
        { historical_option: true, memory_tags: ["bohemian_crown_accepted"] }),
      opt("opt_fred_decline_crown", "Decline, and keep the Palatinate and your standing.",
        "Prudence preserves the inheritance, but the Bohemians look elsewhere and the cause loses its champion.",
        { imperial_authority: 8, dynastic_security: 8, confessional_legitimacy: -16, estate_trust: -12 },
        { memory_tags: ["crown_declined"] }),
      opt("opt_fred_temporize_crown", "Temporize - demand guarantees from the Union and England first.",
        "Hesitation cools the Bohemians and puts your fate in others' hands while the moment slips.",
        { confessional_legitimacy: 2, estate_trust: -6, foreign_intervention_risk: 6, imperial_authority: -2 }),
    ],
    [link("Bohemian estates", "dossier_bohemian_estates"), link("Protestant Union", "dossier_protestant_union"), link("emperor", "dossier_ferdinand_ii")],
  ),
  card(
    "card_fred_union", "Late 1619", "phase_bohemian_revolt",
    "The Union's Terms",
    "The Protestant Union you lead is reluctant to make your Bohemian crown its own quarrel. Many of its members fear the emperor and Spain; some will sign for armed neutrality rather than war. You can lean on them to commit, or proceed on your own and mercenary strength.",
    "The Union's princes hedge. Bind the cause to them, or fight without them.",
    "claim_fred_union",
    [
      opt("opt_fred_bind_union", "Make Bohemia the Union's war.",
        "Pressing the Union wins paper commitments and rallies the Reformed, but its half-hearted soldiers answer to their own princes.",
        { confessional_legitimacy: 8, military_dependence: 6, imperial_authority: -6, foreign_intervention_risk: -4 },
        { memory_tags: ["union_committed"] }),
      opt("opt_fred_go_without_union", "Proceed on Palatine and mercenary strength when the Union hangs back.",
        "In the event the Union signed the Treaty of Ulm and stood aside; Frederick fought with Anhalt's army and hired men. The cause pressed on - but began to look like one prince's adventure.",
        { estate_trust: 5, military_dependence: 12, fiscal_capacity: -8, confessional_legitimacy: -4 },
        { historical_option: true, memory_tags: ["union_stood_aside"] }),
    ],
    [link("Protestant Union", "dossier_protestant_union")],
  ),
  card(
    "card_fred_foreign", "1619-1620", "phase_bohemian_revolt",
    "England and the Dutch",
    "Your marriage ties you to James I of England; the Dutch have reason to want the Habsburgs checked. But James will not bless the taking of another king's crown, and Dutch help comes in subsidies, not armies. How far do you pin the cause on foreign courts?",
    "Letters go to The Hague and to London. Hope, or your own strength.",
    "claim_fred_foreign",
    [
      opt("opt_fred_bank_foreign", "Bank the cause on English and Dutch support.",
        "In the event the support never matched the hope: James held back, the Dutch gave money and little more, and Frederick's fate began to rest on courts that were not his.",
        { fiscal_capacity: 8, foreign_intervention_risk: 14, confessional_legitimacy: 4, military_dependence: 2 },
        { historical_option: true, memory_tags: ["leaned_on_foreign_courts"] }),
      opt("opt_fred_keep_own_counsel", "Keep the cause your own; take foreign help only as it freely comes.",
        "Independence preserves your freedom of action at the cost of the money and arms only the great powers could supply.",
        { foreign_intervention_risk: -8, fiscal_capacity: -6, military_dependence: 4 }),
    ],
    [link("the Dutch", "dossier_protestant_union"), link("James I of England", "dossier_frederick_v")],
  ),
  card(
    "card_fred_bethlen", "1619-1620", "phase_bohemian_revolt",
    "The Transylvanian Offer",
    "Bethlen Gabor, Calvinist prince of Transylvania and vassal of the Sultan, offers to fall on the Habsburg lands from the east. His armies could pin Vienna while yours hold Bohemia - but his Ottoman backing hands your enemies the charge that the Protestant cause makes common purpose with the Turk.",
    "Bethlen's envoy proposes a joint war. A second front, or clean hands.",
    "claim_fred_bethlen",
    [
      opt("opt_fred_ally_bethlen", "Make common cause with Bethlen.",
        "In the event Bethlen's eastern war was the heaviest pressure on Vienna - and the surest proof, to Catholics and wary Lutherans, that the rebellion leaned on the Sultan.",
        { military_dependence: 6, estate_trust: 6, imperial_authority: -8, confessional_legitimacy: -4 },
        { historical_option: true, memory_tags: ["bethlen_alliance"] }),
      opt("opt_fred_refuse_bethlen", "Refuse the Ottoman-backed alliance.",
        "Clean hands keep the cause defensible in the Empire, but throw away the one ally who could divide the emperor's strength.",
        { imperial_authority: 6, confessional_legitimacy: 2, estate_trust: -6, military_dependence: -2 }),
    ],
    [link("Bethlen Gabor", "dossier_bethlen_gabor")],
  ),
  card(
    "card_fred_saxony", "1620", "phase_bohemian_revolt",
    "Lutheran Saxony",
    "John George of Saxony is the greatest Protestant prince in the Empire, and a Lutheran who looks on your Calvinism with suspicion. Win him and the Protestant side is whole; lose him and he may serve the emperor against you. He will want the religious peace upheld and your zeal restrained.",
    "Saxony watches and waits. Court the Lutheran, or press your own cause.",
    "claim_fred_saxony",
    [
      opt("opt_fred_court_saxony", "Court John George - restrain the Calvinist zeal, defend the religious peace.",
        "Conciliation might hold the Protestant side together, but every concession to Lutheran caution disappoints the Reformed who made you king.",
        { estate_trust: 10, imperial_authority: 6, confessional_legitimacy: -8 },
        { memory_tags: ["saxony_courted"] }),
      opt("opt_fred_press_own_cause", "Press your own cause and let Saxony keep its distance.",
        "In the event Frederick never won Saxony; John George, fearing the Calvinist adventure, sided with the emperor and took Lusatia and Silesia in his pay.",
        { confessional_legitimacy: 6, estate_trust: -12, imperial_authority: -6, foreign_intervention_risk: 4 },
        { historical_option: true, memory_tags: ["saxony_lost"] }),
    ],
    [link("John George of Saxony", "dossier_john_george_saxony")],
  ),
  card(
    "card_fred_coronation", "November 1619", "phase_bohemian_revolt",
    "The Coronation in Prague",
    "Crowned in Prague, you must show what kind of king you mean to be. Your Calvinist chaplain Scultetus would cleanse the cathedral of its images and altars; the Bohemians who elected you are mostly Lutheran and Utraquist, and the city is full of Catholics. Zeal will thrill the Reformed and offend nearly everyone else.",
    "The chaplains await your word on the cathedral. Reform it, or leave it be.",
    "claim_fred_coronation",
    [
      opt("opt_fred_calvinist_zeal", "Let Scultetus cleanse the cathedral.",
        "In the event the stripping of Prague's cathedral scandalized Lutherans and Catholics alike; the new king looked less a sovereign than a sectarian.",
        { confessional_legitimacy: 10, estate_trust: -14, imperial_authority: -4, devastation: 2 },
        { historical_option: true, memory_tags: ["calvinist_iconoclasm"] }),
      opt("opt_fred_conciliate_crowd", "Rule for all your subjects - leave the churches as they are.",
        "Restraint keeps the broader city's obedience but disappoints the Reformed zealots who expected a champion.",
        { estate_trust: 8, confessional_legitimacy: -6, imperial_authority: 2 },
        { memory_tags: ["coronation_conciliatory"] }),
    ],
    [link("Bohemian estates", "dossier_bohemian_estates")],
  ),
  card(
    "card_fred_treasury", "1620", "phase_bohemian_revolt",
    "Bohemia's Empty Treasury",
    "The crown you accepted is bankrupt. There is no money to pay the army that must defend it, and the estates who elected you guard their purses as jealously as their privileges. You can squeeze the lands for contributions, borrow against a future you may not have, or trim the war to what little you can afford.",
    "The paymasters report empty coffers and unpaid men. Find the money, or cut the cloth.",
    "claim_fred_treasury",
    [
      opt("opt_fred_squeeze_contributions", "Levy heavy contributions on the Bohemian lands.",
        "In the event the war was paid for by squeezing and plunder; the soldiers were fed at the cost of the country they were meant to hold.",
        { fiscal_capacity: 8, devastation: 10, estate_trust: -8, military_dependence: 2 },
        { historical_option: true, memory_tags: ["heavy_contributions"] }),
      opt("opt_fred_borrow_against_future", "Borrow against the crown's future and dynastic credit.",
        "Credit buys an army now and mortgages whatever you have left, binding the cause tighter to its creditors.",
        { fiscal_capacity: 6, dynastic_security: -8, foreign_intervention_risk: 4 }),
      opt("opt_fred_trim_war", "Trim the war to what the treasury can bear.",
        "Living within your means spares the lands but leaves you too weak to meet the gathering imperial and Spanish armies.",
        { devastation: -4, estate_trust: 2, military_dependence: -6, confessional_legitimacy: -4 }),
    ],
    [link("Contributions", "dossier_contributions"), link("Bohemian estates", "dossier_bohemian_estates")],
  ),
  card(
    "card_fred_estates", "1620", "phase_bohemian_revolt",
    "The Estates' Demands",
    "The estates that elected you mean to keep what they won: a confederation of privileges that leaves the crown weak and the kingship conditional. To act as a king you would have to claw back power they will not yield; to keep their backing you must rule as little more than their first servant.",
    "The estates present their confederate charter. Concede, or assert the crown.",
    "claim_fred_estates",
    [
      opt("opt_fred_concede_estates", "Confirm the confederation and rule with their consent.",
        "In the event Frederick reigned as a weak elective king, dependent on estates who guarded their power even as the emperor's armies closed in.",
        { estate_trust: 12, imperial_authority: -4, military_dependence: 4 },
        { historical_option: true, memory_tags: ["estates_confederation"] }),
      opt("opt_fred_assert_crown", "Assert the crown's authority over the estates.",
        "Reaching for real kingship might give the war a single head, but it sours the very men whose consent put the crown on it.",
        { imperial_authority: 6, estate_trust: -12, confessional_legitimacy: 2 }),
    ],
    [link("Bohemian estates", "dossier_bohemian_estates")],
  ),
];

// --- write (idempotent: replace this batch's ids) ---
const upsert = (path, batch) => {
  const ids = new Set(batch.map((x) => x.id));
  const existing = read(path).filter((x) => !ids.has(x.id));
  write(path, [...existing, ...batch]);
};
upsert("causal_claims/causal_claims.json", claims);
upsert("dossiers/dossiers.json", dossiers);
upsert("cards/cards.json", cards);

console.log(`Frederick phase 1: ${cards.length} cards, ${claims.length} claims, ${dossiers.length} dossiers upserted.`);
