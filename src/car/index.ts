// SPDX-License-Identifier: LicenseRef-Vorion-Proprietary
// Copyright 2024-2026 Vorion LLC

/**
 * @fileoverview CAR (Categorical Agentic Registry) parsing and validation
 * @module @vorionsys/agentanchor-sdk/car
 */

import { z } from "zod";
import { type DomainCode, CapabilityLevel } from "../types.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid domain codes
 */
export const DOMAIN_CODES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "S",
] as const;

/**
 * Domain code descriptions
 */
export const DOMAIN_NAMES: Record<DomainCode, string> = {
  A: "Administration",
  B: "Business",
  C: "Communications",
  D: "Data",
  E: "External",
  F: "Finance",
  G: "Governance",
  H: "Hospitality",
  I: "Infrastructure",
  S: "Security",
};

/**
 * Domain bitmask values
 */
export const DOMAIN_BITS: Record<DomainCode, number> = {
  A: 0x001,
  B: 0x002,
  C: 0x004,
  D: 0x008,
  E: 0x010,
  F: 0x020,
  G: 0x040,
  H: 0x080,
  I: 0x100,
  S: 0x200,
};

/**
 * CAR regex pattern
 *
 * Format: {registry}.{org}.{class}:{domains}-L{level}@{version}[#extensions]
 *
 * Examples:
 * - a3i.vorion.banquet-advisor:FHC-L3@1.2.0
 * - a3i.acme.support-agent:CD-L2@1.0.0#policy=strict
 */
export const CAR_REGEX =
  /^([a-z0-9]+)\.([a-z0-9-]+)\.([a-z0-9-]+):([A-Z]+)-L([0-7])@(\d+\.\d+\.\d+)(?:#(.+))?$/;

/**
 * Semver regex pattern
 */
export const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed CAR components
 */
export interface ParsedCAR {
  /** Registry identifier (e.g., 'a3i') */
  registry: string;

  /** Organization slug */
  organization: string;

  /** Agent class name */
  agentClass: string;

  /** Capability domains as array */
  domains: DomainCode[];

  /** Domains as bitmask */
  domainsBitmask: number;

  /** Capability level */
  level: CapabilityLevel;

  /** Agent version (semver) */
  version: string;

  /** Optional extensions string */
  extensions?: string;

  /** Parsed extensions as key-value pairs */
  parsedExtensions?: Record<string, string>;

  /** Original CAR string */
  raw: string;
}

/**
 * CAR validation error
 */
export interface CARValidationError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Position in string (if applicable) */
  position?: number;
}

/**
 * CAR validation warning
 */
export interface CARValidationWarning {
  /** Warning code */
  code: string;

  /** Human-readable message */
  message: string;
}

/**
 * CAR validation result
 */
export interface CARValidationResult {
  /** Whether the CAR is valid */
  valid: boolean;

  /** Validation errors */
  errors: CARValidationError[];

  /** Validation warnings */
  warnings: CARValidationWarning[];

  /** Parsed CAR (if valid) */
  parsed?: ParsedCAR;
}

/**
 * Options for generating a CAR ID string
 */
export interface GenerateCAROptions {
  /** Registry identifier */
  registry: string;

  /** Organization slug */
  organization: string;

  /** Agent class name */
  agentClass: string;

  /** Capability domains */
  domains: DomainCode[];

  /** Capability level */
  level: CapabilityLevel;

  /** Version string */
  version: string;

  /** Optional extensions */
  extensions?: Record<string, string>;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a CAR ID string into components
 *
 * @param carId - CAR ID string to parse
 * @returns Parsed CAR ID components
 * @throws Error if CAR ID is invalid
 *
 * @example
 * ```typescript
 * const parsed = parseCAR('a3i.vorion.banquet-advisor:FHC-L3@1.2.0');
 * console.log(parsed.domains); // ['F', 'H', 'C']
 * console.log(parsed.level);   // 3
 * ```
 */
export function parseCAR(carId: string): ParsedCAR {
  const result = tryParseCAR(carId);
  if (!result) {
    throw new Error(`Invalid CAR ID format: ${carId}`);
  }
  return result;
}

/**
 * Try to parse a CAR ID string, returning undefined if invalid
 *
 * @param carId - CAR ID string to parse
 * @returns Parsed CAR ID or undefined
 */
export function tryParseCAR(carId: string): ParsedCAR | undefined {
  if (typeof carId !== "string" || !carId) {
    return undefined;
  }

  const match = CAR_REGEX.exec(carId);
  if (!match) {
    return undefined;
  }

  const [
    ,
    registry,
    organization,
    agentClass,
    domainsStr,
    levelStr,
    version,
    extensions,
  ] = match;

  // Parse domains
  const domains = parseDomainString(domainsStr);
  if (!domains) {
    return undefined;
  }

  // Parse level
  const level = parseInt(levelStr, 10) as CapabilityLevel;
  if (level < 0 || level > 7) {
    return undefined;
  }

  // Calculate domain bitmask
  const domainsBitmask = encodeDomains(domains);

  // Parse extensions if present
  let parsedExtensions: Record<string, string> | undefined;
  if (extensions) {
    parsedExtensions = {};
    for (const pair of extensions.split(",")) {
      const [key, value] = pair.split("=");
      if (key && value !== undefined) {
        parsedExtensions[key] = value;
      }
    }
  }

  return {
    registry,
    organization,
    agentClass,
    domains,
    domainsBitmask,
    level,
    version,
    extensions,
    parsedExtensions,
    raw: carId,
  };
}

/**
 * Parse a domain string into array of domain codes
 *
 * @param domainString - Domain string (e.g., 'FHC')
 * @returns Array of domain codes or undefined if invalid
 */
export function parseDomainString(
  domainString: string,
): DomainCode[] | undefined {
  if (!domainString || typeof domainString !== "string") {
    return undefined;
  }

  const domains: DomainCode[] = [];
  for (const char of domainString) {
    if (!isDomainCode(char)) {
      return undefined;
    }
    domains.push(char);
  }

  return domains;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a CAR ID string
 *
 * @param carId - CAR ID string to validate
 * @returns Validation result with errors and warnings
 */
export function validateCAR(carId: string): CARValidationResult {
  const errors: CARValidationError[] = [];
  const warnings: CARValidationWarning[] = [];

  // Check type
  if (typeof carId !== "string") {
    errors.push({
      code: "INVALID_TYPE",
      message: "CAR ID must be a string",
    });
    return { valid: false, errors, warnings };
  }

  // Check empty
  if (!carId.trim()) {
    errors.push({
      code: "EMPTY_CAR",
      message: "CAR ID cannot be empty",
    });
    return { valid: false, errors, warnings };
  }

  // Check format
  if (!CAR_REGEX.test(carId)) {
    errors.push({
      code: "INVALID_FORMAT",
      message:
        "CAR ID does not match expected format: {registry}.{org}.{class}:{domains}-L{level}@{version}",
    });
    return { valid: false, errors, warnings };
  }

  // Try to parse
  const parsed = tryParseCAR(carId);
  if (!parsed) {
    errors.push({
      code: "PARSE_ERROR",
      message: "Failed to parse CAR ID components",
    });
    return { valid: false, errors, warnings };
  }

  // Validate registry
  const knownRegistries = ["a3i", "eu-ai", "self"];
  if (!knownRegistries.includes(parsed.registry)) {
    warnings.push({
      code: "UNKNOWN_REGISTRY",
      message: `Registry '${parsed.registry}' is not a known registry`,
    });
  }

  // Validate organization format
  if (
    parsed.organization.startsWith("-") ||
    parsed.organization.endsWith("-")
  ) {
    errors.push({
      code: "INVALID_ORGANIZATION",
      message: "Organization cannot start or end with hyphen",
    });
  }

  // Validate version
  if (!SEMVER_REGEX.test(parsed.version)) {
    errors.push({
      code: "INVALID_VERSION",
      message: "Version must be valid semver (MAJOR.MINOR.PATCH)",
    });
  }

  // Check for duplicate domains
  const uniqueDomains = new Set(parsed.domains);
  if (uniqueDomains.size !== parsed.domains.length) {
    warnings.push({
      code: "DUPLICATE_DOMAINS",
      message: "Domain string contains duplicate domain codes",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed: errors.length === 0 ? parsed : undefined,
  };
}

/**
 * Check if a CAR ID string is valid
 *
 * @param carId - CAR ID string to check
 * @returns Whether the CAR ID is valid
 */
export function isValidCAR(carId: string): boolean {
  return validateCAR(carId).valid;
}

// ============================================================================
// Generation Functions
// ============================================================================

/**
 * Generate a CAR ID string from components
 *
 * @param options - CAR ID components
 * @returns Generated CAR ID string
 *
 * @example
 * ```typescript
 * const carId = generateCAR({
 *   registry: 'a3i',
 *   organization: 'vorion',
 *   agentClass: 'banquet-advisor',
 *   domains: ['F', 'H', 'C'],
 *   level: CapabilityLevel.L3_EXECUTE,
 *   version: '1.2.0',
 * });
 * // Result: 'a3i.vorion.banquet-advisor:FHC-L3@1.2.0'
 * ```
 */
export function generateCAR(options: GenerateCAROptions): string {
  const {
    registry,
    organization,
    agentClass,
    domains,
    level,
    version,
    extensions,
  } = options;

  // Sort and dedupe domains for consistency
  const sortedDomains = [...new Set(domains)].sort();
  const domainString = sortedDomains.join("");

  let carId = `${registry}.${organization}.${agentClass}:${domainString}-L${level}@${version}`;

  // Add extensions if present
  if (extensions && Object.keys(extensions).length > 0) {
    const extString = Object.entries(extensions)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    carId += `#${extString}`;
  }

  return carId;
}

// ============================================================================
// Domain Utilities
// ============================================================================

/**
 * Check if a string is a valid domain code
 */
export function isDomainCode(code: string): code is DomainCode {
  return DOMAIN_CODES.includes(code as DomainCode);
}

/**
 * Encode domain codes to bitmask
 *
 * @param domains - Array of domain codes
 * @returns Bitmask representation
 */
export function encodeDomains(domains: DomainCode[]): number {
  return domains.reduce((mask, code) => mask | DOMAIN_BITS[code], 0);
}

/**
 * Decode bitmask to domain codes
 *
 * @param bitmask - Domain bitmask
 * @returns Array of domain codes
 */
export function decodeDomains(bitmask: number): DomainCode[] {
  return DOMAIN_CODES.filter((code) => (bitmask & DOMAIN_BITS[code]) !== 0);
}

/**
 * Check if domains satisfy required domains
 *
 * @param agentDomains - Agent's domains
 * @param requiredDomains - Required domains
 * @returns Whether agent has all required domains
 */
export function satisfiesDomainRequirements(
  agentDomains: DomainCode[],
  requiredDomains: DomainCode[],
): boolean {
  const agentMask = encodeDomains(agentDomains);
  const requiredMask = encodeDomains(requiredDomains);
  return (agentMask & requiredMask) === requiredMask;
}

/**
 * Get domain name from code
 */
export function getDomainName(code: DomainCode): string {
  return DOMAIN_NAMES[code];
}

// ============================================================================
// Level Utilities
// ============================================================================

/**
 * Level names
 */
export const LEVEL_NAMES: Record<CapabilityLevel, string> = {
  [CapabilityLevel.L0_OBSERVE]: "Observe",
  [CapabilityLevel.L1_ADVISE]: "Advise",
  [CapabilityLevel.L2_DRAFT]: "Draft",
  [CapabilityLevel.L3_EXECUTE]: "Execute",
  [CapabilityLevel.L4_STANDARD]: "Standard",
  [CapabilityLevel.L5_TRUSTED]: "Trusted",
  [CapabilityLevel.L6_CERTIFIED]: "Certified",
  [CapabilityLevel.L7_AUTONOMOUS]: "Autonomous",
};

/**
 * Check if agent level meets required level
 *
 * @param agentLevel - Agent's capability level
 * @param requiredLevel - Required level
 * @returns Whether agent meets requirement
 */
export function meetsLevelRequirement(
  agentLevel: CapabilityLevel,
  requiredLevel: CapabilityLevel,
): boolean {
  return agentLevel >= requiredLevel;
}

/**
 * Get level name from enum value
 */
export function getLevelName(level: CapabilityLevel): string {
  return LEVEL_NAMES[level] ?? "Unknown";
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const domainCodeSchema = z.enum(DOMAIN_CODES);

export const capabilityLevelSchema = z.nativeEnum(CapabilityLevel);

export const carIdStringSchema = z
  .string()
  .regex(CAR_REGEX, "Invalid CAR ID format");

export const generateCAROptionsSchema = z.object({
  registry: z.string().min(1),
  organization: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
  agentClass: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
  domains: z.array(domainCodeSchema).min(1),
  level: capabilityLevelSchema,
  version: z.string().regex(SEMVER_REGEX),
  extensions: z.record(z.string()).optional(),
});
