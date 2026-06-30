// SPDX-License-Identifier: LicenseRef-Vorion-Proprietary
// Copyright 2024-2026 Vorion LLC

import { describe, it, expect } from "vitest";
import {
  AgentAnchor,
  CapabilityLevel,
  AgentState,
  AttestationType,
  StateAction,
  SDKErrorCode,
  AgentAnchorError,
  DEFAULT_CONFIG,
  TRUST_TIER_RANGES,
  parseCAR,
  tryParseCAR,
  parseDomainString,
  validateCAR,
  isValidCAR,
  generateCAR,
  DOMAIN_CODES,
  DOMAIN_NAMES,
  DOMAIN_BITS,
  isDomainCode,
  encodeDomains,
  decodeDomains,
  satisfiesDomainRequirements,
  getDomainName,
  LEVEL_NAMES,
  meetsLevelRequirement,
  getLevelName,
  CAR_REGEX,
  SEMVER_REGEX,
  domainCodeSchema,
  capabilityLevelSchema,
  carIdStringSchema,
  generateCAROptionsSchema,
} from "../src/index.js";

describe("agentanchor-sdk exports", () => {
  it("exports AgentAnchor class", () => {
    expect(AgentAnchor).toBeDefined();
    expect(typeof AgentAnchor).toBe("function");
  });

  it("exports enums", () => {
    expect(CapabilityLevel.L0_OBSERVE).toBe(0);
    expect(CapabilityLevel.L7_AUTONOMOUS).toBe(7);
    expect(AgentState.T0_SANDBOX).toBe("T0_SANDBOX");
    expect(AgentState.QUARANTINE).toBe("QUARANTINE");
    expect(AttestationType.BEHAVIORAL).toBe("BEHAVIORAL");
    expect(StateAction.PROMOTE).toBe("PROMOTE");
    expect(SDKErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
  });

  it("exports DEFAULT_CONFIG", () => {
    expect(DEFAULT_CONFIG.baseUrl).toContain("agentanchor");
    expect(DEFAULT_CONFIG.timeout).toBe(30000);
    expect(DEFAULT_CONFIG.retries).toBe(3);
    expect(DEFAULT_CONFIG.debug).toBe(false);
  });

  it("exports TRUST_TIER_RANGES", () => {
    expect(TRUST_TIER_RANGES).toBeDefined();
    expect(typeof TRUST_TIER_RANGES).toBe("object");
  });

  it("exports CAR utilities", () => {
    expect(parseCAR).toBeDefined();
    expect(tryParseCAR).toBeDefined();
    expect(parseDomainString).toBeDefined();
    expect(validateCAR).toBeDefined();
    expect(isValidCAR).toBeDefined();
    expect(generateCAR).toBeDefined();
    expect(DOMAIN_CODES).toBeDefined();
    expect(DOMAIN_NAMES).toBeDefined();
    expect(DOMAIN_BITS).toBeDefined();
    expect(isDomainCode).toBeDefined();
    expect(encodeDomains).toBeDefined();
    expect(decodeDomains).toBeDefined();
    expect(satisfiesDomainRequirements).toBeDefined();
    expect(getDomainName).toBeDefined();
    expect(LEVEL_NAMES).toBeDefined();
    expect(meetsLevelRequirement).toBeDefined();
    expect(getLevelName).toBeDefined();
    expect(CAR_REGEX).toBeDefined();
    expect(SEMVER_REGEX).toBeDefined();
  });

  it("exports Zod schemas", () => {
    expect(domainCodeSchema).toBeDefined();
    expect(capabilityLevelSchema).toBeDefined();
    expect(carIdStringSchema).toBeDefined();
    expect(generateCAROptionsSchema).toBeDefined();
  });
});

describe("AgentAnchor constructor", () => {
  it("throws when apiKey is missing", () => {
    expect(() => new AgentAnchor({ apiKey: "" })).toThrow(
      "API key is required",
    );
  });

  it("throws AgentAnchorError when apiKey is missing", () => {
    try {
      new AgentAnchor({ apiKey: "" });
    } catch (e) {
      expect(e).toBeInstanceOf(AgentAnchorError);
      expect((e as AgentAnchorError).code).toBe(SDKErrorCode.AUTH_FAILED);
    }
  });

  it("constructs with valid apiKey", () => {
    const anchor = new AgentAnchor({ apiKey: "test-key-123" });
    expect(anchor).toBeInstanceOf(AgentAnchor);
  });

  it("accepts custom config", () => {
    const anchor = new AgentAnchor({
      apiKey: "test-key",
      baseUrl: "https://custom.example.com",
      timeout: 5000,
      retries: 1,
      debug: true,
    });
    expect(anchor).toBeInstanceOf(AgentAnchor);
  });
});

describe("AgentAnchor validation methods", () => {
  const anchor = new AgentAnchor({ apiKey: "test-key" });

  it("validates valid CAR IDs", () => {
    const result = anchor.validateCAR(
      "a3i.vorion.banquet-advisor:FHC-L3@1.2.0",
    );
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.organization).toBe("vorion");
  });

  it("validates invalid CAR IDs", () => {
    const result = anchor.validateCAR("invalid-car-string");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("parses valid CAR IDs", () => {
    const parsed = anchor.parseCAR("a3i.vorion.banquet-advisor:FHC-L3@1.2.0");
    expect(parsed.registry).toBe("a3i");
    expect(parsed.organization).toBe("vorion");
    expect(parsed.agentClass).toBe("banquet-advisor");
    expect(parsed.domains).toEqual(["F", "H", "C"]);
    expect(parsed.level).toBe(3);
    expect(parsed.version).toBe("1.2.0");
  });

  it("throws on invalid CAR parsing", () => {
    expect(() => anchor.parseCAR("bad")).toThrow();
  });
});

describe("AgentAnchorError", () => {
  it("has correct name", () => {
    const err = new AgentAnchorError(SDKErrorCode.NETWORK_ERROR, "test");
    expect(err.name).toBe("AgentAnchorError");
  });

  it("stores code and message", () => {
    const err = new AgentAnchorError(SDKErrorCode.AUTH_FAILED, "Auth failed");
    expect(err.code).toBe(SDKErrorCode.AUTH_FAILED);
    expect(err.message).toBe("Auth failed");
  });

  it("stores details and requestId", () => {
    const err = new AgentAnchorError(
      SDKErrorCode.VALIDATION_ERROR,
      "Invalid",
      { field: "car" },
      "req-123",
    );
    expect(err.details).toEqual({ field: "car" });
    expect(err.requestId).toBe("req-123");
  });

  it("is an instance of Error", () => {
    const err = new AgentAnchorError(SDKErrorCode.NETWORK_ERROR, "test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("CAR parsing", () => {
  it("parseCAR parses valid CAR", () => {
    const parsed = parseCAR("a3i.acme.support-agent:CD-L2@1.0.0");
    expect(parsed.registry).toBe("a3i");
    expect(parsed.organization).toBe("acme");
    expect(parsed.agentClass).toBe("support-agent");
    expect(parsed.domains).toEqual(["C", "D"]);
    expect(parsed.level).toBe(2);
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.domainsBitmask).toBeGreaterThan(0);
    expect(parsed.raw).toBe("a3i.acme.support-agent:CD-L2@1.0.0");
  });

  it("parseCAR handles extensions", () => {
    const parsed = parseCAR("a3i.acme.bot:A-L0@1.0.0#policy=strict");
    expect(parsed.extensions).toBe("policy=strict");
    expect(parsed.parsedExtensions).toEqual({ policy: "strict" });
  });

  it("tryParseCAR returns undefined for invalid", () => {
    expect(tryParseCAR("")).toBeUndefined();
    expect(tryParseCAR("not-valid")).toBeUndefined();
  });

  it("tryParseCAR returns parsed for valid", () => {
    const result = tryParseCAR("a3i.acme.bot:A-L0@1.0.0");
    expect(result).toBeDefined();
    expect(result!.registry).toBe("a3i");
  });
});

describe("CAR validation", () => {
  it("validates correct CAR", () => {
    const result = validateCAR("a3i.vorion.banquet-advisor:FHC-L3@1.2.0");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty string", () => {
    const result = validateCAR("");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("EMPTY_CAR");
  });

  it("rejects invalid format", () => {
    const result = validateCAR("just-wrong");
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FORMAT");
  });

  it("warns about unknown registries", () => {
    const result = validateCAR("custom.org.bot:A-L0@1.0.0");
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === "UNKNOWN_REGISTRY")).toBe(
      true,
    );
  });

  it("warns about duplicate domains", () => {
    const result = validateCAR("a3i.org.bot:AA-L0@1.0.0");
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === "DUPLICATE_DOMAINS")).toBe(
      true,
    );
  });

  it("isValidCAR returns boolean", () => {
    expect(isValidCAR("a3i.org.bot:A-L0@1.0.0")).toBe(true);
    expect(isValidCAR("not-a-car")).toBe(false);
  });
});

describe("CAR generation", () => {
  it("generates correct CAR string", () => {
    const car = generateCAR({
      registry: "a3i",
      organization: "vorion",
      agentClass: "banquet-advisor",
      domains: ["F", "H", "C"],
      level: CapabilityLevel.L3_EXECUTE,
      version: "1.2.0",
    });
    // Domains are sorted alphabetically
    expect(car).toBe("a3i.vorion.banquet-advisor:CFH-L3@1.2.0");
  });

  it("includes extensions", () => {
    const car = generateCAR({
      registry: "a3i",
      organization: "acme",
      agentClass: "bot",
      domains: ["A"],
      level: CapabilityLevel.L0_OBSERVE,
      version: "1.0.0",
      extensions: { policy: "strict" },
    });
    expect(car).toContain("#policy=strict");
  });

  it("deduplicates domains", () => {
    const car = generateCAR({
      registry: "a3i",
      organization: "acme",
      agentClass: "bot",
      domains: ["A", "A", "B"],
      level: CapabilityLevel.L0_OBSERVE,
      version: "1.0.0",
    });
    expect(car).toBe("a3i.acme.bot:AB-L0@1.0.0");
  });
});

describe("domain utilities", () => {
  it("DOMAIN_CODES has 10 entries", () => {
    expect(DOMAIN_CODES).toHaveLength(10);
  });

  it("isDomainCode validates correctly", () => {
    expect(isDomainCode("A")).toBe(true);
    expect(isDomainCode("S")).toBe(true);
    expect(isDomainCode("Z")).toBe(false);
    expect(isDomainCode("")).toBe(false);
  });

  it("DOMAIN_NAMES maps all codes", () => {
    for (const code of DOMAIN_CODES) {
      expect(DOMAIN_NAMES[code]).toBeTruthy();
    }
  });

  it("getDomainName returns name", () => {
    expect(getDomainName("A")).toBe("Administration");
    expect(getDomainName("F")).toBe("Finance");
    expect(getDomainName("S")).toBe("Security");
  });

  it("encodeDomains/decodeDomains roundtrip", () => {
    const domains = ["A", "C", "F"] as const;
    const mask = encodeDomains([...domains]);
    const decoded = decodeDomains(mask);
    expect(decoded).toEqual([...domains]);
  });

  it("satisfiesDomainRequirements checks subset", () => {
    expect(satisfiesDomainRequirements(["A", "B", "C"], ["A", "B"])).toBe(true);
    expect(satisfiesDomainRequirements(["A"], ["A", "B"])).toBe(false);
  });

  it("parseDomainString parses valid string", () => {
    expect(parseDomainString("ABC")).toEqual(["A", "B", "C"]);
  });

  it("parseDomainString returns undefined for invalid", () => {
    expect(parseDomainString("XYZ")).toBeUndefined();
    expect(parseDomainString("")).toBeUndefined();
  });
});

describe("level utilities", () => {
  it("LEVEL_NAMES maps all levels", () => {
    for (let i = 0; i <= 7; i++) {
      expect(LEVEL_NAMES[i as CapabilityLevel]).toBeTruthy();
    }
  });

  it("getLevelName returns name", () => {
    expect(getLevelName(CapabilityLevel.L0_OBSERVE)).toBe("Observe");
    expect(getLevelName(CapabilityLevel.L7_AUTONOMOUS)).toBe("Autonomous");
  });

  it("meetsLevelRequirement checks levels", () => {
    expect(
      meetsLevelRequirement(
        CapabilityLevel.L3_EXECUTE,
        CapabilityLevel.L2_DRAFT,
      ),
    ).toBe(true);
    expect(
      meetsLevelRequirement(
        CapabilityLevel.L2_DRAFT,
        CapabilityLevel.L3_EXECUTE,
      ),
    ).toBe(false);
    expect(
      meetsLevelRequirement(
        CapabilityLevel.L3_EXECUTE,
        CapabilityLevel.L3_EXECUTE,
      ),
    ).toBe(true);
  });
});

describe("Zod schemas", () => {
  it("domainCodeSchema validates domain codes", () => {
    expect(domainCodeSchema.safeParse("A").success).toBe(true);
    expect(domainCodeSchema.safeParse("Z").success).toBe(false);
  });

  it("capabilityLevelSchema validates levels", () => {
    expect(capabilityLevelSchema.safeParse(0).success).toBe(true);
    expect(capabilityLevelSchema.safeParse(7).success).toBe(true);
    expect(capabilityLevelSchema.safeParse(8).success).toBe(false);
  });

  it("carIdStringSchema validates CAR strings", () => {
    expect(carIdStringSchema.safeParse("a3i.org.bot:A-L0@1.0.0").success).toBe(
      true,
    );
    expect(carIdStringSchema.safeParse("invalid").success).toBe(false);
  });

  it("generateCAROptionsSchema validates options", () => {
    const valid = {
      registry: "a3i",
      organization: "acme",
      agentClass: "bot",
      domains: ["A"],
      level: 0,
      version: "1.0.0",
    };
    expect(generateCAROptionsSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      registry: "",
      organization: "",
      agentClass: "",
      domains: [],
      level: 8,
      version: "bad",
    };
    expect(generateCAROptionsSchema.safeParse(invalid).success).toBe(false);
  });
});
