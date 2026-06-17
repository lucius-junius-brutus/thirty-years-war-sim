import type { GameState } from "./engine";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

export const SAVE_KEY = "empire-in-ashes-save-v1";

export function saveGame(storage: StorageAdapter, state: GameState) {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(storage: StorageAdapter): GameState | null {
  const value = storage.getItem(SAVE_KEY);
  if (!value) {
    return null;
  }
  const state = JSON.parse(value) as GameState;
  return {
    ...state,
    memory_tags: Array.isArray(state.memory_tags) ? state.memory_tags : [],
    // Migrate older saves that tracked progress by position: derive the set of
    // resolved cards from the log of choices already made.
    resolved_card_ids: Array.isArray(state.resolved_card_ids)
      ? state.resolved_card_ids
      : (state.log ?? []).map((entry) => entry.card_id),
  };
}

export function clearGame(storage: StorageAdapter) {
  storage.removeItem(SAVE_KEY);
}
