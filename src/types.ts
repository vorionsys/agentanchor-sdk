// SPDX-License-Identifier: LicenseRef-Vorion-Proprietary
// Copyright 2024-2026 Vorion LLC

/**
 * @fileoverview Core types for the Agent Anchor SDK
 * @module @vorionsys/agentanchor-sdk
 */

import { z } from "zod";
import { TrustTier, TIER_THRESHOLDS } from "@vorionsys/shared-constants";

// Re-export for SDK consumers
export { TrustTier };

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SDK configuration options
 */
export interface AgentAnchorConfig {
  /** API key for authentication */
  apiKey: string;

  /** Base URL for the Agent Anchor API (defaults to production) */
  baseUrl?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  baseUrl: "https://api.agentanchor.io",
  timeout: 30000,
  retries: 3,
  debug: false,
} as const;

// ============================================================================
// CAR ID Types (Simplified from contracts package)
// ============================================================================

/**
 * Domain codes for agent capabilities
 */
export type DomainCode =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "S";

/**
 * Capability levels (L0-L7)
 */
export enum CapabilityLevel {
  L0_OBSERVE = 0,
  L1_ADVISE = 1,
  L2_DRAFT = 2,
  L3_EXECUTE = 3,
  L4_STANDARD = 4,
  L5_TRUSTED = 5,
  L6_CERTIFIED = 6,
  L7_AUTONOMOUS = 7,
}

/**
 * Trust tiers (T0-T7) — imported from @vorionsys/shared-constants (canonical source)
 * Re-exported above for SDK consumers.
 */

/**
 * Trust tier score ranges — derived from @vorionsys/shared-constants TIER_THRESHOLDS
 */
export const TRUST_TIER_RANGES: Record<
  TrustTier,
  { min: number; max: number }
> = Object.fromEntries(
  Object.values(TrustTier)
    .filter((v): v is TrustTier => typeof v === "number")
    .map((tier) => [
      tier,
      { min: TIER_THRESHOLDS[tier].min, max: TIER_THRESHOLDS[tier].max },
    ]),
) as Record<TrustTier, { min: number; max: number }>;

/**
 * Parsed CAR ID structure
 */
export interface ParsedCAR {
  /** Registry identifier (e.g., 'a3i') */
  registry: string;

  /** Organization slug */
  organization: string;

  /** Agent class name */
  agentClass: string;

  /** Capability domains */
  domains: DomainCode[];

  /** Capability level */
  level: CapabilityLevel;

  /** Agent version (semver) */
  version: string;

  /** Optional extensions */
  extensions?: string;

  /** Original CAR string */
  raw: string;
}

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent lifecycle states
 */
export enum AgentState {
  /** Active in sandbox tier */
  T0_SANDBOX = "T0_SANDBOX",
  T1_OBSERVED = "T1_OBSERVED",
  T2_PROVISIONAL = "T2_PROVISIONAL",
  T3_MONITORED = "T3_MONITORED",
  T4_STANDARD = "T4_STANDARD",
  T5_TRUSTED = "T5_TRUSTED",
  T6_CERTIFIED = "T6_CERTIFIED",
  T7_AUTONOMOUS = "T7_AUTONOMOUS",

  /** Exception states */
  QUARANTINE = "QUARANTINE",
  SUSPENDED = "SUSPENDED",
  REVOKED = "REVOKED",
  EXPELLED = "EXPELLED",
}

/**
 * Agent registration options
 */
export interface RegisterAgentOptions {
  /** Organization slug */
  organization: string;

  /** Agent class name */
  agentClass: string;

  /** Capability domains */
  domains: DomainCode[];

  /** Capability level */
  level: CapabilityLevel;

  /** Agent version */
  version: string;

  /** Agent metadata */
  metadata?: Record<string, unknown>;

  /** Agent description */
  description?: string;

  /** Contact email for notifications */
  contactEmail?: string;
}

/**
 * Registered agent details
 */
export interface Agent {
  /** Categorical Agentic Registry */
  car: string;

  /** Parsed CAR ID components */
  parsed: ParsedCAR;

  /** Current lifecycle state */
  state: AgentState;

  /** Current trust score (0-1000) */
  trustScore: number;

  /** Current trust tier */
  trustTier: TrustTier;

  /** Agent metadata */
  metadata: Record<string, unknown>;

  /** Registration timestamp */
  registeredAt: string;

  /** Last activity timestamp */
  lastActiveAt: string;

  /** Agent description */
  description?: string;
}

// ============================================================================
// Trust Types
// ============================================================================

/**
 * Trust score with breakdown
 */
export interface TrustScore {
  /** Overall score (0-1000) */
  score: number;

  /** Computed trust tier */
  tier: TrustTier;

  /** Factor breakdown */
  factors: TrustFactorBreakdown;

  /** Score calculation timestamp */
  calculatedAt: string;

  /** Cache status */
  cached: boolean;

  /** Cache age in milliseconds (if cached) */
  cacheAge?: number;
}

/**
 * Trust factor breakdown
 */
export interface TrustFactorBreakdown {
  /** Behavioral signals (0-1) */
  behavioral: number;

  /** Credential verification (0-1) */
  credential: number;

  /** Temporal factors (0-1) */
  temporal: number;

  /** Audit results (0-1) */
  audit: number;

  /** Volume/usage patterns (0-1) */
  volume: number;
}

// ============================================================================
// Attestation Types
// ============================================================================

/**
 * Attestation types
 */
export enum AttestationType {
  BEHAVIORAL = "BEHAVIORAL",
  CREDENTIAL = "CREDENTIAL",
  AUDIT = "AUDIT",
  A2A = "A2A",
  MANUAL = "MANUAL",
}

/**
 * Attestation submission options
 */
export interface SubmitAttestationOptions {
  /** Target agent CAR ID */
  car: string;

  /** Attestation type */
  type: AttestationType;

  /** Attestation outcome */
  outcome: "success" | "failure" | "warning";

  /** Action or operation being attested */
  action: string;

  /** Additional evidence */
  evidence?: Record<string, unknown>;

  /** Attestation timestamp (defaults to now) */
  timestamp?: string;
}

/**
 * Attestation record
 */
export interface Attestation {
  /** Unique attestation ID */
  id: string;

  /** Target agent CAR ID */
  car: string;

  /** Attestation type */
  type: AttestationType;

  /** Outcome */
  outcome: "success" | "failure" | "warning";

  /** Action attested */
  action: string;

  /** Evidence data */
  evidence: Record<string, unknown>;

  /** Submission timestamp */
  timestamp: string;

  /** Processing status */
  processed: boolean;

  /** Impact on trust score (if processed) */
  trustImpact?: number;
}

// ============================================================================
// Lifecycle Types
// ============================================================================

/**
 * State transition actions
 */
export enum StateAction {
  /** Promote to next tier (requires eligibility) */
  PROMOTE = "PROMOTE",

  /** Request human approval for tier promotion */
  REQUEST_APPROVAL = "REQUEST_APPROVAL",

  /** Place agent in quarantine */
  QUARANTINE = "QUARANTINE",

  /** Release from quarantine */
  RELEASE = "RELEASE",

  /** Suspend agent */
  SUSPEND = "SUSPEND",

  /** Revoke agent */
  REVOKE = "REVOKE",

  /** Expel agent permanently */
  EXPEL = "EXPEL",

  /** Reinstate from suspension/revocation */
  REINSTATE = "REINSTATE",
}

/**
 * State transition request
 */
export interface StateTransitionRequest {
  /** Target agent CAR ID */
  car: string;

  /** Action to perform */
  action: StateAction;

  /** Reason for transition */
  reason: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * State transition result
 */
export interface StateTransitionResult {
  /** Whether transition succeeded */
  success: boolean;

  /** Previous state */
  previousState: AgentState;

  /** New state */
  newState: AgentState;

  /** Transition timestamp */
  transitionedAt: string;

  /** Error message if failed */
  error?: string;

  /** Whether human approval is pending */
  pendingApproval?: boolean;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Agent query filters
 */
export interface AgentQueryFilter {
  /** Filter by organization */
  organization?: string;

  /** Filter by domains (agent must have all) */
  domains?: DomainCode[];

  /** Minimum capability level */
  minLevel?: CapabilityLevel;

  /** Minimum trust tier */
  minTrustTier?: TrustTier;

  /** Filter by state */
  state?: AgentState[];

  /** Pagination offset */
  offset?: number;

  /** Pagination limit (max 100) */
  limit?: number;
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
  /** Result items */
  data: T[];

  /** Pagination info */
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response envelope
 */
export interface APIResponse<T> {
  /** Whether the request succeeded */
  success: boolean;

  /** Response data (if successful) */
  data?: T;

  /** Error details (if failed) */
  error?: APIError;

  /** Response metadata */
  meta: ResponseMeta;
}

/**
 * API error details
 */
export interface APIError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  /** Unique request ID */
  requestId: string;

  /** Response timestamp */
  timestamp: string;

  /** API version */
  version: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * SDK error codes
 */
export enum SDKErrorCode {
  /** Network or connection error */
  NETWORK_ERROR = "NETWORK_ERROR",

  /** Request timeout */
  TIMEOUT = "TIMEOUT",

  /** Authentication failed */
  AUTH_FAILED = "AUTH_FAILED",

  /** Agent not found */
  AGENT_NOT_FOUND = "AGENT_NOT_FOUND",

  /** Invalid CAR format */
  INVALID_CAR = "INVALID_CAR",

  /** Trust insufficient for operation */
  TRUST_INSUFFICIENT = "TRUST_INSUFFICIENT",

  /** Rate limit exceeded */
  RATE_LIMITED = "RATE_LIMITED",

  /** Lifecycle transition blocked */
  LIFECYCLE_BLOCKED = "LIFECYCLE_BLOCKED",

  /** Validation error */
  VALIDATION_ERROR = "VALIDATION_ERROR",

  /** Server error */
  SERVER_ERROR = "SERVER_ERROR",
}

/**
 * SDK-specific error class
 */
export class AgentAnchorError extends Error {
  constructor(
    public readonly code: SDKErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "AgentAnchorError";
  }
}

// ============================================================================
// A2A Types
// ============================================================================

/**
 * A2A invoke request
 */
export interface A2AInvokeOptions {
  /** Target agent CAR ID */
  targetCarId: string;

  /** Action to invoke */
  action: string;

  /** Action parameters */
  params?: Record<string, unknown>;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Fire-and-forget (don't wait for response) */
  async?: boolean;

  /** Enable streaming response */
  stream?: boolean;
}

/**
 * A2A invoke response
 */
export interface A2AInvokeResult {
  /** Request ID */
  requestId: string;

  /** Success/failure */
  success: boolean;

  /** Result data (if success) */
  result?: unknown;

  /** Error details (if failure) */
  error?: A2AError;

  /** Execution metrics */
  metrics: A2AMetrics;

  /** Trust chain used */
  trustChain: A2AChainLink[];

  /** Attestation data generated */
  attestation: A2AAttestationData;
}

/**
 * A2A error
 */
export interface A2AError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * A2A execution metrics
 */
export interface A2AMetrics {
  durationMs: number;
  subCallCount: number;
  memoryBytes?: number;
  networkBytes?: number;
}

/**
 * A2A chain link
 */
export interface A2AChainLink {
  car: string;
  tier: number;
  score: number;
  action: string;
  timestamp: string;
  requestId: string;
}

/**
 * A2A attestation data
 */
export interface A2AAttestationData {
  callerCarId: string;
  calleeCarId: string;
  action: string;
  success: boolean;
  responseTimeMs: number;
  trustNegotiated: boolean;
  trustRequirementsMet: boolean;
  violations: string[];
  chainDepth: number;
  delegationUsed: boolean;
}

/**
 * A2A endpoint info
 */
export interface A2AEndpoint {
  car: string;
  capabilities: string[];
  actions: A2AAction[];
  trustRequirements: {
    minTier: number;
    requiredCapabilities: string[];
  };
  status: "healthy" | "degraded" | "unhealthy";
}

/**
 * A2A action definition
 */
export interface A2AAction {
  name: string;
  description: string;
  minTier: number;
  streaming: boolean;
}

/**
 * A2A discovery options
 */
export interface A2ADiscoverOptions {
  /** Filter by capabilities */
  capabilities?: string[];

  /** Minimum trust tier */
  minTier?: number;

  /** Filter by action name */
  action?: string;
}

/**
 * A2A chain info
 */
export interface A2AChainInfo {
  rootRequestId: string;
  state: "active" | "completed" | "failed" | "expired";
  depth: number;
  effectiveTier: number;
  effectiveScore: number;
  inheritanceMode: string;
  startedAt: string;
  lastActivityAt: string;
  links: A2AChainLink[];
}

/**
 * A2A ping result
 */
export interface A2APingResult {
  targetCarId: string;
  reachable: boolean;
  status?: string;
  capabilities?: string[];
  lastHealthCheck?: string;
  reason?: string;
}
