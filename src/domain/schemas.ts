import { z } from "zod";
import type {
  GameDatabase,
  ScholarlyReadingQueueItem,
  SourceRecord,
} from "./types";

const reviewStatusSchema = z.enum([
  "draft",
  "needs_review",
  "reviewed",
  "inferred",
]);
const confidenceSchema = z.enum(["low", "medium", "high"]);
const evidenceLayerSchema = z.enum(["primary", "scholarly", "reference"]);
const counterfactualSourceStatusSchema = z.enum([
  "wilson_direct",
  "wilson_inference",
  "game_inference",
]);
const accessStatusSchema = z.enum([
  "downloaded",
  "reference_only",
  "official_ebook_or_library_access",
  "local_copy_needed",
  "user_provided_file_needed",
  "pending_download",
  "sample_only",
]);
const readingStatusSchema = z.enum([
  "not_started",
  "needs_direct_reading",
  "in_progress",
  "notes_recorded",
  "extraction_ready",
]);
const pressureKeySchema = z.enum([
  "imperial_authority",
  "confessional_legitimacy",
  "estate_trust",
  "fiscal_capacity",
  "military_dependence",
  "foreign_intervention_risk",
  "dynastic_security",
  "devastation",
]);

const sourceRefsSchema = z.array(z.string().min(1)).min(1);

const sourceRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),
  source_type: z.string().min(1),
  evidence_layer: evidenceLayerSchema,
  access_status: accessStatusSchema,
  reading_status: readingStatusSchema,
  copyright_status: z.string().min(1),
  use_policy: z.string().min(1),
  url: z.string().url(),
  local_paths: z.array(z.string().min(1)).optional(),
  notes_path: z.string().min(1).optional(),
  notes: z.string().min(1),
});

const scholarlyReadingQueueItemSchema = z.object({
  source_id: z.string().min(1),
  priority: z.number().int().positive(),
  read_for: z.array(z.string().min(1)).min(1),
  status: readingStatusSchema,
  access_notes: z.string().min(1),
  notes_path: z.string().min(1).optional(),
});

const phaseRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  start_year: z.number().int(),
  end_year: z.number().int(),
  summary: z.string().min(1),
  source_refs: sourceRefsSchema,
  review_status: reviewStatusSchema,
});

const actorRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lifespan: z.string().min(1),
  actor_type: z.string().min(1),
  confession: z.string().min(1),
  summary: z.string().min(1),
  source_refs: sourceRefsSchema,
  review_status: reviewStatusSchema,
});

const powerCenterRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  power_center_type: z.string().min(1),
  summary: z.string().min(1),
  source_refs: sourceRefsSchema,
  review_status: reviewStatusSchema,
});

const relationshipDimensionsSchema = z.object({
  confessional_alignment: z.number().min(0).max(100),
  dynastic_interest: z.number().min(0).max(100),
  constitutional_alignment: z.number().min(0).max(100),
  military_dependence: z.number().min(0).max(100),
  financial_dependence: z.number().min(0).max(100),
  territorial_ambition: z.number().min(0).max(100),
  foreign_policy_pressure: z.number().min(0).max(100),
  personal_trust: z.number().min(0).max(100),
  strategic_dependence: z.number().min(0).max(100),
  fear_of_overreach: z.number().min(0).max(100),
});

const relationshipRecordSchema = z.object({
  id: z.string().min(1),
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  dimensions: relationshipDimensionsSchema,
  summary: z.string().min(1),
  source_refs: sourceRefsSchema,
  review_status: reviewStatusSchema,
});

const gameVariableRecordSchema = z.object({
  id: pressureKeySchema,
  name: z.string().min(1),
  description: z.string().min(1),
  low_label: z.string().min(1),
  high_label: z.string().min(1),
  high_is_dangerous: z.boolean(),
});

const pressureMapSchema = z.record(pressureKeySchema, z.number().min(0).max(100));

const playableRoleRecordSchema = z.object({
  id: z.string().min(1),
  actor_id: z.string().min(1),
  name: z.string().min(1),
  office: z.string().min(1),
  why_playable: z.string().min(1),
  player_wants: z.array(z.string().min(1)).min(1),
  constraints: z.array(z.string().min(1)).min(1),
  resources: z.array(z.string().min(1)).min(1),
  success_conditions: z.array(z.string().min(1)).min(1),
  failure_conditions: z.array(z.string().min(1)).min(1),
  mvp_suitable: z.boolean(),
  initial_pressures: pressureMapSchema,
  source_refs: sourceRefsSchema,
  review_status: reviewStatusSchema,
});

const causalClaimRecordSchema = z.object({
  id: z.string().min(1),
  historical_fact: z.string().min(1),
  source_backed_interpretation: z
    .string()
    .min(1, "source-backed interpretation is required"),
  causal_claim: z.string().min(1),
  game_abstraction: z.string().min(1),
  player_facing_text: z.string().min(1),
  mechanical_effect: z.string().min(1),
  confidence: confidenceSchema,
  review_status: reviewStatusSchema,
  source_refs: sourceRefsSchema,
});

const decisionPointRecordSchema = z.object({
  id: z.string().min(1),
  actor_or_power_center_id: z.string().min(1),
  date_label: z.string().min(1),
  situation: z.string().min(1),
  known_constraints: z.array(z.string().min(1)).min(1),
  plausible_options: z.array(z.string().min(1)).min(1),
  stakes: z.string().min(1),
  causal_claim_ids: z.array(z.string().min(1)).min(1),
  confidence: confidenceSchema,
  review_status: reviewStatusSchema,
  source_refs: sourceRefsSchema,
});

const cardOptionRecordSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  consequence: z.string().min(1),
  effects: z.partialRecord(pressureKeySchema, z.number()),
  causal_claim_ids: z.array(z.string().min(1)).min(1),
  historical_option: z.boolean().optional(),
  memory_tags: z.array(z.string().min(1)).optional(),
  research_tags: z.array(z.string().min(1)).optional(),
  counterfactual_source_status: counterfactualSourceStatusSchema.optional(),
});

const cardMemoryVariantRecordSchema = z.object({
  required_memory_tags: z.array(z.string().min(1)).min(1),
  title: z.string().min(1).optional(),
  date_label: z.string().min(1).optional(),
  briefing: z.string().min(1).optional(),
  situation: z.string().min(1).optional(),
});

const cardRecordSchema = z.object({
  id: z.string().min(1),
  role_id: z.string().min(1),
  decision_point_id: z.string().min(1).optional(),
  phase_id: z.string().min(1),
  date_label: z.string().min(1),
  title: z.string().min(1),
  briefing: z.string().min(1),
  situation: z.string().min(1),
  historian_note: z.string().min(1),
  source_refs: sourceRefsSchema,
  causal_claim_ids: z.array(z.string().min(1)).min(1),
  review_status: reviewStatusSchema,
  requires_memory_tags: z.array(z.string().min(1)).optional(),
  excludes_memory_tags: z.array(z.string().min(1)).optional(),
  memory_variants: z.array(cardMemoryVariantRecordSchema).optional(),
  options: z.array(cardOptionRecordSchema).min(2),
});

const gameDatabaseSchema = z.object({
  sources: z.array(sourceRecordSchema).min(1),
  phases: z.array(phaseRecordSchema).min(1),
  actors: z.array(actorRecordSchema).min(1),
  power_centers: z.array(powerCenterRecordSchema).min(1),
  relationships: z.array(relationshipRecordSchema).min(1),
  game_variables: z.array(gameVariableRecordSchema).min(1),
  playable_roles: z.array(playableRoleRecordSchema).min(1),
  causal_claims: z.array(causalClaimRecordSchema).min(1),
  decision_points: z.array(decisionPointRecordSchema).min(1),
  cards: z.array(cardRecordSchema).min(1),
});

export function validateGameDatabase(database: unknown): GameDatabase {
  const parsed = gameDatabaseSchema.parse(database);
  assertUnique(parsed.sources.map((item) => item.id), "source");
  assertUnique(parsed.phases.map((item) => item.id), "phase");
  assertUnique(parsed.actors.map((item) => item.id), "actor");
  assertUnique(parsed.power_centers.map((item) => item.id), "power center");
  assertUnique(parsed.causal_claims.map((item) => item.id), "causal claim");
  assertUnique(parsed.decision_points.map((item) => item.id), "decision point");
  assertUnique(parsed.cards.map((item) => item.id), "card");
  assertUnique(parsed.game_variables.map((item) => item.id), "game variable");

  const sourceIds = new Set(parsed.sources.map((item) => item.id));
  const phaseIds = new Set(parsed.phases.map((item) => item.id));
  const roleIds = new Set(parsed.playable_roles.map((item) => item.id));
  const actorIds = new Set(parsed.actors.map((item) => item.id));
  const powerCenterIds = new Set(parsed.power_centers.map((item) => item.id));
  const causalClaimIds = new Set(parsed.causal_claims.map((item) => item.id));
  const decisionPointIds = new Set(parsed.decision_points.map((item) => item.id));

  [
    ...parsed.phases,
    ...parsed.actors,
    ...parsed.power_centers,
    ...parsed.relationships,
    ...parsed.playable_roles,
    ...parsed.causal_claims,
    ...parsed.decision_points,
    ...parsed.cards,
  ].forEach((record) => {
    record.source_refs.forEach((sourceRef) => {
      if (!sourceIds.has(sourceRef)) {
        throw new Error(`Unknown source reference: ${sourceRef}`);
      }
    });
  });

  assertReviewedRecordsUseReadSources(parsed, sourceIds);

  parsed.playable_roles.forEach((role) => {
    if (!actorIds.has(role.actor_id)) {
      throw new Error(`Unknown actor for role ${role.id}: ${role.actor_id}`);
    }
  });

  parsed.relationships.forEach((relationship) => {
    [relationship.from_id, relationship.to_id].forEach((id) => {
      if (!actorIds.has(id) && !powerCenterIds.has(id)) {
        throw new Error(`Unknown relationship endpoint: ${id}`);
      }
    });
  });

  parsed.decision_points.forEach((point) => {
    if (
      !actorIds.has(point.actor_or_power_center_id) &&
      !powerCenterIds.has(point.actor_or_power_center_id)
    ) {
      throw new Error(
        `Unknown decision point actor or power center: ${point.actor_or_power_center_id}`,
      );
    }
    point.causal_claim_ids.forEach((claimId) => {
      if (!causalClaimIds.has(claimId)) {
        throw new Error(`Unknown causal claim in decision point: ${claimId}`);
      }
    });
  });

  parsed.cards.forEach((card) => {
    if (!roleIds.has(card.role_id)) {
      throw new Error(`Unknown role for card ${card.id}: ${card.role_id}`);
    }
    if (!phaseIds.has(card.phase_id)) {
      throw new Error(`Unknown phase for card ${card.id}: ${card.phase_id}`);
    }
    if (card.decision_point_id && !decisionPointIds.has(card.decision_point_id)) {
      throw new Error(
        `Unknown decision point for card ${card.id}: ${card.decision_point_id}`,
      );
    }
    card.causal_claim_ids.forEach((claimId) => {
      if (!causalClaimIds.has(claimId)) {
        throw new Error(`Unknown causal claim in card ${card.id}: ${claimId}`);
      }
    });
    card.options.forEach((option) => {
      if (option.historical_option !== true) {
        if (
          !option.counterfactual_source_status ||
          !option.research_tags ||
          option.research_tags.length === 0
        ) {
          throw new Error(
            `Option ${option.id} is missing backend counterfactual tracking`,
          );
        }
      }
      option.causal_claim_ids.forEach((claimId) => {
        if (!causalClaimIds.has(claimId)) {
          throw new Error(
            `Unknown causal claim in option ${option.id}: ${claimId}`,
          );
        }
      });
    });
  });

  return parsed;
}

export function validateScholarlyReadingQueue(
  queue: unknown,
  sources: SourceRecord[],
): ScholarlyReadingQueueItem[] {
  const parsed = z.array(scholarlyReadingQueueItemSchema).parse(queue);
  assertUnique(
    parsed.map((item) => item.source_id),
    "scholarly reading queue source",
  );

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  parsed.forEach((item) => {
    const source = sourceById.get(item.source_id);
    if (!source) {
      throw new Error(`Unknown scholarly reading queue source: ${item.source_id}`);
    }
    if (source.evidence_layer !== "scholarly") {
      throw new Error(
        `Reading queue source is not scholarly: ${item.source_id}`,
      );
    }
    if (
      item.status === "notes_recorded" ||
      item.status === "extraction_ready"
    ) {
      if (!item.notes_path && !source.notes_path) {
        throw new Error(
          `Scholarly source marked read without a notes path: ${item.source_id}`,
        );
      }
    }
  });

  return parsed;
}

function assertReviewedRecordsUseReadSources(
  database: GameDatabase,
  sourceIds: Set<string>,
) {
  const sourceById = new Map(database.sources.map((source) => [source.id, source]));
  const records = [
    ...database.phases,
    ...database.actors,
    ...database.power_centers,
    ...database.relationships,
    ...database.playable_roles,
    ...database.causal_claims,
    ...database.decision_points,
    ...database.cards,
  ];

  records.forEach((record) => {
    if (record.review_status !== "reviewed") return;

    record.source_refs.forEach((sourceRef) => {
      if (!sourceIds.has(sourceRef)) return;
      const source = sourceById.get(sourceRef);
      if (
        source?.evidence_layer === "scholarly" &&
        source.reading_status !== "notes_recorded" &&
        source.reading_status !== "extraction_ready"
      ) {
        throw new Error(
          `Reviewed record ${record.id} cites unread scholarly source ${sourceRef}`,
        );
      }
    });
  });
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label} id: ${value}`);
    }
    seen.add(value);
  });
}
