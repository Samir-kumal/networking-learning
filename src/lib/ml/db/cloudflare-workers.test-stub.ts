// Vitest-only stand-in for the `cloudflare:workers` module. Tests always pass their
// own in-memory database into the services, so the default binding is never read.
export const env = {} as Record<string, unknown>;
