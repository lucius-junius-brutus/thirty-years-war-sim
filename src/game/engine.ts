import type {
  CardRecord,
  GameDatabase,
  PlayableRoleRecord,
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
}

export interface GameState {
  roleId: string;
  cardIndex: number;
  pressures: PressureMap;
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
  roleId: string,
): CardRecord[] {
  return database.cards.filter((card) => card.role_id === roleId);
}

export function getCurrentCard(
  database: GameDatabase,
  state: GameState,
): CardRecord | null {
  if (state.completed) {
    return null;
  }
  return getCardsForRole(database, state.roleId)[state.cardIndex] ?? null;
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

  const option = currentCard.options.find((item) => item.id === optionId);
  if (!option) {
    throw new Error(`Unknown option ${optionId} for card ${cardId}`);
  }

  const pressures = applyEffects(state.pressures, option.effects);
  const cards = getCardsForRole(database, state.roleId);
  const nextIndex = state.cardIndex + 1;

  return {
    ...state,
    cardIndex: nextIndex,
    pressures,
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
      },
    ],
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
