import { gameDatabase } from "../src/data/gameDatabase";
import { validateGameDatabase } from "../src/domain/schemas";

const parsed = validateGameDatabase(gameDatabase);

console.log(
  [
    "Data validation passed:",
    `${parsed.sources.length} sources`,
    `${parsed.phases.length} phases`,
    `${parsed.actors.length} actors`,
    `${parsed.power_centers.length} power centers`,
    `${parsed.relationships.length} relationships`,
    `${parsed.pressure_thresholds.length} pressure thresholds`,
    `${parsed.decision_points.length} decision points`,
    `${parsed.causal_claims.length} causal claims`,
    `${parsed.cards.length} cards`,
  ].join(" "),
);
