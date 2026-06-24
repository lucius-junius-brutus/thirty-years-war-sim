import { describe, expect, it } from "vitest";
import { resolveWoodcut } from "./woodcut";
import type { CardRecord, PlayableRoleRecord } from "../domain/types";

const role = {
  woodcuts: {
    default: "woodcut-town.svg",
    by_phase: { phase_revolt: "woodcut-host.svg" },
  },
} as unknown as PlayableRoleRecord;

const card = (over: Partial<CardRecord>): CardRecord =>
  ({ phase_id: "phase_revolt", ...over }) as CardRecord;

describe("resolveWoodcut", () => {
  it("prefers the card's own woodcut when present", () => {
    expect(resolveWoodcut(role, card({ woodcut: "woodcuts/card_x.svg" }))).toBe(
      "woodcuts/card_x.svg",
    );
  });

  it("falls back to the role's per-phase woodcut", () => {
    expect(resolveWoodcut(role, card({}))).toBe("woodcut-host.svg");
  });

  it("falls back to the role default when the phase is unmapped", () => {
    expect(resolveWoodcut(role, card({ phase_id: "phase_unknown" }))).toBe(
      "woodcut-town.svg",
    );
  });
});
