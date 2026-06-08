import { afterEach, describe, expect, it, vi } from "vitest";

import { getConnections, listResources } from "./client";

describe("shared API client", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("loads generic connection summaries", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        connections: [
          {
            id: "env:redis:default",
            label: "Default Redis",
            provider: "redis",
            source: "environment",
            urlPreview: "redis://localhost:6379"
          }
        ]
      })
    );

    await expect(getConnections()).resolves.toMatchObject({
      connections: [{ provider: "redis", source: "environment" }]
    });
  });

  it("serializes namespace, search, cursor, and count when listing resources", async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({
        cursor: "0",
        resources: []
      })
    );
    globalThis.fetch = fetchSpy;

    await listResources({
      connectionId: "env:redis:default",
      count: 50,
      cursor: "12",
      namespace: ["user", "1000"],
      search: "session"
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/connections/env%3Aredis%3Adefault/resources?namespace=user%3A1000&search=session&cursor=12&count=50",
      expect.objectContaining({ credentials: "same-origin" })
    );
  });
});
