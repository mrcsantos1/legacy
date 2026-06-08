import { describe, expect, it } from "vitest";

import {
  deriveNamespaceNodes,
  namespacePathToMatchPattern
} from "./namespace";

describe("Redis namespace helpers", () => {
  it("derives unique virtual namespace nodes from flat Redis keys", () => {
    const nodes = deriveNamespaceNodes({
      delimiter: ":",
      keys: [
        "user:1000:session",
        "user:1000:settings",
        "user:1001:profile",
        "cache:item"
      ],
      path: ["user"]
    });

    expect(nodes).toEqual([
      {
        depth: 1,
        hasChildren: true,
        id: "user:1000",
        label: "1000",
        path: ["user", "1000"]
      },
      {
        depth: 1,
        hasChildren: true,
        id: "user:1001",
        label: "1001",
        path: ["user", "1001"]
      }
    ]);
  });

  it("builds scan match patterns from namespace paths", () => {
    expect(namespacePathToMatchPattern([], ":")).toBe("*");
    expect(namespacePathToMatchPattern(["user"], ":")).toBe("user:*");
    expect(namespacePathToMatchPattern(["user", "1000"], ":")).toBe(
      "user:1000:*"
    );
  });
});
