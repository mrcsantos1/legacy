import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/connections", () => {
  const originalRedisUrl = process.env.LEGACY_DEFAULT_REDIS_URL;

  afterEach(() => {
    process.env.LEGACY_DEFAULT_REDIS_URL = originalRedisUrl;
  });

  it("returns no connections for a fresh session", async () => {
    const response = await GET(
      new Request("http://legacy.test/api/connections")
    );

    await expect(response.json()).resolves.toEqual({ connections: [] });
  });

  it("never derives a connection from Redis environment variables", async () => {
    process.env.LEGACY_DEFAULT_REDIS_URL =
      "redis://default:secret@example.com:6379/0";

    const response = await GET(
      new Request("http://legacy.test/api/connections")
    );

    await expect(response.json()).resolves.toEqual({ connections: [] });
  });
});
