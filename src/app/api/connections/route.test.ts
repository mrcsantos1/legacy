import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/connections", () => {
  const originalRedisUrl = process.env.LEGACY_DEFAULT_REDIS_URL;

  afterEach(() => {
    process.env.LEGACY_DEFAULT_REDIS_URL = originalRedisUrl;
  });

  it("returns a redacted environment connection summary when configured", async () => {
    process.env.LEGACY_DEFAULT_REDIS_URL =
      "redis://default:secret@example.com:6379/0";

    const response = await GET(
      new Request("http://legacy.test/api/connections")
    );

    await expect(response.json()).resolves.toMatchObject({
      connections: [
        {
          id: "env:redis:default",
          label: "Default Redis",
          provider: "redis",
          source: "environment",
          urlPreview: "redis://default:***@example.com:6379/0"
        }
      ]
    });
  });
});
