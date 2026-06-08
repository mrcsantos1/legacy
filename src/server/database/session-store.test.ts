import { describe, expect, it } from "vitest";

import { SessionConnectionStore } from "./session-store";

describe("SessionConnectionStore", () => {
  it("stores raw credentials server-side and returns redacted summaries", () => {
    const store = new SessionConnectionStore();

    const summary = store.create("session-1", {
      database: 0,
      label: "Production Redis",
      provider: "redis",
      url: "redis://default:secret@example.com:6379/0"
    });

    expect(summary).toMatchObject({
      database: 0,
      id: expect.stringMatching(/^session:/),
      label: "Production Redis",
      provider: "redis",
      source: "session",
      urlPreview: "redis://default:***@example.com:6379/0"
    });

    expect(store.get("session-1", summary.id)).toMatchObject({
      label: "Production Redis",
      provider: "redis",
      url: "redis://default:secret@example.com:6379/0"
    });

    expect(store.list("session-1")).toEqual([summary]);
  });
});
