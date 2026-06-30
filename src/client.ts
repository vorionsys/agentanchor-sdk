// SPDX-License-Identifier: LicenseRef-Vorion-Proprietary
// Copyright 2024-2026 Vorion LLC

/**
 * @fileoverview Agent Anchor SDK Client
 * @module @vorionsys/agentanchor-sdk
 */

import {
  type AgentAnchorConfig,
  type RegisterAgentOptions,
  type Agent,
  type TrustScore,
  type SubmitAttestationOptions,
  type Attestation,
  type StateTransitionRequest,
  type StateTransitionResult,
  type AgentQueryFilter,
  type PaginatedResult,
  type APIResponse,
  type A2AInvokeOptions,
  type A2AInvokeResult,
  type A2ADiscoverOptions,
  type A2AEndpoint,
  type A2AChainInfo,
  type A2APingResult,
  DEFAULT_CONFIG,
  SDKErrorCode,
  AgentAnchorError,
} from "./types.js";
import {
  parseCAR,
  validateCAR,
  type CARValidationResult,
} from "./car/index.js";

/**
 * Agent Anchor SDK Client
 *
 * @example
 * ```typescript
 * import { AgentAnchor } from '@vorionsys/agentanchor-sdk';
 *
 * const anchor = new AgentAnchor({ apiKey: 'your-api-key' });
 *
 * // Register an agent
 * const agent = await anchor.registerAgent({
 *   organization: 'acme',
 *   agentClass: 'invoice-bot',
 *   domains: ['A', 'B', 'F'],
 *   level: 3,
 *   version: '1.0.0',
 * });
 *
 * // Get trust score
 * const score = await anchor.getTrustScore(agent.car);
 * console.log(`Trust: ${score.score} (${score.tier})`);
 * ```
 */
export class AgentAnchor {
  private readonly config: Required<AgentAnchorConfig>;

  constructor(config: AgentAnchorConfig) {
    if (!config.apiKey) {
      throw new AgentAnchorError(
        SDKErrorCode.AUTH_FAILED,
        "API key is required",
      );
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULT_CONFIG.baseUrl,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      retries: config.retries ?? DEFAULT_CONFIG.retries,
      debug: config.debug ?? DEFAULT_CONFIG.debug,
    };
  }

  // ==========================================================================
  // Agent Registration & Management
  // ==========================================================================

  /**
   * Register a new agent with Agent Anchor
   *
   * @param options - Registration options
   * @returns The registered agent with assigned CAR ID
   */
  async registerAgent(options: RegisterAgentOptions): Promise<Agent> {
    return this.request<Agent>("POST", "/v1/agents", options);
  }

  /**
   * Get agent details by CAR ID
   *
   * @param car - CAR ID string
   * @returns Agent details including current trust score
   */
  async getAgent(car: string): Promise<Agent> {
    this.validateCAROrThrow(car);
    return this.request<Agent>("GET", `/v1/agents/${encodeURIComponent(car)}`);
  }

  /**
   * Update agent metadata
   *
   * @param car - CAR ID string
   * @param updates - Fields to update
   * @returns Updated agent
   */
  async updateAgent(
    car: string,
    updates: Partial<Pick<Agent, "metadata" | "description">>,
  ): Promise<Agent> {
    this.validateCAROrThrow(car);
    return this.request<Agent>(
      "PATCH",
      `/v1/agents/${encodeURIComponent(car)}`,
      updates,
    );
  }

  /**
   * Deregister an agent
   *
   * @param car - CAR ID string
   * @param reason - Reason for deregistration
   */
  async deregisterAgent(car: string, reason: string): Promise<void> {
    this.validateCAROrThrow(car);
    await this.request<void>(
      "DELETE",
      `/v1/agents/${encodeURIComponent(car)}`,
      { reason },
    );
  }

  /**
   * Query agents with filters
   *
   * @param filter - Query filters
   * @returns Paginated list of agents
   */
  async queryAgents(
    filter: AgentQueryFilter = {},
  ): Promise<PaginatedResult<Agent>> {
    return this.request<PaginatedResult<Agent>>("POST", "/v1/query", filter);
  }

  // ==========================================================================
  // Trust Scoring
  // ==========================================================================

  /**
   * Get current trust score for an agent
   *
   * @param car - CAR ID string
   * @param forceRefresh - Bypass cache and recalculate
   * @returns Trust score with factor breakdown
   */
  async getTrustScore(car: string, forceRefresh = false): Promise<TrustScore> {
    this.validateCAROrThrow(car);
    const params = forceRefresh ? "?refresh=true" : "";
    return this.request<TrustScore>(
      "GET",
      `/v1/agents/${encodeURIComponent(car)}/trust${params}`,
    );
  }

  // ==========================================================================
  // Attestations
  // ==========================================================================

  /**
   * Submit an attestation for an agent
   *
   * @param options - Attestation details
   * @returns The created attestation record
   */
  async submitAttestation(
    options: SubmitAttestationOptions,
  ): Promise<Attestation> {
    this.validateCAROrThrow(options.car);
    return this.request<Attestation>(
      "POST",
      `/v1/agents/${encodeURIComponent(options.car)}/attestations`,
      options,
    );
  }

  /**
   * Get attestations for an agent
   *
   * @param car - CAR ID string
   * @param limit - Maximum number to return (default 50)
   * @returns List of attestations
   */
  async getAttestations(car: string, limit = 50): Promise<Attestation[]> {
    this.validateCAROrThrow(car);
    return this.request<Attestation[]>(
      "GET",
      `/v1/agents/${encodeURIComponent(car)}/attestations?limit=${limit}`,
    );
  }

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Trigger a lifecycle state transition
   *
   * @param request - Transition request
   * @returns Transition result
   */
  async transitionState(
    request: StateTransitionRequest,
  ): Promise<StateTransitionResult> {
    this.validateCAROrThrow(request.car);
    return this.request<StateTransitionResult>(
      "POST",
      `/v1/agents/${encodeURIComponent(request.car)}/lifecycle`,
      request,
    );
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate a CAR ID string
   *
   * @param car - CAR ID string to validate
   * @returns Validation result with parsed components
   */
  validateCAR(car: string): CARValidationResult {
    return validateCAR(car);
  }

  /**
   * Parse a CAR ID string (throws on invalid)
   *
   * @param car - CAR ID string to parse
   * @returns Parsed CAR ID components
   */
  parseCAR(car: string) {
    return parseCAR(car);
  }

  /**
   * Check if a CAR ID is registered with Agent Anchor
   *
   * @param car - CAR ID string to check
   * @returns Whether the CAR ID is registered
   */
  async isRegistered(car: string): Promise<boolean> {
    try {
      await this.getAgent(car);
      return true;
    } catch (error) {
      if (
        error instanceof AgentAnchorError &&
        error.code === SDKErrorCode.AGENT_NOT_FOUND
      ) {
        return false;
      }
      throw error;
    }
  }

  // ==========================================================================
  // Agent-to-Agent Communication
  // ==========================================================================

  /**
   * Invoke an action on another agent
   *
   * @param callerCarId - Your agent's CAR ID (the caller)
   * @param options - Invoke options
   * @returns Invoke result with response data and metrics
   *
   * @example
   * ```typescript
   * const result = await anchor.a2aInvoke('a3i.acme.invoice-bot:ABF-L3@1.0.0', {
   *   targetCarId: 'a3i.acme.payment-processor:AF-L4@2.0.0',
   *   action: 'processPayment',
   *   params: { invoiceId: '12345', amount: 100 },
   * });
   *
   * if (result.success) {
   *   console.log('Payment processed:', result.result);
   * }
   * ```
   */
  async a2aInvoke(
    callerCarId: string,
    options: A2AInvokeOptions,
  ): Promise<A2AInvokeResult> {
    this.validateCAROrThrow(callerCarId);
    this.validateCAROrThrow(options.targetCarId);

    return this.request<A2AInvokeResult>("POST", "/v1/a2a/invoke", options, {
      "X-Agent-CAR": callerCarId,
    });
  }

  /**
   * Discover available agents for A2A communication
   *
   * @param options - Discovery filters
   * @returns List of available endpoints
   *
   * @example
   * ```typescript
   * // Find agents that can process payments
   * const endpoints = await anchor.a2aDiscover({
   *   capabilities: ['payments'],
   *   minTier: 4,
   * });
   * ```
   */
  async a2aDiscover(options: A2ADiscoverOptions = {}): Promise<A2AEndpoint[]> {
    const params = new URLSearchParams();
    if (options.capabilities) {
      params.set("capabilities", options.capabilities.join(","));
    }
    if (options.minTier !== undefined) {
      params.set("minTier", options.minTier.toString());
    }
    if (options.action) {
      params.set("action", options.action);
    }

    const queryString = params.toString();
    const path = `/v1/a2a/discover${queryString ? `?${queryString}` : ""}`;

    const result = await this.request<{ endpoints: A2AEndpoint[] }>(
      "GET",
      path,
    );
    return result.endpoints;
  }

  /**
   * Ping another agent to check availability
   *
   * @param targetCarId - Target agent CAR ID
   * @returns Ping result with availability status
   */
  async a2aPing(targetCarId: string): Promise<A2APingResult> {
    this.validateCAROrThrow(targetCarId);
    return this.request<A2APingResult>("POST", "/v1/a2a/ping", { targetCarId });
  }

  /**
   * Get chain-of-trust information for an A2A request
   *
   * @param requestId - A2A request ID
   * @returns Chain information and validation
   */
  async a2aGetChain(requestId: string): Promise<A2AChainInfo> {
    const result = await this.request<{ chain: A2AChainInfo }>(
      "GET",
      `/v1/a2a/chain/${encodeURIComponent(requestId)}`,
    );
    return result.chain;
  }

  /**
   * Register this agent as an A2A endpoint
   *
   * @param endpoint - Endpoint configuration
   *
   * @example
   * ```typescript
   * await anchor.a2aRegisterEndpoint({
   *   car: 'a3i.acme.my-agent:ABF-L3@1.0.0',
   *   url: 'https://my-agent.example.com/a2a',
   *   capabilities: ['data-processing'],
   *   actions: [{
   *     name: 'processData',
   *     description: 'Process incoming data',
   *     minTier: 3,
   *     streaming: false,
   *   }],
   * });
   * ```
   */
  async a2aRegisterEndpoint(endpoint: {
    car: string;
    url: string;
    capabilities?: string[];
    actions?: Array<{
      name: string;
      description: string;
      minTier?: number;
      streaming?: boolean;
    }>;
    trustRequirements?: {
      minTier?: number;
      requiredCapabilities?: string[];
    };
  }): Promise<void> {
    this.validateCAROrThrow(endpoint.car);
    await this.request<void>("POST", "/v1/a2a/register", endpoint);
  }

  /**
   * Unregister this agent from A2A
   *
   * @param car - Agent CAR ID to unregister
   */
  async a2aUnregisterEndpoint(car: string): Promise<void> {
    this.validateCAROrThrow(car);
    await this.request<void>(
      "DELETE",
      `/v1/a2a/register/${encodeURIComponent(car)}`,
    );
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      "User-Agent": "@vorionsys/agentanchor-sdk/0.1.0",
      ...additionalHeaders,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout,
        );

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const json = (await response.json()) as APIResponse<T>;

        if (!response.ok || !json.success) {
          throw this.createErrorFromResponse(response, json);
        }

        return json.data as T;
      } catch (error) {
        lastError = error as Error;

        if (this.config.debug) {
          console.error(
            `[AgentAnchor] Request failed (attempt ${attempt + 1}):`,
            error,
          );
        }

        // Don't retry on certain errors
        if (error instanceof AgentAnchorError) {
          const noRetry = [
            SDKErrorCode.AUTH_FAILED,
            SDKErrorCode.AGENT_NOT_FOUND,
            SDKErrorCode.INVALID_CAR,
            SDKErrorCode.VALIDATION_ERROR,
          ];
          if (noRetry.includes(error.code)) {
            throw error;
          }
        }

        // Exponential backoff
        if (attempt < this.config.retries) {
          await this.sleep(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw (
      lastError ??
      new AgentAnchorError(
        SDKErrorCode.NETWORK_ERROR,
        "Request failed after retries",
      )
    );
  }

  /**
   * Create SDK error from API response
   */
  private createErrorFromResponse(
    response: Response,
    json: APIResponse<unknown>,
  ): AgentAnchorError {
    const code = this.mapStatusToErrorCode(response.status, json.error?.code);
    return new AgentAnchorError(
      code,
      json.error?.message ?? `Request failed with status ${response.status}`,
      json.error?.details,
      json.meta?.requestId,
    );
  }

  /**
   * Map HTTP status to SDK error code
   */
  private mapStatusToErrorCode(status: number, apiCode?: string): SDKErrorCode {
    if (apiCode) {
      const mapping: Record<string, SDKErrorCode> = {
        AGENT_NOT_FOUND: SDKErrorCode.AGENT_NOT_FOUND,
        INVALID_CAR: SDKErrorCode.INVALID_CAR,
        TRUST_INSUFFICIENT: SDKErrorCode.TRUST_INSUFFICIENT,
        LIFECYCLE_BLOCKED: SDKErrorCode.LIFECYCLE_BLOCKED,
        QUOTA_EXCEEDED: SDKErrorCode.RATE_LIMITED,
      };
      if (mapping[apiCode]) return mapping[apiCode];
    }

    switch (status) {
      case 401:
      case 403:
        return SDKErrorCode.AUTH_FAILED;
      case 404:
        return SDKErrorCode.AGENT_NOT_FOUND;
      case 400:
        return SDKErrorCode.VALIDATION_ERROR;
      case 429:
        return SDKErrorCode.RATE_LIMITED;
      default:
        return status >= 500
          ? SDKErrorCode.SERVER_ERROR
          : SDKErrorCode.NETWORK_ERROR;
    }
  }

  /**
   * Validate CAR ID or throw
   */
  private validateCAROrThrow(car: string): void {
    const result = validateCAR(car);
    if (!result.valid) {
      throw new AgentAnchorError(
        SDKErrorCode.INVALID_CAR,
        `Invalid CAR ID: ${result.errors.map((e: { message: string }) => e.message).join(", ")}`,
        { errors: result.errors },
      );
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
