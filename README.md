# @vorionsys/agentanchor-sdk

Official SDK for [Agent Anchor](https://agentanchor.io) - the AI agent registry, trust scoring, and attestation platform.

## Installation

```bash
npm install @vorionsys/agentanchor-sdk
# or
yarn add @vorionsys/agentanchor-sdk
# or
pnpm add @vorionsys/agentanchor-sdk
```

## Quick Start

```typescript
import { AgentAnchor, CapabilityLevel, AttestationType } from '@vorionsys/agentanchor-sdk';

// Initialize the client
const anchor = new AgentAnchor({
  apiKey: 'your-api-key',
});

// Register an agent
const agent = await anchor.registerAgent({
  organization: 'acme',
  agentClass: 'invoice-bot',
  domains: ['A', 'B', 'F'],  // Administration, Business, Finance
  level: CapabilityLevel.L3_EXECUTE,
  version: '1.0.0',
  description: 'Processes invoices and payments',
});

console.log(`Registered agent: ${agent.aci}`);
// Output: Registered agent: a3i.acme.invoice-bot:ABF-L3@1.0.0

// Get trust score
const score = await anchor.getTrustScore(agent.aci);
console.log(`Trust: ${score.score}/1000 (Tier T${score.tier})`);

// Submit attestation
await anchor.submitAttestation({
  aci: agent.aci,
  type: AttestationType.BEHAVIORAL,
  outcome: 'success',
  action: 'process_invoice',
  evidence: {
    invoiceId: 'INV-001',
    processingTime: 1250,
  },
});
```

## Features

### Agent Registration

```typescript
const agent = await anchor.registerAgent({
  organization: 'your-org',
  agentClass: 'your-agent',
  domains: ['A', 'B'],
  level: CapabilityLevel.L2_DRAFT,
  version: '1.0.0',
});
```

### Trust Scoring

```typescript
// Get current trust score
const score = await anchor.getTrustScore(aci);

// Force refresh (bypass cache)
const freshScore = await anchor.getTrustScore(aci, true);

console.log(score.score);       // 0-1000
console.log(score.tier);        // TrustTier.T3_MONITORED
console.log(score.factors);     // { behavioral, credential, temporal, audit, volume }
```

### Attestations

```typescript
// Submit attestation
await anchor.submitAttestation({
  aci: agent.aci,
  type: AttestationType.BEHAVIORAL,
  outcome: 'success',
  action: 'complete_task',
});

// Get attestations
const attestations = await anchor.getAttestations(agent.aci, 50);
```

### Lifecycle Management

```typescript
import { StateAction } from '@vorionsys/agentanchor-sdk';

// Request tier promotion
const result = await anchor.transitionState({
  aci: agent.aci,
  action: StateAction.REQUEST_APPROVAL,
  reason: 'Agent has demonstrated consistent performance',
});

if (result.pendingApproval) {
  console.log('Awaiting human approval...');
}
```

### ACI Utilities

```typescript
import { parseACI, validateACI, generateACI } from '@vorionsys/agentanchor-sdk';

// Parse ACI string
const parsed = parseACI('a3i.acme.bot:ABF-L3@1.0.0');
console.log(parsed.domains);     // ['A', 'B', 'F']
console.log(parsed.level);       // 3
console.log(parsed.organization); // 'acme'

// Validate ACI
const result = validateACI('a3i.acme.bot:ABF-L3@1.0.0');
if (!result.valid) {
  console.error(result.errors);
}

// Generate ACI
const aci = generateACI({
  registry: 'a3i',
  organization: 'acme',
  agentClass: 'bot',
  domains: ['A', 'B', 'F'],
  level: CapabilityLevel.L3_EXECUTE,
  version: '1.0.0',
});
```

## Domain Codes

| Code | Domain | Description |
|------|--------|-------------|
| A | Administration | System admin, user management |
| B | Business | Business logic, workflows |
| C | Communications | Messaging, notifications |
| D | Data | Data processing, analytics |
| E | External | Third-party integrations |
| F | Finance | Payments, accounting |
| G | Governance | Policy, compliance |
| H | Hospitality | Venue, events, catering |
| I | Infrastructure | Compute, storage, network |
| S | Security | Auth, encryption, audit |

## Capability Levels

| Level | Name | Description |
|-------|------|-------------|
| L0 | Observe | Read-only access |
| L1 | Advise | Suggest/recommend |
| L2 | Draft | Prepare changes |
| L3 | Execute | Act with approval |
| L4 | Standard | External API access |
| L5 | Trusted | Cross-agent communication |
| L6 | Certified | Admin capabilities |
| L7 | Autonomous | Full autonomy |

## Trust Tiers

| Tier | Name | Score Range |
|------|------|-------------|
| T0 | Sandbox | 0-199 |
| T1 | Observed | 200-349 |
| T2 | Provisional | 350-499 |
| T3 | Monitored | 500-649 |
| T4 | Standard | 650-799 |
| T5 | Trusted | 800-875 |
| T6 | Certified | 876-950 |
| T7 | Autonomous | 951-1000 |

## Error Handling

```typescript
import { AgentAnchorError, SDKErrorCode } from '@vorionsys/agentanchor-sdk';

try {
  await anchor.getAgent('invalid-aci');
} catch (error) {
  if (error instanceof AgentAnchorError) {
    switch (error.code) {
      case SDKErrorCode.AGENT_NOT_FOUND:
        console.log('Agent does not exist');
        break;
      case SDKErrorCode.INVALID_ACI:
        console.log('Invalid ACI format');
        break;
      case SDKErrorCode.TRUST_INSUFFICIENT:
        console.log('Agent trust level too low');
        break;
      default:
        console.error(error.message);
    }
  }
}
```

## Configuration

```typescript
const anchor = new AgentAnchor({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.agentanchor.io', // Custom API URL
  timeout: 30000,                         // Request timeout (ms)
  retries: 3,                             // Retry attempts
  debug: false,                           // Enable debug logging
});
```

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions.

```typescript
import type {
  Agent,
  TrustScore,
  Attestation,
  ParsedACI,
} from '@vorionsys/agentanchor-sdk';
```

## Related Packages

- `@vorionsys/kaizen-sdk` - Governance engine SDK
- `@vorionsys/cognigate-sdk` - Full platform SDK

## License

MIT

## Links

- [Documentation](https://docs.agentanchor.io)
- [API Reference](https://api.agentanchor.io/docs)
- [GitHub](https://github.com/agentanchor/sdk)
- [Agent Anchor](https://agentanchor.io)
