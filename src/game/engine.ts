import type {
  CardRecord,
  CardOptionRecord,
  GameDatabase,
  PlayableRoleRecord,
  PressureConditionRecord,
  PressureMap,
} from "../domain/types";

export interface GameLogEntry {
  card_id: string;
  option_id: string;
  date_label: string;
  title: string;
  choice: string;
  consequence: string;
  impact_notes: string[];
  docket_changes: DocketChange[];
  causal_claim_ids: string[];
  pressure_delta: Partial<PressureMap>;
  memory_tags_added?: string[];
}

export interface DocketChange {
  kind: "added" | "removed";
  title: string;
  date_label: string;
}

export interface GameState {
  roleId: string;
  cardIndex: number;
  pressures: PressureMap;
  memory_tags: string[];
  log: GameLogEntry[];
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

export interface DesignerReport {
  current_card_id: string | null;
  visible_card_ids: string[];
  remaining_cards: DesignerCardReport[];
  skipped_cards: DesignerCardReport[];
  current_options: DesignerOptionReport[];
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
    cardIndex: 0,
    pressures: { ...role.initial_pressures },
    memory_tags: [],
    log: [],
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

  return database.cards
    .filter((card) => card.role_id === roleId)
    .filter((card) => cardMatchesMemory(card, memoryTags))
    .filter((card) => matchesPressureConditions(card.requires_pressures, pressures))
    .map((card) => applyMemoryVariant(card, memoryTags))
    .map((card) => applyPressureVariant(card, pressures));
}

export function getCurrentCard(
  database: GameDatabase,
  state: GameState,
): CardRecord | null {
  if (state.completed) {
    return null;
  }
  return getCardsForRole(database, state)[state.cardIndex] ?? null;
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

  const pressures = applyEffects(state.pressures, option.effects);
  const memoryTags = mergeMemoryTags(state.memory_tags, option.memory_tags);
  const previousCards = getCardsForRole(database, state);
  const nextIndex = state.cardIndex + 1;
  const nextState = {
    ...state,
    cardIndex: nextIndex,
    pressures,
    memory_tags: memoryTags,
  };
  const cards = getCardsForRole(database, nextState);

  return {
    ...state,
    cardIndex: nextIndex,
    pressures,
    memory_tags: memoryTags,
    completed: nextIndex >= cards.length,
    log: [
      ...state.log,
      {
        card_id: currentCard.id,
        option_id: option.id,
        date_label: currentCard.date_label,
        title: currentCard.title,
        choice: option.label,
        consequence: option.consequence,
        impact_notes: describeImmediateEffects(option),
        docket_changes: getDocketChanges(previousCards, cards, currentCard.id),
        causal_claim_ids: option.causal_claim_ids,
        pressure_delta: option.effects,
        memory_tags_added: option.memory_tags,
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
  const available = matchesPressureConditions(
    option.requires_pressures,
    state.pressures,
  );

  return {
    available,
    reason: available ? undefined : option.unavailable_text,
  };
}

export function getDesignerReport(
  database: GameDatabase,
  state: GameState,
): DesignerReport {
  const visibleCards = getCardsForRole(database, state);
  const currentCard = getCurrentCard(database, state);
  const visibleIds = new Set(visibleCards.map((card) => card.id));
  const roleCards = database.cards.filter((card) => card.role_id === state.roleId);

  return {
    current_card_id: currentCard?.id ?? null,
    visible_card_ids: visibleCards.map((card) => card.id),
    remaining_cards: visibleCards.slice(state.cardIndex).map(toDesignerCard),
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
    memory_tags: [...state.memory_tags],
    pressures: { ...state.pressures },
  };
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
  const tagNotes = describeMemoryTags(option.memory_tags);
  const pressureNotes = Object.entries(option.effects)
    .filter(([, delta]) => Math.abs(delta) >= 2)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .map(([key, delta]) =>
      describePressureMovement(key as keyof PressureMap, delta),
    );

  return [...new Set([...tagNotes, ...pressureNotes])].slice(0, 4);
}

function describeMemoryTags(tags: string[] = []) {
  const notesByTag: Record<string, string> = {
    klesl_retained:
      "A channel to moderate estates remains open, though Catholic councillors suspect delay.",
    klesl_removed:
      "The court speaks with a harder voice, and Prague expects less mercy from Vienna.",
    bavarian_dependence_high:
      "Bavaria becomes the necessary broker of armed Catholic assistance.",
    bavarian_dependence_medium:
      "Bavarian help remains close enough to demand reward and consultation.",
    bavarian_dependence_low:
      "The court keeps more direction in its own hands, but with fewer certain swords.",
    electoral_transfer_transferred:
      "Maximilian's reward becomes a constitutional fact other electors must now measure.",
    wallenstein_empowered:
      "Military command begins to gather around a servant whose credit may outrun ordinary obedience.",
    restitution_edict_issued:
      "Ecclesiastical restitution is no longer a petition at court but an imperial command.",
    prague_amnesty_broad:
      "Men who might otherwise remain enemies are given reason to seek terms under imperial authority.",
    blood_court_executions:
      "The punishments in Prague teach obedience by terror as much as by law.",
  };

  return tags.flatMap((tag) => notesByTag[tag] ?? []);
}

function describePressureMovement(pressure: keyof PressureMap, delta: number) {
  const rising = delta > 0;
  const notes: Record<keyof PressureMap, { rising: string; falling: string }> = {
    imperial_authority: {
      rising: "Imperial command is easier to present as lawful remedy.",
      falling: "More estates can say the crown governs by bargain rather than command.",
    },
    confessional_legitimacy: {
      rising: "Catholic reformers hear firmer warrant for recovery of churches, schools, and revenues.",
      falling: "Catholic reformers hear caution where they expected recovery.",
    },
    estate_trust: {
      rising: "Moderate estates gain room to remain obedient without surrendering every privilege.",
      falling: "Estate petitions speak more readily of fear, privilege, and precedent.",
    },
    fiscal_capacity: {
      rising: "Creditors and contributors see firmer means behind the court's orders.",
      falling: "The treasury must buy time with arrears, pledges, or new concessions.",
    },
    military_dependence: {
      rising: "Armed allies and military contractors gain a larger claim on the court.",
      falling: "The court carries more of its cause without surrendering direction to armed partners.",
    },
    foreign_intervention_risk: {
      rising: "Foreign courts receive a clearer pretext to watch, bargain, or intervene.",
      falling: "Outsiders find fewer openings to present intervention as protection.",
    },
    dynastic_security: {
      rising: "Habsburg succession and hereditary right look less exposed.",
      falling: "The dynasty's claim appears more dependent on consent and military fortune.",
    },
    devastation: {
      rising: "Billeting, contributions, and reprisals fall more heavily on the lands.",
      falling: "More districts escape the immediate weight of soldiers and contribution.",
    },
  };

  return rising ? notes[pressure].rising : notes[pressure].falling;
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
