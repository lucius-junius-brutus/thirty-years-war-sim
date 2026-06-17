import type {
  CardRecord,
  CardOptionRecord,
  GameDatabase,
  PlayableRoleRecord,
  PressureConditionRecord,
  PressureMap,
  PressureThresholdRecord,
} from "../domain/types";

export interface GameLogEntry {
  card_id: string;
  option_id: string;
  date_label: string;
  title: string;
  choice: string;
  consequence: string;
  aftermath: string;
  aftermath_bullets: string[];
  impact_notes: string[];
  docket_changes: DocketChange[];
  causal_claim_ids: string[];
  pressure_delta: Partial<PressureMap>;
  memory_tags_added?: string[];
  // Notes for scheduled consequences of earlier choices that fired this turn.
  deferred_notes: string[];
}

export interface ScheduledItem {
  remaining: number;
  effects?: Partial<PressureMap>;
  memory_tags?: string[];
  note: string;
}

export interface DocketChange {
  kind: "added" | "removed";
  title: string;
  date_label: string;
}

export interface GameState {
  roleId: string;
  // Ids of cards already resolved (chosen on). The "current" card is the first
  // eligible card not in this set, so newly-unlocked cards are never skipped by
  // a stale positional index.
  resolved_card_ids: string[];
  pressures: PressureMap;
  memory_tags: string[];
  log: GameLogEntry[];
  // Deferred consequences awaiting their turn to fire.
  scheduled: ScheduledItem[];
  completed: boolean;
}

export interface DesignerCardReport {
  card_id: string;
  title: string;
  date_label: string;
  reasons: string[];
}

export interface DesignerOptionReport {
  option_id: string;
  label: string;
  available: boolean;
  reason?: string;
}

export interface DesignerThresholdReport {
  threshold_id: string;
  label: string;
  kind: PressureThresholdRecord["kind"];
  pressure: keyof PressureMap;
}

export interface DesignerReport {
  current_card_id: string | null;
  visible_card_ids: string[];
  remaining_cards: DesignerCardReport[];
  skipped_cards: DesignerCardReport[];
  current_options: DesignerOptionReport[];
  active_thresholds: DesignerThresholdReport[];
  memory_tags: string[];
  pressures: PressureMap;
}

export interface OutcomeScore {
  title: string;
  legacy: string;
  inheritance: string;
  comparison: string;
  path_signals: string[];
  strengths: string[];
  dangers: string[];
}

export function createInitialGameState(
  database: GameDatabase,
  roleId: string,
): GameState {
  const role = getRole(database, roleId);
  return {
    roleId,
    resolved_card_ids: [],
    pressures: { ...role.initial_pressures },
    memory_tags: [],
    log: [],
    scheduled: [],
    completed: false,
  };
}

export function getRole(
  database: GameDatabase,
  roleId: string,
): PlayableRoleRecord {
  const role = database.playable_roles.find((item) => item.id === roleId);
  if (!role) {
    throw new Error(`Unknown role: ${roleId}`);
  }
  return role;
}

export function getCardsForRole(
  database: GameDatabase,
  roleOrState: string | GameState,
): CardRecord[] {
  const roleId =
    typeof roleOrState === "string" ? roleOrState : roleOrState.roleId;
  const memoryTags =
    typeof roleOrState === "string" ? [] : roleOrState.memory_tags;
  const pressures =
    typeof roleOrState === "string"
      ? getRole(database, roleOrState).initial_pressures
      : roleOrState.pressures;
  const effectiveMemoryTags =
    typeof roleOrState === "string"
      ? memoryTags
      : getEffectiveMemoryTags(database, roleOrState);

  return database.cards
    .filter((card) => card.role_id === roleId)
    .filter((card) => cardMatchesMemory(card, effectiveMemoryTags))
    .filter((card) => matchesPressureConditions(card.requires_pressures, pressures))
    .map((card) => applyMemoryVariant(card, effectiveMemoryTags))
    .map((card) => applyPressureVariant(card, pressures));
}

export function getCurrentCard(
  database: GameDatabase,
  state: GameState,
): CardRecord | null {
  if (state.completed) {
    return null;
  }
  const resolved = new Set(state.resolved_card_ids);
  const eligible = getCardsForRole(database, state).filter(
    (card) => !resolved.has(card.id),
  );
  // A card unlocked by a pressure entering crisis interrupts the normal
  // sequence: it is forced to the front instead of waiting its turn in the deck.
  const crisisTags = crisisCardTags(database.pressure_thresholds);
  return (
    eligible.find((card) => isCrisisCard(card, crisisTags)) ??
    eligible[0] ??
    null
  );
}

function crisisCardTags(thresholds: PressureThresholdRecord[]) {
  return new Set(
    thresholds
      .filter((threshold) => threshold.kind === "crisis")
      .flatMap((threshold) => threshold.memory_tags),
  );
}

function isCrisisCard(card: CardRecord, crisisTags: Set<string>) {
  return (card.requires_memory_tags ?? []).some((tag) => crisisTags.has(tag));
}

export function chooseOption(
  database: GameDatabase,
  state: GameState,
  cardId: string,
  optionId: string,
): GameState {
  const currentCard = getCurrentCard(database, state);
  if (!currentCard || currentCard.id !== cardId) {
    throw new Error(`Card ${cardId} is not the current card`);
  }

  const option = getOptionsForCard(currentCard, state).find(
    (item) => item.id === optionId,
  );
  if (!option) {
    throw new Error(`Unknown option ${optionId} for card ${cardId}`);
  }
  const availability = getOptionAvailability(option, state);
  if (!availability.available) {
    throw new Error(availability.reason ?? `Option ${optionId} is unavailable`);
  }

  // Tick deferred consequences scheduled by earlier choices; the ones now due
  // fire this turn alongside the option's own immediate effects.
  const ticked = state.scheduled.map((item) => ({
    ...item,
    remaining: item.remaining - 1,
  }));
  const due = ticked.filter((item) => item.remaining <= 0);
  const stillPending = ticked.filter((item) => item.remaining > 0);

  const choiceEffects = mergeEffects(
    option.effects,
    ...due.map((item) => item.effects ?? {}),
  );
  const pressuresAfterChoice = applyEffects(state.pressures, choiceEffects);
  // An unaddressed crisis deepens: every pressure still past its crisis line
  // worsens a step further this turn, compounding toward collapse if ignored.
  const escalation = computeCrisisEscalation(
    pressuresAfterChoice,
    database.pressure_thresholds,
  );
  const combinedEffects = mergeEffects(choiceEffects, escalation);
  const pressures = applyEffects(pressuresAfterChoice, escalation);
  const memoryTags = mergeMemoryTags(state.memory_tags, [
    ...(option.memory_tags ?? []),
    ...due.flatMap((item) => item.memory_tags ?? []),
  ]);
  const deferredNotes = due.map((item) => item.note);

  // Schedule this option's own deferred consequences for a later turn.
  const scheduled = [
    ...stillPending,
    ...(option.scheduled_effects ?? []).map((effect) => ({
      remaining: effect.after,
      effects: effect.effects,
      memory_tags: effect.memory_tags,
      note: effect.note,
    })),
  ];

  const previousCards = getCardsForRole(database, state);
  const resolvedCardIds = [...state.resolved_card_ids, currentCard.id];
  const nextState = {
    ...state,
    resolved_card_ids: resolvedCardIds,
    pressures,
    memory_tags: memoryTags,
    scheduled,
  };
  const cards = getCardsForRole(database, nextState);
  const resolved = new Set(resolvedCardIds);
  const remaining = cards.filter((card) => !resolved.has(card.id));
  const impactNotes = describeImmediateEffects(option);
  const docketChanges = getDocketChanges(previousCards, cards, currentCard.id);
  const aftermathBullets = composeAftermathBullets(impactNotes, docketChanges);

  return {
    ...state,
    resolved_card_ids: resolvedCardIds,
    pressures,
    memory_tags: memoryTags,
    scheduled,
    // The run ends when the deck is exhausted, or at once if this choice has
    // driven a pressure past its crisis line into collapse.
    completed:
      remaining.length === 0 ||
      isCollapsed(pressures, database.pressure_thresholds),
    log: [
      ...state.log,
      {
        card_id: currentCard.id,
        option_id: option.id,
        date_label: currentCard.date_label,
        title: currentCard.title,
        choice: option.label,
        consequence: option.consequence,
        aftermath: option.consequence,
        aftermath_bullets: aftermathBullets,
        impact_notes: impactNotes,
        docket_changes: docketChanges,
        causal_claim_ids: option.causal_claim_ids,
        pressure_delta: combinedEffects,
        memory_tags_added: option.memory_tags,
        deferred_notes: deferredNotes,
      },
    ],
  };
}

export function getOptionsForCard(
  card: CardRecord,
  state: GameState,
): CardOptionRecord[] {
  return card.options.filter((option) => {
    const availability = getOptionAvailability(option, state);
    return availability.available || !option.hidden_when_unavailable;
  });
}

export function getOptionAvailability(
  option: CardOptionRecord,
  state: GameState,
) {
  const available =
    matchesPressureConditions(option.requires_pressures, state.pressures) &&
    optionMemoryAllowed(option, state.memory_tags);

  return {
    available,
    reason: available ? undefined : option.unavailable_text,
  };
}

function optionMemoryAllowed(option: CardOptionRecord, memoryTags: string[]) {
  const hasAllRequired = (option.requires_memory_tags ?? []).every((tag) =>
    memoryTags.includes(tag),
  );
  const hasExcluded = (option.excludes_memory_tags ?? []).some((tag) =>
    memoryTags.includes(tag),
  );
  return hasAllRequired && !hasExcluded;
}

export function getDesignerReport(
  database: GameDatabase,
  state: GameState,
): DesignerReport {
  const visibleCards = getCardsForRole(database, state);
  const currentCard = getCurrentCard(database, state);
  const visibleIds = new Set(visibleCards.map((card) => card.id));
  const resolved = new Set(state.resolved_card_ids);
  const roleCards = database.cards.filter((card) => card.role_id === state.roleId);

  return {
    current_card_id: currentCard?.id ?? null,
    visible_card_ids: visibleCards.map((card) => card.id),
    remaining_cards: visibleCards
      .filter((card) => !resolved.has(card.id))
      .map(toDesignerCard),
    skipped_cards: roleCards
      .filter((card) => !visibleIds.has(card.id))
      .map((card) => ({
        ...toDesignerCard(card),
        reasons: getCardAvailabilityReasons(card, state),
      }))
      .filter((card) => card.reasons.length > 0),
    current_options: currentCard
      ? currentCard.options.map((option) => {
          const availability = getOptionAvailability(option, state);
          return {
            option_id: option.id,
            label: option.label,
            available: availability.available,
            reason: availability.reason,
          };
        })
      : [],
    active_thresholds: getActivePressureThresholds(database, state).map(
      (threshold) => ({
        threshold_id: threshold.id,
        label: threshold.label,
        kind: threshold.kind,
        pressure: threshold.pressure,
      }),
    ),
    memory_tags: [...state.memory_tags],
    pressures: { ...state.pressures },
  };
}

export function getActivePressureThresholds(
  database: GameDatabase,
  state: GameState,
): PressureThresholdRecord[] {
  return database.pressure_thresholds.filter((threshold) =>
    matchesPressureConditions([threshold.condition], state.pressures),
  );
}

export function applyEffects(
  pressures: PressureMap,
  effects: Partial<PressureMap>,
): PressureMap {
  const next = { ...pressures };
  Object.entries(effects).forEach(([key, delta]) => {
    const pressureKey = key as keyof PressureMap;
    next[pressureKey] = clamp(next[pressureKey] + delta);
  });
  return next;
}

function mergeEffects(
  ...effectsList: Partial<PressureMap>[]
): Partial<PressureMap> {
  const merged: Partial<PressureMap> = {};
  for (const effects of effectsList) {
    for (const [key, delta] of Object.entries(effects)) {
      const pressureKey = key as keyof PressureMap;
      merged[pressureKey] = (merged[pressureKey] ?? 0) + delta;
    }
  }
  return merged;
}

// How far a pressure worsens for each turn it remains past its crisis line.
const CRISIS_ESCALATION_STEP = 4;

function computeCrisisEscalation(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
): Partial<PressureMap> {
  const delta: Partial<PressureMap> = {};
  for (const threshold of thresholds) {
    if (threshold.kind !== "crisis") continue;
    if (!matchesPressureConditions([threshold.condition], pressures)) continue;
    // Worsen away from safety: down for a "max" (low-is-bad) crisis, up for a
    // "min" (high-is-bad) one.
    const worsen =
      threshold.condition.max !== undefined
        ? -CRISIS_ESCALATION_STEP
        : CRISIS_ESCALATION_STEP;
    delta[threshold.pressure] = (delta[threshold.pressure] ?? 0) + worsen;
  }
  return delta;
}

export interface PressureWarning {
  pressure: keyof PressureMap;
  message: string;
}

// How far past the crisis line a pressure must run before the reign collapses.
// Keeps a single source of truth: the crisis pressure_thresholds mark the warning
// zone; this margin beyond them marks the failure ending.
const COLLAPSE_MARGIN = 10;

// Priority order (most fatal first) when more than one pressure has collapsed.
const FAILURE_PRIORITY: ReadonlyArray<keyof PressureMap> = [
  "dynastic_security",
  "military_dependence",
  "foreign_intervention_risk",
  "devastation",
  "fiscal_capacity",
  "estate_trust",
  "imperial_authority",
];

type FailureEndingProse = Omit<OutcomeScore, "strengths" | "dangers">;

// Authored prose for each collapse, keyed by the pressure that triggers it.
const FAILURE_ENDING_PROSE: Partial<Record<keyof PressureMap, FailureEndingProse>> = {
  dynastic_security: {
    title: "The House Brought Low",
    legacy:
      "Habsburg authority has cracked at its foundation: the hereditary lands waver, rivals scent weakness, and the dynasty's grip on its own crowns is no longer assured.",
    inheritance:
      "Ferdinand III inherits a name worth less than it was — a claim that must be defended before it can be exercised.",
    comparison:
      "This is the counterfactual Ferdinand always feared and never suffered: the dynasty itself, not merely its policy, brought into question.",
    path_signals: ["Dynastic security collapsed"],
  },
  military_dependence: {
    title: "Captive of the Sword",
    legacy:
      "The emperor has won his wars and lost his freedom: the army that saved him now sets the terms, and imperial policy moves at the pace of the men who command the troops.",
    inheritance:
      "Ferdinand III inherits a crown that must ask its generals' leave — the Wallenstein problem made permanent.",
    comparison:
      "This carries to its end the danger Wilson draws from the contractor armies: the instrument of survival become the master of the state.",
    path_signals: ["The army's commanders outweigh the emperor"],
  },
  foreign_intervention_risk: {
    title: "Europe Decides the Empire's Fate",
    legacy:
      "The imperial quarrel has become a European war. Foreign crowns now treat the Empire as a board for their own ambitions, and no settlement Vienna writes will hold without their leave.",
    inheritance:
      "Ferdinand III inherits a war that is no longer his to end — its terms will be dictated in Paris and Stockholm as much as in Vienna.",
    comparison:
      "This is the war's historical widening carried to its limit: a domestic constitutional dispute drowned in a contest among the great powers.",
    path_signals: ["Foreign intervention beyond the emperor's control"],
  },
  devastation: {
    title: "A Realm Laid Waste",
    legacy:
      "Victory has come to rule over ruin. Fields lie unsown, towns stand empty, and the contributions that fed the war have eaten the country that owed obedience.",
    inheritance:
      "Ferdinand III inherits authority over a depopulated, exhausted land that will take generations to recover.",
    comparison:
      "This is the war's true face that the histories remember: a settlement bought at the price of the Empire's own substance.",
    path_signals: ["The lands consumed by the war"],
  },
  fiscal_capacity: {
    title: "A Bankrupt Crown",
    legacy:
      "The treasury is spent past recovery. Unpaid armies mutter, creditors close in, and the crown's orders travel without the coin to make them obeyed.",
    inheritance:
      "Ferdinand III inherits debts that outrun the revenues, and an army that serves only as long as it is fed.",
    comparison:
      "This follows the fiscal logic Wilson stresses: that arrears and insolvency, not battles, dictated what an emperor could actually do.",
    path_signals: ["The crown spent into insolvency"],
  },
  estate_trust: {
    title: "An Empire Ungovernable",
    legacy:
      "The estates no longer believe the emperor's word protects them, and an authority that must be enforced everywhere can be exercised nowhere.",
    inheritance:
      "Ferdinand III inherits a constitution emptied of trust, where every command must be backed by an army to be obeyed.",
    comparison:
      "This is the constitutional failure beneath the confessional one: obedience withdrawn not by heresy but by fear of the crown itself.",
    path_signals: ["Estate trust collapsed into open resistance"],
  },
  imperial_authority: {
    title: "Imperial Command Dissolved",
    legacy:
      "The emperor's word no longer carries the force of law. Princes, estates, and cities act as if Vienna's commands were suggestions, and the imperial dignity has become a title without a writ.",
    inheritance:
      "Ferdinand III inherits the form of empire without its substance — an authority that must be rebuilt before it can be exercised.",
    comparison:
      "This is the constitutional nightmare the Habsburgs always feared: imperial authority so doubted that the Empire governs itself in spite of its head.",
    path_signals: ["Imperial command no longer obeyed"],
  },
};

function crisisThreshold(
  thresholds: PressureThresholdRecord[],
  pressure: keyof PressureMap,
) {
  return thresholds.find(
    (threshold) => threshold.kind === "crisis" && threshold.pressure === pressure,
  );
}

// Has the pressure run COLLAPSE_MARGIN past its crisis line?
function pastCollapse(pressures: PressureMap, threshold: PressureThresholdRecord) {
  const value = pressures[threshold.pressure];
  if (threshold.condition.max !== undefined) {
    return value <= threshold.condition.max - COLLAPSE_MARGIN;
  }
  if (threshold.condition.min !== undefined) {
    return value >= threshold.condition.min + COLLAPSE_MARGIN;
  }
  return false;
}

// The crisis thresholds are the warning zone: a pressure that has crossed its
// crisis line is foreshadowing the matching failure ending.
export function getPressureWarnings(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
): PressureWarning[] {
  return thresholds
    .filter(
      (threshold) =>
        threshold.kind === "crisis" &&
        matchesPressureConditions([threshold.condition], pressures),
    )
    .map((threshold) => ({ pressure: threshold.pressure, message: threshold.label }));
}

// Failure / divergence endings, reached when a pressure runs past its crisis
// line into collapse. The trigger is data-driven from the crisis thresholds;
// only the prose is authored here. Checked by severity; the first match wins.
function scoreFailureEnding(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
): FailureEndingProse | null {
  for (const pressure of FAILURE_PRIORITY) {
    const prose = FAILURE_ENDING_PROSE[pressure];
    const threshold = crisisThreshold(thresholds, pressure);
    if (prose && threshold && pastCollapse(pressures, threshold)) {
      return prose;
    }
  }
  return null;
}

export function isCollapsed(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
) {
  return scoreFailureEnding(pressures, thresholds) !== null;
}

export function scoreOutcome(
  database: GameDatabase,
  state: GameState,
): OutcomeScore {
  const variableById = new Map(
    database.game_variables.map((variable) => [variable.id, variable]),
  );
  const strengths = Object.entries(state.pressures).filter(([key, value]) => {
    const variable = variableById.get(key as keyof PressureMap);
    return variable?.high_is_dangerous ? value < 45 : value >= 60;
  });
  const dangers = Object.entries(state.pressures).filter(([key, value]) => {
    const variable = variableById.get(key as keyof PressureMap);
    return variable?.high_is_dangerous ? value >= 65 : value < 35;
  });

  // A pressure run to its extreme overrides the nuanced ending with a failure
  // verdict: the reign reaches its close in a state of collapse.
  const failure = scoreFailureEnding(state.pressures, database.pressure_thresholds);
  if (failure) {
    return {
      ...failure,
      strengths: strengths.map(([key]) => key),
      dangers: dangers.map(([key]) => key),
    };
  }

  const tags = new Set(state.memory_tags);
  const hasAny = (...items: string[]) => items.some((item) => tags.has(item));
  const hasAll = (...items: string[]) => items.every((item) => tags.has(item));

  let title = "Dynasty Secured, Peace Deferred";
  let legacy =
    "Ferdinand dies with the succession guarded and the imperial cause still standing, but the means of survival have left unsettled claims in every quarter of the Empire.";
  let inheritance =
    "Ferdinand III receives a crown strengthened by victory and burdened by war finance, armed allies, confessional grievance, and estates that have learned to bargain under arms.";
  let comparison =
    "The broad line still resembles the historical reign: recovery after Bohemia, enlarged imperial ambition, dependence on armed contractors, Swedish and French pressure, and no final peace before Ferdinand II's death.";
  const pathSignals: string[] = [];

  if (
    hasAny("wallenstein_removed_by_force", "wallenstein_trial") &&
    hasAny("wallenstein_recalled_broad", "wallenstein_recalled_limited")
  ) {
    title = "Army Recovered, Trust Spent";
    legacy =
      "The crown regains command from Wallenstein only after proving that its greatest servant can also become its most dangerous power center.";
    inheritance =
      "Ferdinand III inherits an imperial army that can still fight, but officers and princes now watch Vienna's promises with sharpened suspicion.";
    comparison =
      "This follows the historical warning Wilson draws from Wallenstein: military capacity solved immediate weakness while creating an authority beside the emperor.";
    pathSignals.push("Wallenstein first empowered, then broken");
  } else if (
    hasAny("bohemian_punishment_hardline", "blood_court_executions") &&
    hasAny("restitution_edict_issued", "prague_exclusions_hardline")
  ) {
    title = "Hard Victory, Unquiet Empire";
    legacy =
      "Punishment in Bohemia, the Edict of Restitution, and narrow peace terms give Ferdinand a visible Catholic victory while keeping Protestant and princely fear alive.";
    inheritance =
      "Ferdinand III receives stronger Habsburg rights, but also a wider coalition of enemies and allies who have learned to fear imperial overreach.";
    comparison =
      "This is closest to the hard edge of the historical course: victories were real, but they enlarged the war's political field rather than closing it.";
    pathSignals.push("Bohemian punishment made exemplary");
    pathSignals.push("Restitution pressed as imperial command");
  } else if (
    hasAll("prague_amnesty_broad", "palatine_proxy_settlement") ||
    hasAll("restitution_peace_bargain", "palatine_proxy_settlement")
  ) {
    title = "A Settlement Bought by Restraint";
    legacy =
      "Ferdinand has traded some punishment and restoration for concession, preserving more room for settlement while disappointing those who expected complete Catholic recovery.";
    inheritance =
      "Ferdinand III inherits fewer enemies committed beyond recall, but also a court and Catholic party less certain that victory has been fully used.";
    comparison =
      "This course departs from the harsher historical pattern by accepting that imperial authority may survive through bargains rather than exemplary punishment alone.";
    pathSignals.push("Broad amnesty or proxy settlement used to keep doors open");
    pathSignals.push("Restitution treated as negotiable peace business");
  } else if (dangers.length >= 4) {
    title = "Victory Turns Against Itself";
    legacy =
      "The crown survives, but too many supports have become liabilities: fiscal strain, distrust, military dependence, devastation, or foreign alarm now answer every gain.";
    inheritance =
      "Ferdinand III receives authority in name, but the practical tools of rule have grown brittle.";
    comparison =
      "This keeps the historical tragedy visible: useful victories could harden the conditions that made peace harder.";
  } else if (strengths.length >= 5 && dangers.length <= 1) {
    title = "A Narrowly Governable Peace";
    legacy =
      "Ferdinand leaves a realm still divided, yet more of its princes and estates can imagine obedience without immediate ruin.";
    inheritance =
      "Ferdinand III receives a stronger hand than history usually allowed, though not a quiet Empire.";
    comparison =
      "This is a better-than-historical consolidation, bounded by the same constitutional, fiscal, and confessional pressures Wilson emphasizes.";
  } else if (state.pressures.foreign_intervention_risk >= 75) {
    title = "The Empire Draws Europe In";
    legacy =
      "Imperial success has become a summons to outsiders. What began as authority within the Empire now looks like a European balance problem.";
    inheritance =
      "Ferdinand III receives a crown whose German victories have invited Swedish, French, Dutch, or Spanish calculations into every settlement.";
    comparison =
      "This follows the war's historical widening, where domestic settlement and foreign security could no longer be separated.";
  }

  if (hasAny("ferdinand_iii_elected", "succession_broad_capitulation")) {
    pathSignals.push("Succession secured before Ferdinand II's death");
  }
  if (hasAny("electoral_transfer_transferred", "electoral_transfer_delayed")) {
    pathSignals.push("The Palatine electorate remains a constitutional wound");
  }
  if (hasAny("restitution_edict_issued", "restitution_diet_interpretation")) {
    pathSignals.push("Ecclesiastical restitution shapes the late reign");
  }

  return {
    title,
    legacy,
    inheritance,
    comparison,
    path_signals: pathSignals,
    strengths: strengths.map(([key]) => key),
    dangers: dangers.map(([key]) => key),
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function describeImmediateEffects(option: CardOptionRecord) {
  const tagNotes = describeMemoryTags(option.memory_tags, option.id);
  const pressureNotes = Object.entries(option.effects)
    .filter(([, delta]) => Math.abs(delta) >= 2)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .map(([key, delta]) =>
      describePressureMovement(key as keyof PressureMap, delta, option.id),
    );

  return [...new Set([...tagNotes, ...pressureNotes])].slice(0, 4);
}

function composeAftermathBullets(
  impactNotes: string[],
  _docketChanges: DocketChange[],
) {
  // Docket changes are surfaced separately as "fork" lines in the UI, so the
  // aftermath bullets stay focused on the immediate consequences of the choice.
  return impactNotes.slice(0, 4);
}

export interface CounterfactualLedgerEntry {
  date_label: string;
  title: string;
  chosen_label: string;
  historical_label: string | null;
  diverged: boolean;
}

export function buildCounterfactualLedger(
  database: GameDatabase,
  state: GameState,
): CounterfactualLedgerEntry[] {
  return state.log.map((entry) => {
    const card = database.cards.find((item) => item.id === entry.card_id);
    const options = card?.options ?? [];
    const chosen = options.find((option) => option.id === entry.option_id);
    const historical = options.find((option) => option.historical_option === true);
    const chosenIsHistorical = chosen?.historical_option === true;

    return {
      date_label: entry.date_label,
      title: entry.title,
      chosen_label: entry.choice,
      historical_label: historical ? historical.label : null,
      diverged: Boolean(historical) && !chosenIsHistorical,
    };
  });
}

function describeMemoryTags(tags: string[] = [], seed: string) {
  const notesByTag: Record<string, string[]> = {
    klesl_retained: [
      "A channel to moderate estates remains open, though Catholic councillors suspect delay.",
      "Klesl's correspondents keep a door ajar for obedience without immediate humiliation.",
      "Men still willing to mediate can approach Vienna, but zealous councillors mark the delay.",
    ],
    klesl_removed: [
      "The court speaks with a harder voice, and Prague expects less mercy from Vienna.",
      "Prague hears that the emperor's councillors now prefer resolution to accommodation.",
      "The removal stiffens Vienna's hand and narrows the space for moderate language.",
    ],
    bavarian_dependence_high: [
      "Bavaria becomes the necessary broker of armed Catholic assistance.",
      "Maximilian's aid now carries the weight of a creditor's claim as well as an ally's counsel.",
      "The League's soldiers answer the need of the hour, but Bavaria stands nearer the center of decision.",
    ],
    bavarian_dependence_medium: [
      "Bavarian help remains close enough to demand reward and consultation.",
      "Munich can still ask what price its loyalty has earned.",
      "The court keeps Bavaria in harness, though not without future claims from Munich.",
    ],
    bavarian_dependence_low: [
      "The court keeps more direction in its own hands, but with fewer certain swords.",
      "Vienna preserves room to decide, at the cost of less assured Catholic force.",
      "Independence from Munich leaves the crown freer and more exposed.",
    ],
    electoral_transfer_transferred: [
      "Maximilian's reward becomes a constitutional fact other electors must now measure.",
      "The electoral college receives not only a punishment of Frederick, but a warning about imperial emergency power.",
      "Bavaria's elevation satisfies Catholic victory while unsettling the balance among electors.",
    ],
    wallenstein_empowered: [
      "Military command begins to gather around a servant whose credit may outrun ordinary obedience.",
      "Wallenstein's contracts promise armies faster than the estates can furnish them, and at a price not only reckoned in coin.",
      "The court obtains soldiers by allowing a new military interest to gather authority around itself.",
    ],
    restitution_edict_issued: [
      "Ecclesiastical restitution is no longer a petition at court but an imperial command.",
      "Catholic claimants can now point to an edict, while Protestant estates read the same paper as menace.",
      "The question of church lands leaves the docket of complaint and enters the language of enforcement.",
    ],
    prague_amnesty_broad: [
      "Men who might otherwise remain enemies are given reason to seek terms under imperial authority.",
      "The offer of grace gives frightened estates a road back to obedience.",
      "Those not already ruined by rebellion can imagine settlement without complete destruction.",
    ],
    blood_court_executions: [
      "The punishments in Prague teach obedience by terror as much as by law.",
      "The scaffold makes an example for the kingdom, and also a memory that will not easily be quieted.",
      "Royal justice is made visible in blood, binding obedience to fear.",
    ],
  };

  return tags
    .map((tag) => selectVariant(notesByTag[tag] ?? [], `${seed}:${tag}`))
    .filter(Boolean);
}

function describePressureMovement(
  pressure: keyof PressureMap,
  delta: number,
  seed: string,
) {
  const rising = delta > 0;
  const notes: Record<keyof PressureMap, { rising: string[]; falling: string[] }> = {
    imperial_authority: {
      rising: [
        "Imperial command is easier to present as lawful remedy.",
        "The chancery can write more confidently in the language of mandate and obedience.",
        "The crown's answer carries more of the weight of public authority.",
      ],
      falling: [
        "More estates can say the crown governs by bargain rather than command.",
        "The emperor's title remains high, but this settlement teaches others to ask for terms.",
        "Authority is preserved in form while its exercise becomes more dependent on consent.",
      ],
    },
    confessional_legitimacy: {
      rising: [
        "Catholic reformers hear firmer warrant for recovery of churches, schools, and revenues.",
        "The Catholic party receives language it can carry to bishops, chapters, and Jesuit advisers.",
        "Restoration-minded allies find more in the decree to praise than to excuse.",
      ],
      falling: [
        "Catholic reformers hear caution where they expected recovery.",
        "Zealous allies complain that peace is being purchased with church property still withheld.",
        "Those pressing restoration find the court's hand slower than their petitions require.",
      ],
    },
    estate_trust: {
      rising: [
        "Moderate estates gain room to remain obedient without surrendering every privilege.",
        "Doubtful estates can describe obedience as prudence rather than submission.",
        "Petitioners who fear innovation receive enough language of law to stay at the table.",
      ],
      falling: [
        "Estate petitions speak more readily of fear, privilege, and precedent.",
        "The language of obedience gives way to complaints over liberties and jurisdiction.",
        "Moderates find it harder to answer neighbors who call the court's course a threat.",
      ],
    },
    fiscal_capacity: {
      rising: [
        "Creditors and contributors see firmer means behind the court's orders.",
        "The treasury can answer more petitions with payment rather than promises alone.",
        "Contribution and credit look less like desperate expedients and more like policy.",
      ],
      falling: [
        "The treasury must buy time with arrears, pledges, or new concessions.",
        "Every order now travels with the question of who will pay for obedience.",
        "Creditors hear more promises than coin, and soldiers learn to wait upon contribution.",
      ],
    },
    military_dependence: {
      rising: [
        "Armed allies and military contractors gain a larger claim on the court.",
        "The cause is strengthened by soldiers whose commanders will expect recompense.",
        "Military necessity places new counsellors beside the legal ones.",
      ],
      falling: [
        "The court carries more of its cause without surrendering direction to armed partners.",
        "Vienna keeps a freer hand by asking less from men who command armies.",
        "The crown avoids one creditor of war, though it must find strength elsewhere.",
      ],
    },
    foreign_intervention_risk: {
      rising: [
        "Foreign courts receive a clearer pretext to watch, bargain, or intervene.",
        "Envoys beyond the Empire can now describe the quarrel as a matter touching the balance of Europe.",
        "The more decisive the court appears, the easier it is for outsiders to claim an interest.",
      ],
      falling: [
        "Outsiders find fewer openings to present intervention as protection.",
        "Foreign envoys receive less material for complaints dressed as guarantees.",
        "The quarrel remains easier to describe as imperial business, not a summons to Europe.",
      ],
    },
    dynastic_security: {
      rising: [
        "Habsburg succession and hereditary right look less exposed.",
        "The dynasty's friends can speak with more confidence of continuity and right.",
        "The hereditary lands appear less likely to choose their moment against the house.",
      ],
      falling: [
        "The dynasty's claim appears more dependent on consent and military fortune.",
        "Rivals can whisper that Habsburg right stands only where force or bargain upholds it.",
        "The house keeps its titles, but less of the certainty that should attend them.",
      ],
    },
    devastation: {
      rising: [
        "Billeting, contributions, and reprisals fall more heavily on the lands.",
        "Subjects far from Vienna feel the decision in quarters, levies, and requisitions.",
        "The war's necessities move from paper into barns, roads, and town accounts.",
      ],
      falling: [
        "More districts escape the immediate weight of soldiers and contribution.",
        "The countryside is spared one turn of quartering and forced provision.",
        "Town councils and village officers receive fewer demands in the soldiers' name.",
      ],
    },
  };

  return selectVariant(
    rising ? notes[pressure].rising : notes[pressure].falling,
    `${seed}:${pressure}:${delta}`,
  );
}

function selectVariant(variants: string[], seed: string) {
  if (variants.length === 0) {
    return "";
  }
  return variants[hashString(seed) % variants.length];
}

function hashString(value: string) {
  return [...value].reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 17);
}

function getDocketChanges(
  previousCards: CardRecord[],
  nextCards: CardRecord[],
  currentCardId: string,
): DocketChange[] {
  const previousIds = new Set(previousCards.map((card) => card.id));
  const nextIds = new Set(nextCards.map((card) => card.id));
  const added = nextCards
    .filter((card) => !previousIds.has(card.id))
    .map((card) => ({
      kind: "added" as const,
      title: card.title,
      date_label: card.date_label,
    }));
  const removed = previousCards
    .filter((card) => card.id !== currentCardId)
    .filter((card) => !nextIds.has(card.id))
    .map((card) => ({
      kind: "removed" as const,
      title: card.title,
      date_label: card.date_label,
    }));

  return [...added, ...removed].slice(0, 6);
}

function cardMatchesMemory(card: CardRecord, memoryTags: string[]) {
  const hasAllRequired = (card.requires_memory_tags ?? []).every((tag) =>
    memoryTags.includes(tag),
  );
  const hasExcluded = (card.excludes_memory_tags ?? []).some((tag) =>
    memoryTags.includes(tag),
  );

  return hasAllRequired && !hasExcluded;
}

function getEffectiveMemoryTags(database: GameDatabase, state: GameState) {
  return mergeMemoryTags(
    state.memory_tags,
    getActivePressureThresholds(database, state).flatMap(
      (threshold) => threshold.memory_tags,
    ),
  );
}

function getCardAvailabilityReasons(card: CardRecord, state: GameState) {
  return [
    ...getMemoryReasons(card, state.memory_tags),
    ...getPressureReasons(card.requires_pressures, state.pressures),
  ];
}

function getMemoryReasons(card: CardRecord, memoryTags: string[]) {
  const reasons: string[] = [];
  (card.requires_memory_tags ?? []).forEach((tag) => {
    if (!memoryTags.includes(tag)) {
      reasons.push(`requires memory tag "${tag}"`);
    }
  });
  (card.excludes_memory_tags ?? []).forEach((tag) => {
    if (memoryTags.includes(tag)) {
      reasons.push(`excludes memory tag "${tag}"`);
    }
  });
  return reasons;
}

function getPressureReasons(
  conditions: PressureConditionRecord[] = [],
  pressures: PressureMap,
) {
  return conditions.flatMap((condition) => {
    const value = pressures[condition.pressure];
    const reasons: string[] = [];
    if (condition.min !== undefined && value < condition.min) {
      reasons.push(
        `${condition.pressure} must be at least ${condition.min}; current value is ${value}`,
      );
    }
    if (condition.max !== undefined && value > condition.max) {
      reasons.push(
        `${condition.pressure} must be at most ${condition.max}; current value is ${value}`,
      );
    }
    return reasons;
  });
}

function toDesignerCard(card: CardRecord): DesignerCardReport {
  return {
    card_id: card.id,
    title: card.title,
    date_label: card.date_label,
    reasons: [],
  };
}

function matchesPressureConditions(
  conditions: PressureConditionRecord[] = [],
  pressures: PressureMap,
) {
  return conditions.every((condition) => {
    const value = pressures[condition.pressure];
    if (condition.min !== undefined && value < condition.min) {
      return false;
    }
    if (condition.max !== undefined && value > condition.max) {
      return false;
    }
    return true;
  });
}

function applyMemoryVariant(
  card: CardRecord,
  memoryTags: string[],
): CardRecord {
  const variant = card.memory_variants?.find((item) =>
    item.required_memory_tags.every((tag) => memoryTags.includes(tag)),
  );

  if (!variant) {
    return card;
  }

  return {
    ...card,
    title: variant.title ?? card.title,
    date_label: variant.date_label ?? card.date_label,
    briefing: variant.briefing ?? card.briefing,
    situation: variant.situation ?? card.situation,
  };
}

function applyPressureVariant(
  card: CardRecord,
  pressures: PressureMap,
): CardRecord {
  const variant = card.pressure_variants?.find((item) =>
    matchesPressureConditions(item.conditions, pressures),
  );

  if (!variant) {
    return card;
  }

  return {
    ...card,
    title: variant.title ?? card.title,
    date_label: variant.date_label ?? card.date_label,
    briefing: variant.briefing ?? card.briefing,
    situation: variant.situation ?? card.situation,
  };
}

function mergeMemoryTags(existing: string[], additions: string[] = []) {
  return [...new Set([...existing, ...additions])];
}
