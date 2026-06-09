import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("reports service health", async () => {
    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "legacy"
    });
  });
});
