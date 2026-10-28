# @vorionsys/agentanchor-sdk

## 0.2.0

### Minor Changes

- d58c6f1: **Breaking:** `baseUrl` is now required, and the SDK no longer has a default host.

  Before this release, leaving out `baseUrl` sent every request, with your API key
  as a Bearer token, to a fixed default host (`https://api.agentanchor.io`) that
  you never chose. Now `new AgentAnchor()` throws `VALIDATION_ERROR` unless you
  pass an absolute `https` URL (plain `http` is accepted for `localhost` and
  `127.0.0.1` only). `DEFAULT_CONFIG` no longer contains `baseUrl`.

  To upgrade, pass the URL of the Agent Anchor API you actually use:

  ```ts
  new AgentAnchor({
    apiKey,
    baseUrl: "https://your-agent-anchor-host.example",
  });
  ```

## 0.1.1

### Patch Changes

- cdd7328: Extract `agentanchor-sdk` into its own standalone repository (`vorionsys/agentanchor-sdk`) with tokenless OIDC trusted publishing + provenance. Bump `@vorionsys/shared-constants` to `^2.0.0`. Relicensed Apache-2.0.

## 0.1.0

- Initial release
- Official SDK for Agent Anchor AI agent registry
- Trust scoring and attestation APIs
- CAR (Contextual Agent Record) support
- Zod-based schema validation
