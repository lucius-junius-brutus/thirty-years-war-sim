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
  causal_claim_ids: string[];
  pressure_delta: Partial<PressureMap>;
  memory_tags_added?: string[];
}

export interface GameState {
  roleId: string;
  cardIndex: number;
  pressures: PressureMap;
  memory_tags: string[];
  log: GameLogEntry[];
  completed: boolean;
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

export function scoreOutcome(database: GameDatabase, state: GameState) {
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

  let title = "Uneasy Consolidation";
  if (dangers.length >= 4) {
    title = "Victory Turns Against Itself";
  } else if (strengths.length >= 5 && dangers.length <= 1) {
    title = "A Narrowly Governable Peace";
  } else if (state.pressures.foreign_intervention_risk >= 75) {
    title = "The Empire Draws Europe In";
  }

  return {
    title,
    strengths: strengths.map(([key]) => key),
    dangers: dangers.map(([key]) => key),
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
