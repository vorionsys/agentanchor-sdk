// SPDX-License-Identifier: LicenseRef-Vorion-Proprietary
// Copyright 2024-2026 Vorion LLC

/**
 * @vorionsys/agentanchor-sdk
 *
 * Official SDK for Agent Anchor - AI agent registry, trust scoring, and attestations.
 *
 * @example
 * ```typescript
 * import { AgentAnchor, CapabilityLevel } from '@vorionsys/agentanchor-sdk';
 *
 * // Initialize client
 * const anchor = new AgentAnchor({ apiKey: 'your-api-key' });
 *
 * // Register an agent
 * const agent = await anchor.registerAgent({
 *   organization: 'acme',
 *   agentClass: 'invoice-bot',
 *   domains: ['A', 'B', 'F'],
 *   level: CapabilityLevel.L3_EXECUTE,
 *   version: '1.0.0',
 * });
 *
 * console.log(`Registered: ${agent.car}`);
 *
 * // Get trust score
 * const score = await anchor.getTrustScore(agent.car);
 * console.log(`Trust: ${score.score}/1000 (Tier ${score.tier})`);
 *
 * // Submit attestation
 * await anchor.submitAttestation({
 *   car: agent.car,
 *   type: AttestationType.BEHAVIORAL,
 *   outcome: 'success',
 *   action: 'process_invoice',
 * });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Client
// ============================================================================

export { AgentAnchor } from "./client.js";

// ============================================================================
// Types
// ============================================================================

export {
  // Configuration
  type AgentAnchorConfig,
  DEFAULT_CONFIG,

  // CAR ID Types
  type DomainCode,
  CapabilityLevel,
  TrustTier,
  TRUST_TIER_RANGES,
  type ParsedCAR,

  // Agent Types
  AgentState,
  type RegisterAgentOptions,
  type Agent,

  // Trust Types
  type TrustScore,
  type TrustFactorBreakdown,

  // Attestation Types
  AttestationType,
  type SubmitAttestationOptions,
  type Attestation,

  // Lifecycle Types
  StateAction,
  type StateTransitionRequest,
  type StateTransitionResult,

  // Query Types
  type AgentQueryFilter,
  type PaginatedResult,

  // API Types
  type APIResponse,
  type APIError,
  type ResponseMeta,

  // Error Types
  SDKErrorCode,
  AgentAnchorError,

  // A2A Types
  type A2AInvokeOptions,
  type A2AInvokeResult,
  type A2AError,
  type A2AMetrics,
  type A2AChainLink,
  type A2AAttestationData,
  type A2AEndpoint,
  type A2AAction,
  type A2ADiscoverOptions,
  type A2AChainInfo,
  type A2APingResult,
} from "./types.js";

// ============================================================================
// CAR ID Utilities
// ============================================================================

export {
  // Parsing
  parseCAR,
  tryParseCAR,
  parseDomainString,

  // Validation
  validateCAR,
  isValidCAR,
  type CARValidationResult,
  type CARValidationError,
  type CARValidationWarning,

  // Generation
  generateCAR,
  type GenerateCAROptions,

  // Domain Utilities
  DOMAIN_CODES,
  DOMAIN_NAMES,
  DOMAIN_BITS,
  isDomainCode,
  encodeDomains,
  decodeDomains,
  satisfiesDomainRequirements,
  getDomainName,

  // Level Utilities
  LEVEL_NAMES,
  meetsLevelRequirement,
  getLevelName,

  // Regex
  CAR_REGEX,
  SEMVER_REGEX,

  // Zod Schemas
  domainCodeSchema,
  capabilityLevelSchema,
  carIdStringSchema,
  generateCAROptionsSchema,
} from "./car/index.js";
