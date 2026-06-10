import actors from "../../data/actors/actors.json";
import cards from "../../data/cards/cards.json";
import causalClaims from "../../data/causal_claims/causal_claims.json";
import decisionPoints from "../../data/decision_points/decision_points.json";
import dossiers from "../../data/dossiers/dossiers.json";
import gameVariables from "../../data/game_variables/game_variables.json";
import phases from "../../data/phases/phases.json";
import playableRoles from "../../data/playable_roles/playable_roles.json";
import powerCenters from "../../data/power_centers/power_centers.json";
import relationships from "../../data/relationships/relationships.json";
import sources from "../../data/sources/sources.json";
import { validateGameDatabase } from "../domain/schemas";

export const gameDatabase = validateGameDatabase({
  sources,
  phases,
  actors,
  power_centers: powerCenters,
  relationships,
  game_variables: gameVariables,
  playable_roles: playableRoles,
  causal_claims: causalClaims,
  decision_points: decisionPoints,
  dossiers,
  cards,
});
