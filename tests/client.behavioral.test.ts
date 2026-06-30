// SPDX-License-Identifier: LicenseRef-Vorion-Proprietary
// Copyright 2024-2026 Vorion LLC

/**
 * AgentAnchor HTTP Client Behavioral Tests
 *
 * Tests actual HTTP request behavior, error handling, retry logic,
 * and CAR validation using a mocked global fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AgentAnchor,
  AgentAnchorError,
  SDKErrorCode,
  DEFAULT_CONFIG,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CAR = "a3i.acme.test-agent:A-L0@1.0.0";
const INVALID_CAR = "bad-car";

let mockFetch: ReturnType<typeof vi.fn>;

function createClient(overrides: Record<string, unknown> = {}): AgentAnchor {
  return new AgentAnchor({
    apiKey: "test-api-key-123",
    retries: 0, // no retries by default for simpler tests
    timeout: 5000,
    ...overrides,
  });
}

function mockResponse(
  data: unknown,
  status = 200,
  apiError?: { code: string; message: string },
): Response {
  const body = apiError
    ? {
        success: false,
        error: apiError,
        meta: {
          requestId: "req-1",
          timestamp: new Date().toISOString(),
          version: "1.0",
        },
      }
    : {
        success: true,
        data,
        meta: {
          requestId: "req-1",
          timestamp: new Date().toISOString(),
          version: "1.0",
        },
      };

  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockFetch = vi.fn();
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AgentAnchor HTTP client behavioral", () => {
  // =========================================================================
  // registerAgent
  // =========================================================================

  describe("registerAgent()", () => {
    it("POSTs to /v1/agents with registration data", async () => {
      const client = createClient();
      const agentData = {
        name: "TestAgent",
        domain: "a3i",
        capabilities: ["execute"],
      };
      mockFetch.mockResolvedValue(
        mockResponse({ id: "agent-1", ...agentData }),
      );

      await client.registerAgent(agentData as any);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${DEFAULT_CONFIG.baseUrl}/v1/agents`);
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual(agentData);
      expect(opts.headers.Authorization).toBe("Bearer test-api-key-123");
    });

    it("returns parsed agent on success", async () => {
      const client = createClient();
      const expected = { id: "agent-1", name: "TestAgent" };
      mockFetch.mockResolvedValue(mockResponse(expected));

      const result = await client.registerAgent({} as any);

      expect(result).toEqual(expected);
    });
  });

  // =========================================================================
  // getTrustScore
  // =========================================================================

  describe("getTrustScore()", () => {
    it("GETs /v1/agents/:car/trust", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse({ score: 500, tier: "T3_MONITORED" }),
      );

      await client.getTrustScore(VALID_CAR);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain(
        `/v1/agents/${encodeURIComponent(VALID_CAR)}/trust`,
      );
      expect(url).not.toContain("refresh=true");
    });

    it("appends ?refresh=true when forceRefresh is true", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(mockResponse({ score: 500 }));

      await client.getTrustScore(VALID_CAR, true);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("?refresh=true");
    });

    it("throws INVALID_CAR before making request for invalid CAR", async () => {
      const client = createClient();

      await expect(client.getTrustScore(INVALID_CAR)).rejects.toThrow(
        AgentAnchorError,
      );
      try {
        await client.getTrustScore(INVALID_CAR);
      } catch (err) {
        expect((err as AgentAnchorError).code).toBe(SDKErrorCode.INVALID_CAR);
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("error handling", () => {
    it("throws AUTH_FAILED on 401 response", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 401, { code: "UNAUTHORIZED", message: "Bad key" }),
      );

      await expect(client.registerAgent({} as any)).rejects.toMatchObject({
        code: SDKErrorCode.AUTH_FAILED,
      });
    });

    it("throws AGENT_NOT_FOUND on 404 response", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 404, {
          code: "AGENT_NOT_FOUND",
          message: "Not found",
        }),
      );

      await expect(client.getAgent(VALID_CAR)).rejects.toMatchObject({
        code: SDKErrorCode.AGENT_NOT_FOUND,
      });
    });

    it("throws VALIDATION_ERROR on 400 response", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 400, { code: "VALIDATION", message: "Bad request" }),
      );

      await expect(client.registerAgent({} as any)).rejects.toMatchObject({
        code: SDKErrorCode.VALIDATION_ERROR,
      });
    });

    it("throws RATE_LIMITED on 429 response", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 429, {
          code: "QUOTA_EXCEEDED",
          message: "Rate limited",
        }),
      );

      await expect(client.registerAgent({} as any)).rejects.toMatchObject({
        code: SDKErrorCode.RATE_LIMITED,
      });
    });

    it("throws SERVER_ERROR on 500 response", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 500, { code: "INTERNAL", message: "Server error" }),
      );

      await expect(client.registerAgent({} as any)).rejects.toMatchObject({
        code: SDKErrorCode.SERVER_ERROR,
      });
    });

    it("maps API error code AGENT_NOT_FOUND correctly", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 404, {
          code: "AGENT_NOT_FOUND",
          message: "Not found",
        }),
      );

      await expect(client.getAgent(VALID_CAR)).rejects.toMatchObject({
        code: SDKErrorCode.AGENT_NOT_FOUND,
      });
    });

    it("maps API error code TRUST_INSUFFICIENT correctly", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 403, {
          code: "TRUST_INSUFFICIENT",
          message: "Trust too low",
        }),
      );

      await expect(client.getAgent(VALID_CAR)).rejects.toMatchObject({
        code: SDKErrorCode.TRUST_INSUFFICIENT,
      });
    });
  });

  // =========================================================================
  // Retry behavior
  // =========================================================================

  describe("retry behavior", () => {
    it("does not retry on AUTH_FAILED errors", async () => {
      const client = createClient({ retries: 2 });
      mockFetch.mockResolvedValue(
        mockResponse(null, 401, { code: "UNAUTHORIZED", message: "Bad key" }),
      );

      await expect(client.registerAgent({} as any)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // no retries
    });

    it("does not retry on AGENT_NOT_FOUND errors", async () => {
      const client = createClient({ retries: 2 });
      mockFetch.mockResolvedValue(
        mockResponse(null, 404, {
          code: "AGENT_NOT_FOUND",
          message: "Not found",
        }),
      );

      await expect(client.getAgent(VALID_CAR)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry on VALIDATION_ERROR errors", async () => {
      const client = createClient({ retries: 2 });
      mockFetch.mockResolvedValue(
        mockResponse(null, 400, { code: "VALIDATION", message: "Bad request" }),
      );

      await expect(client.registerAgent({} as any)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("retries on server error up to configured retries", async () => {
      const client = createClient({ retries: 2 });
      mockFetch
        .mockResolvedValueOnce(
          mockResponse(null, 500, { code: "INTERNAL", message: "Error 1" }),
        )
        .mockResolvedValueOnce(
          mockResponse(null, 500, { code: "INTERNAL", message: "Error 2" }),
        )
        .mockResolvedValueOnce(
          mockResponse(null, 500, { code: "INTERNAL", message: "Error 3" }),
        );

      await expect(client.registerAgent({} as any)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it("succeeds on retry after transient failure", async () => {
      const client = createClient({ retries: 2 });
      mockFetch
        .mockResolvedValueOnce(
          mockResponse(null, 500, { code: "INTERNAL", message: "Transient" }),
        )
        .mockResolvedValueOnce(mockResponse({ id: "agent-1" }));

      const result = await client.registerAgent({} as any);
      expect(result).toEqual({ id: "agent-1" });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // isRegistered
  // =========================================================================

  describe("isRegistered()", () => {
    it("returns true when getAgent succeeds", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(mockResponse({ id: "agent-1" }));

      const result = await client.isRegistered(VALID_CAR);
      expect(result).toBe(true);
    });

    it("returns false when getAgent throws AGENT_NOT_FOUND", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 404, {
          code: "AGENT_NOT_FOUND",
          message: "Not found",
        }),
      );

      const result = await client.isRegistered(VALID_CAR);
      expect(result).toBe(false);
    });

    it("re-throws other errors", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse(null, 500, { code: "INTERNAL", message: "Server down" }),
      );

      await expect(client.isRegistered(VALID_CAR)).rejects.toThrow();
    });
  });

  // =========================================================================
  // A2A communication
  // =========================================================================

  describe("a2aInvoke()", () => {
    it("validates both caller and target CAR before request", async () => {
      const client = createClient();

      await expect(
        client.a2aInvoke(INVALID_CAR, {
          targetCarId: VALID_CAR,
          action: "test",
        } as any),
      ).rejects.toMatchObject({ code: SDKErrorCode.INVALID_CAR });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sends X-Agent-CAR header with caller CAR", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(
        mockResponse({ requestId: "req-1", status: "completed" }),
      );

      await client.a2aInvoke(VALID_CAR, {
        targetCarId: VALID_CAR,
        action: "ping",
      } as any);

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers["X-Agent-CAR"]).toBe(VALID_CAR);
    });

    it("POSTs to /v1/a2a/invoke", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(mockResponse({ requestId: "req-1" }));

      await client.a2aInvoke(VALID_CAR, {
        targetCarId: VALID_CAR,
        action: "test",
      } as any);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/a2a/invoke");
      expect(opts.method).toBe("POST");
    });
  });

  // =========================================================================
  // Request headers
  // =========================================================================

  describe("request headers", () => {
    it("includes Authorization, Content-Type, and User-Agent", async () => {
      const client = createClient();
      mockFetch.mockResolvedValue(mockResponse({}));

      await client.registerAgent({} as any);

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe("Bearer test-api-key-123");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(opts.headers["User-Agent"]).toContain(
        "@vorionsys/agentanchor-sdk",
      );
    });
  });
});
