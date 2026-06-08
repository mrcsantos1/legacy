import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  const originalRedisUrl = process.env.LEGACY_DEFAULT_REDIS_URL;

  afterEach(() => {
    process.env.LEGACY_DEFAULT_REDIS_URL = originalRedisUrl;
  });

  it("reports whether a default Redis connection is configured", async () => {
    process.env.LEGACY_DEFAULT_REDIS_URL = "";

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      configuredDefaultConnection: false,
      ok: true,
      service: "legacy"
    });
  });
});
