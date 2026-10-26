---
"@vorionsys/agentanchor-sdk": minor
---

**Breaking:** `baseUrl` is now required, and the SDK no longer has a default host.

Before this release, leaving out `baseUrl` sent every request, with your API key
as a Bearer token, to a fixed default host (`https://api.agentanchor.io`) that
you never chose. Now `new AgentAnchor()` throws `VALIDATION_ERROR` unless you
pass an absolute `https` URL (plain `http` is accepted for `localhost` and
`127.0.0.1` only). `DEFAULT_CONFIG` no longer contains `baseUrl`.

To upgrade, pass the URL of the Agent Anchor API you actually use:

```ts
new AgentAnchor({ apiKey, baseUrl: "https://your-agent-anchor-host.example" });
```
