import { describe, expect, it } from "vitest";

import {
  deriveNamespaceNodes,
  filterResourceKeysByScope,
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
        kind: "folder",
        label: "1000",
        path: ["user", "1000"]
      },
      {
        depth: 1,
        hasChildren: true,
        id: "user:1001",
        kind: "folder",
        label: "1001",
        path: ["user", "1001"]
      }
    ]);
  });

  it("classifies namespace nodes as folders, records, or hybrids", () => {
    const nodes = deriveNamespaceNodes({
      delimiter: ":",
      keys: [
        "app-api:context:019595c5",
        "app-api:context:folder:child",
        "app-api:context:hybrid",
        "app-api:context:hybrid:child"
      ],
      path: ["app-api", "context"]
    });

    expect(nodes).toEqual([
      {
        depth: 2,
        hasChildren: true,
        id: "app-api:context:folder",
        kind: "folder",
        label: "folder",
        path: ["app-api", "context", "folder"]
      },
      {
        depth: 2,
        hasChildren: true,
        id: "app-api:context:hybrid",
        kind: "hybrid",
        label: "hybrid",
        path: ["app-api", "context", "hybrid"],
        resourceId: "app-api%3Acontext%3Ahybrid"
      },
      {
        depth: 2,
        hasChildren: false,
        id: "app-api:context:019595c5",
        kind: "record",
        label: "019595c5",
        path: ["app-api", "context", "019595c5"],
        resourceId: "app-api%3Acontext%3A019595c5"
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

  it("separates direct folder children from deeper descendants", () => {
    const keys = [
      "system",
      "user:1000:name",
      "user:1000:session:token",
      "user:1000:session:expires",
      "user:1001:name"
    ];

    expect(
      filterResourceKeysByScope({
        delimiter: ":",
        keys,
        namespace: ["user", "1000"],
        scope: "children"
      })
    ).toEqual(["user:1000:name"]);

    expect(
      filterResourceKeysByScope({
        delimiter: ":",
        keys,
        namespace: ["user", "1000"],
        scope: "descendants"
      })
    ).toEqual([
      "user:1000:name",
      "user:1000:session:token",
      "user:1000:session:expires"
    ]);
  });
});
