import { afterEach, describe, expect, it, vi } from "vitest";

import { getConnections, inspectResource, listResources } from "./client";

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

  it("serializes preview limit, bytes, and cursor when inspecting a resource", async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({
        metadata: {},
        resource: {
          id: "user%3A1",
          kind: "key",
          name: "user:1",
          path: ["user", "1"],
          provider: "redis",
          type: "string"
        },
        value: { encoding: "utf8", kind: "scalar", value: "Ada" }
      })
    );
    globalThis.fetch = fetchSpy;

    await inspectResource({
      bytes: 131072,
      connectionId: "env:redis:default",
      cursor: "7",
      limit: 200,
      resourceId: "user%3A1"
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/connections/env%3Aredis%3Adefault/resources/user%253A1?limit=200&bytes=131072&cursor=7",
      expect.objectContaining({ credentials: "same-origin" })
    );
  });

  it("preserves API error names for callers that need structured handling", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        {
          error: {
            message: "Redis key not found: user:ghost",
            name: "NotFoundError"
          }
        },
        { status: 404 }
      )
    );

    await expect(
      inspectResource({
        connectionId: "env:redis:default",
        resourceId: "user%3Aghost"
      })
    ).rejects.toMatchObject({
      message: "Redis key not found: user:ghost",
      name: "NotFoundError"
    });
  });
});
