import { describe, expect, it } from "vitest";
import { gameDatabase } from "../data/gameDatabase";
import { createInitialGameState } from "./engine";
import { loadGame, saveGame } from "./save";

describe("save state", () => {
  it("round-trips the current campaign through localStorage-compatible storage", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };

    const state = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    saveGame(adapter, state);

    expect(loadGame(adapter)).toEqual(state);
  });

  it("loads older saved campaigns without choice memory as empty memory", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };
    const oldState = createInitialGameState(gameDatabase, "role_ferdinand_ii");
    const { memory_tags, ...legacyState } = oldState;
    adapter.setItem("empire-in-ashes-save-v1", JSON.stringify(legacyState));

    expect(loadGame(adapter)?.memory_tags).toEqual([]);
  });
});
