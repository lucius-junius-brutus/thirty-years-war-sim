import type { CardRecord, PlayableRoleRecord } from "../domain/types";

// Resolve which woodcut a card shows, as a path relative to assets/. A card may
// carry its own bespoke woodcut; otherwise it inherits the role's per-phase band,
// and failing that the role default. Returns the bare filename/path (no base URL).
export function resolveWoodcut(
  role: PlayableRoleRecord,
  card: Pick<CardRecord, "phase_id" | "woodcut">,
): string {
  return (
    card.woodcut ?? role.woodcuts.by_phase[card.phase_id] ?? role.woodcuts.default
  );
}
