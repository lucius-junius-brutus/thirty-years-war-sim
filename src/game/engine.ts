import type {
  CardRecord,
  CardOptionRecord,
  CollapseEndingRecord,
  GameDatabase,
  OutcomeConditionRecord,
  OutcomeEndingRecord,
  PlayableRoleRecord,
  PressureConditionRecord,
  PressureKey,
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
  // True when the reign collapsed (a failure ending) rather than running its course.
  failure: boolean;
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

// The axis framings (labels, valence) for a role. Axis ids are shared vocabulary;
// each role frames the axes it uses in its own terms.
export function getRoleAxes(database: GameDatabase, roleId: string) {
  return database.game_variables.filter((axis) => axis.role_id === roleId);
}

// The crisis/reward/warning thresholds (and collapse tiers) for a role.
export function getRoleThresholds(database: GameDatabase, roleId: string) {
  return database.pressure_thresholds.filter(
    (threshold) => threshold.role_id === roleId,
  );
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
  const crisisTags = crisisCardTags(getRoleThresholds(database, state.roleId));
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
    getRoleThresholds(database, state.roleId),
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
  const docketChanges = getDocketChanges(previousCards, cards, currentCard.id);

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
      isCollapsed(pressures, getRoleThresholds(database, state.roleId)),
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
  const forced = getForcedOption(card, state);
  if (forced) {
    return [forced];
  }
  return card.options.filter((option) => {
    const availability = getOptionAvailability(option, state);
    return availability.available || !option.hidden_when_unavailable;
  });
}

// Loss of agency: when a card defines a forced course and its pressure condition
// holds, overreliance has taken the decision away — only that course remains.
export function getForcedOption(
  card: CardRecord,
  state: GameState,
): CardOptionRecord | null {
  const forced = card.forced_course;
  if (!forced) {
    return null;
  }
  if (!matchesPressureConditions(forced.requires_pressures, state.pressures)) {
    return null;
  }
  return card.options.find((option) => option.id === forced.option_id) ?? null;
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
  return getRoleThresholds(database, state.roleId).filter((threshold) =>
    matchesPressureConditions([threshold.condition], state.pressures),
  );
}

// Within this many points of the bound a pressure is heading toward, effects
// taper linearly to zero. Beyond it, effects are full strength. This gives
// near-linear mid-range play while making one-directional pressure asymptote
// toward its danger line rather than pegging past it: a coherent hard or soft
// course becomes "unquiet" (in the warning band) without automatically running
// off the cliff. Crossing into collapse then takes real, sustained pressure.
const SOFT_CAP_BAND = 28;

// No single step may close more than this fraction of the distance remaining to
// the bound, so the extreme stays an asymptote even under a large one-off shock.
const MAX_SINGLE_STEP_FRACTION = 0.85;

// Diminishing-returns effective delta for a raw delta applied at a given value:
// full strength until within SOFT_CAP_BAND of the bound it moves toward, then a
// linear taper, hard-capped so it can never overshoot the extreme.
function softCapDelta(value: number, delta: number): number {
  const headroom = delta > 0 ? 100 - value : value;
  const scale = Math.min(1, headroom / SOFT_CAP_BAND);
  const tapered = delta * scale;
  const maxStep = headroom * MAX_SINGLE_STEP_FRACTION;
  if (Math.abs(tapered) > maxStep) {
    return Math.sign(delta) * maxStep;
  }
  return tapered;
}

export function applyEffects(
  pressures: PressureMap,
  effects: Partial<PressureMap>,
): PressureMap {
  const next = { ...pressures };
  Object.entries(effects).forEach(([key, delta]) => {
    const pressureKey = key as keyof PressureMap;
    const value = next[pressureKey];
    next[pressureKey] = clamp(value + softCapDelta(value, delta));
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

// How far past its crisis line passive escalation drives a pressure before it
// settles. This is well short of the collapse margin: an unaddressed crisis is
// pushed and held in the danger band, keeping the threat live, but passive drift
// alone never reaches the cliff. Crossing into collapse takes a real choice.
const ESCALATION_OVERSHOOT = 4;

function computeCrisisEscalation(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
): Partial<PressureMap> {
  const delta: Partial<PressureMap> = {};
  for (const threshold of thresholds) {
    if (threshold.kind !== "crisis") continue;
    if (!matchesPressureConditions([threshold.condition], pressures)) continue;
    const value = pressures[threshold.pressure];
    if (threshold.condition.max !== undefined) {
      // Low-is-bad: worsen downward, settling ESCALATION_OVERSHOOT below the
      // crisis line — in the danger band, not at the cliff.
      const settle = threshold.condition.max - ESCALATION_OVERSHOOT;
      const worsen = Math.min(0, Math.max(-CRISIS_ESCALATION_STEP, settle - value));
      delta[threshold.pressure] = (delta[threshold.pressure] ?? 0) + worsen;
    } else if (threshold.condition.min !== undefined) {
      // High-is-bad: worsen upward, settling ESCALATION_OVERSHOOT above the line.
      const settle = threshold.condition.min + ESCALATION_OVERSHOOT;
      const worsen = Math.max(0, Math.min(CRISIS_ESCALATION_STEP, settle - value));
      delta[threshold.pressure] = (delta[threshold.pressure] ?? 0) + worsen;
    }
  }
  return delta;
}

export interface PressureWarning {
  pressure: keyof PressureMap;
  message: string;
}

// How far past the crisis line a pressure must run before it counts as
// collapsed. The crisis thresholds mark the warning zone; the margin beyond them
// marks the cliff. A terminal pressure (position-ending) collapses sooner; a
// severe pressure (ruinous but survivable) must run further, since a coherent
// hard or soft course is expected to live in its warning band without falling.
const TERMINAL_COLLAPSE_MARGIN = 10;
const SEVERE_COLLAPSE_MARGIN = 14;

function collapseMargin(threshold: PressureThresholdRecord) {
  return threshold.collapse_tier === "severe"
    ? SEVERE_COLLAPSE_MARGIN
    : TERMINAL_COLLAPSE_MARGIN;
}

function crisisThreshold(
  thresholds: PressureThresholdRecord[],
  pressure: keyof PressureMap,
) {
  return thresholds.find(
    (threshold) => threshold.kind === "crisis" && threshold.pressure === pressure,
  );
}

// Has the pressure run its tier's margin past its crisis line?
function pastCollapse(pressures: PressureMap, threshold: PressureThresholdRecord) {
  const value = pressures[threshold.pressure];
  const margin = collapseMargin(threshold);
  if (threshold.condition.max !== undefined) {
    return value <= threshold.condition.max - margin;
  }
  if (threshold.condition.min !== undefined) {
    return value >= threshold.condition.min + margin;
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

// Whether the reign comes apart, derived purely from the crisis thresholds and
// their collapse_tier:
//   - a "terminal" pressure past its collapse line ends the reign on its own
//     (lost crowns, an insolvent crown, captivity to the sword);
//   - a "severe" pressure past collapse is ruinous but survivable on its own
//     (a wrecked land, a revolt, a wider war, eroded command), and only ends
//     the reign when two or more collapse at once.
export function isCollapsed(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
) {
  const collapsed = thresholds.filter(
    (threshold) =>
      threshold.kind === "crisis" && pastCollapse(pressures, threshold),
  );
  const hasTerminal = collapsed.some(
    (threshold) => (threshold.collapse_tier ?? "terminal") === "terminal",
  );
  const severeCount = collapsed.filter(
    (threshold) => threshold.collapse_tier === "severe",
  ).length;
  return hasTerminal || severeCount >= 2;
}

// The collapse ending to show: the most fatal collapsed axis (by the role's
// failure_priority) that has authored prose. Null when the reign has not collapsed.
function scoreFailureEnding(
  pressures: PressureMap,
  thresholds: PressureThresholdRecord[],
  failurePriority: PressureKey[],
  collapseEndings: Partial<Record<PressureKey, CollapseEndingRecord>>,
): CollapseEndingRecord | null {
  if (!isCollapsed(pressures, thresholds)) {
    return null;
  }
  for (const pressure of failurePriority) {
    const threshold = crisisThreshold(thresholds, pressure);
    const prose = collapseEndings[pressure];
    if (threshold && pastCollapse(pressures, threshold) && prose) {
      return prose;
    }
  }
  return null;
}

interface OutcomeContext {
  tags: Set<string>;
  pressures: PressureMap;
  strengthCount: number;
  dangerCount: number;
}

function outcomeConditionMatches(
  condition: OutcomeConditionRecord,
  ctx: OutcomeContext,
): boolean {
  if (condition.all_of_tags && !condition.all_of_tags.every((tag) => ctx.tags.has(tag))) {
    return false;
  }
  if (
    condition.any_of_tags &&
    !condition.any_of_tags.every((group) => group.some((tag) => ctx.tags.has(tag)))
  ) {
    return false;
  }
  if (condition.min_dangers !== undefined && ctx.dangerCount < condition.min_dangers) {
    return false;
  }
  if (condition.max_dangers !== undefined && ctx.dangerCount > condition.max_dangers) {
    return false;
  }
  if (
    condition.min_strengths !== undefined &&
    ctx.strengthCount < condition.min_strengths
  ) {
    return false;
  }
  if (
    condition.max_strengths !== undefined &&
    ctx.strengthCount > condition.max_strengths
  ) {
    return false;
  }
  if (condition.pressures && !matchesPressureConditions(condition.pressures, ctx.pressures)) {
    return false;
  }
  return true;
}

// The first ending whose `match` holds wins; an ending with no `match` is the
// always-true default.
function outcomeEndingMatches(ending: OutcomeEndingRecord, ctx: OutcomeContext): boolean {
  if (!ending.match || ending.match.length === 0) {
    return true;
  }
  return ending.match.some((condition) => outcomeConditionMatches(condition, ctx));
}

export function scoreOutcome(
  database: GameDatabase,
  state: GameState,
): OutcomeScore {
  const variableById = new Map(
    getRoleAxes(database, state.roleId).map((variable) => [variable.id, variable]),
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
  const role = getRole(database, state.roleId);
  const failure = scoreFailureEnding(
    state.pressures,
    getRoleThresholds(database, state.roleId),
    role.failure_priority,
    role.collapse_endings,
  );
  if (failure) {
    return {
      ...failure,
      failure: true,
      strengths: strengths.map(([key]) => key),
      dangers: dangers.map(([key]) => key),
    };
  }

  // The nuanced (non-failure) ending is chosen from the role's authored rules:
  // the first whose condition matches, falling back to its always-true default.
  const outcomeContext = {
    tags: new Set(state.memory_tags),
    pressures: state.pressures,
    strengthCount: strengths.length,
    dangerCount: dangers.length,
  };
  const ending =
    role.outcome_endings.find((candidate) =>
      outcomeEndingMatches(candidate, outcomeContext),
    ) ?? role.outcome_endings[role.outcome_endings.length - 1];

  const pathSignals = [
    ...(ending.path_signals ?? []),
    ...role.outcome_path_signals
      .filter((entry) =>
        entry.any_of_tags.some((tag) => outcomeContext.tags.has(tag)),
      )
      .map((entry) => entry.signal),
  ];

  return {
    title: ending.title,
    legacy: ending.legacy,
    inheritance: ending.inheritance,
    comparison: ending.comparison,
    path_signals: pathSignals,
    strengths: strengths.map(([key]) => key),
    dangers: dangers.map(([key]) => key),
    failure: false,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
