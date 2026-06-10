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
  return JSON.parse(value) as GameState;
}

export function clearGame(storage: StorageAdapter) {
  storage.removeItem(SAVE_KEY);
}
