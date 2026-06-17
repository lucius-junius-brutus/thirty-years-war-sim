export type ReviewStatus = "draft" | "needs_review" | "reviewed" | "inferred";
export type Confidence = "low" | "medium" | "high";
export type EvidenceLayer = "primary" | "scholarly" | "reference";
export type CounterfactualSourceStatus =
  | "wilson_direct"
  | "wilson_inference"
  | "game_inference";
export type AccessStatus =
  | "downloaded"
  | "reference_only"
  | "official_ebook_or_library_access"
  | "local_copy_needed"
  | "user_provided_file_needed"
  | "pending_download"
  | "sample_only";
export type ReadingStatus =
  | "not_started"
  | "needs_direct_reading"
  | "in_progress"
  | "notes_recorded"
  | "extraction_ready";

export type PressureKey =
  | "imperial_authority"
  | "confessional_legitimacy"
  | "estate_trust"
  | "fiscal_capacity"
  | "military_dependence"
  | "foreign_intervention_risk"
  | "dynastic_security"
  | "devastation";

export type PressureMap = Record<PressureKey, number>;

export interface SourceRecord {
  id: string;
  title: string;
  author: string;
  year: number;
  source_type: string;
  evidence_layer: EvidenceLayer;
  access_status: AccessStatus;
  reading_status: ReadingStatus;
  copyright_status: string;
  use_policy: string;
  url: string;
  local_paths?: string[];
  notes_path?: string;
  notes: string;
}

export interface ScholarlyReadingQueueItem {
  source_id: string;
  priority: number;
  read_for: string[];
  status: ReadingStatus;
  access_notes: string;
  notes_path?: string;
}

export interface PhaseRecord {
  id: string;
  name: string;
  start_year: number;
  end_year: number;
  summary: string;
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface ActorRecord {
  id: string;
  name: string;
  lifespan: string;
  actor_type: string;
  confession: string;
  summary: string;
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface PowerCenterRecord {
  id: string;
  name: string;
  power_center_type: string;
  summary: string;
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface RelationshipRecord {
  id: string;
  from_id: string;
  to_id: string;
  dimensions: Record<
    | "confessional_alignment"
    | "dynastic_interest"
    | "constitutional_alignment"
    | "military_dependence"
    | "financial_dependence"
    | "territorial_ambition"
    | "foreign_policy_pressure"
    | "personal_trust"
    | "strategic_dependence"
    | "fear_of_overreach",
    number
  >;
  summary: string;
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface GameVariableRecord {
  id: PressureKey;
  name: string;
  description: string;
  low_label: string;
  high_label: string;
  high_is_dangerous: boolean;
}

export interface PlayableRoleRecord {
  id: string;
  actor_id: string;
  name: string;
  office: string;
  why_playable: string;
  player_wants: string[];
  constraints: string[];
  resources: string[];
  success_conditions: string[];
  failure_conditions: string[];
  mvp_suitable: boolean;
  initial_pressures: PressureMap;
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface CausalClaimRecord {
  id: string;
  historical_fact: string;
  source_backed_interpretation: string;
  causal_claim: string;
  game_abstraction: string;
  player_facing_text: string;
  mechanical_effect: string;
  confidence: Confidence;
  review_status: ReviewStatus;
  source_refs: string[];
}

export interface DecisionPointRecord {
  id: string;
  actor_or_power_center_id: string;
  date_label: string;
  situation: string;
  known_constraints: string[];
  plausible_options: string[];
  stakes: string;
  causal_claim_ids: string[];
  confidence: Confidence;
  review_status: ReviewStatus;
  source_refs: string[];
}

export interface ScheduledEffectRecord {
  after: number;
  effects?: Partial<PressureMap>;
  memory_tags?: string[];
  note: string;
}

export interface CardOptionRecord {
  id: string;
  label: string;
  consequence: string;
  effects: Partial<PressureMap>;
  causal_claim_ids: string[];
  scheduled_effects?: ScheduledEffectRecord[];
  historical_option?: boolean;
  memory_tags?: string[];
  research_tags?: string[];
  counterfactual_source_status?: CounterfactualSourceStatus;
  requires_pressures?: PressureConditionRecord[];
  requires_memory_tags?: string[];
  excludes_memory_tags?: string[];
  unavailable_text?: string;
  hidden_when_unavailable?: boolean;
}

export interface CardMemoryVariantRecord {
  required_memory_tags: string[];
  title?: string;
  date_label?: string;
  briefing?: string;
  situation?: string;
}

export interface PressureConditionRecord {
  pressure: PressureKey;
  min?: number;
  max?: number;
}

export interface PressureThresholdRecord {
  id: string;
  pressure: PressureKey;
  kind: "reward" | "warning" | "crisis";
  condition: PressureConditionRecord;
  label: string;
  summary: string;
  memory_tags: string[];
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface CardPressureVariantRecord {
  conditions: PressureConditionRecord[];
  title?: string;
  date_label?: string;
  briefing?: string;
  situation?: string;
}

export interface CardContextLinkRecord {
  term: string;
  dossier_id: string;
}

export interface ForcedCourseRecord {
  requires_pressures: PressureConditionRecord[];
  option_id: string;
  note: string;
}

export interface CardRecord {
  id: string;
  role_id: string;
  decision_point_id?: string;
  phase_id: string;
  date_label: string;
  title: string;
  briefing: string;
  situation: string;
  historian_note: string;
  source_refs: string[];
  causal_claim_ids: string[];
  review_status: ReviewStatus;
  requires_memory_tags?: string[];
  excludes_memory_tags?: string[];
  requires_pressures?: PressureConditionRecord[];
  memory_variants?: CardMemoryVariantRecord[];
  pressure_variants?: CardPressureVariantRecord[];
  context_links?: CardContextLinkRecord[];
  forced_course?: ForcedCourseRecord;
  options: CardOptionRecord[];
}

export interface DossierRecord {
  id: string;
  title: string;
  dossier_type:
    | "person"
    | "document"
    | "institution"
    | "concept"
    | "place"
    | "treaty";
  summary: string;
  why_it_matters: string;
  source_refs: string[];
  review_status: ReviewStatus;
}

export interface GameDatabase {
  sources: SourceRecord[];
  phases: PhaseRecord[];
  actors: ActorRecord[];
  power_centers: PowerCenterRecord[];
  relationships: RelationshipRecord[];
  game_variables: GameVariableRecord[];
  pressure_thresholds: PressureThresholdRecord[];
  playable_roles: PlayableRoleRecord[];
  causal_claims: CausalClaimRecord[];
  decision_points: DecisionPointRecord[];
  dossiers: DossierRecord[];
  cards: CardRecord[];
}
