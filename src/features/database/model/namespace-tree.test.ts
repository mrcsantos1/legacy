import { describe, expect, it } from "vitest";

import type {
  MutationRequest,
  NamespaceNode,
  ResourceDescriptor
} from "@/shared/api/client";

import {
  isNotFoundError,
  mergeNamespaceNodes,
  removeNamespaceNodesForResourceIds,
  removeResourcesForIds,
  resourceScopeForSearch,
  shouldClearSelectedResource,
  shouldPurgeChangedResources
} from "./namespace-tree";

function folderNode(id: string, path: string[]): NamespaceNode {
  return {
    depth: path.length - 1,
    hasChildren: true,
    id,
    kind: "folder",
    label: path[path.length - 1] ?? id,
    path
  };
}

function recordNode(
  id: string,
  path: string[],
  resourceId: string
): NamespaceNode {
  return {
    depth: path.length - 1,
    hasChildren: false,
    id,
    kind: "record",
    label: path[path.length - 1] ?? id,
    path,
    resourceId
  };
}

function resource(id: string): ResourceDescriptor {
  return {
    id,
    kind: "key",
    name: id,
    path: [id],
    provider: "redis",
    type: "string"
  };
}

describe("mergeNamespaceNodes", () => {
  it("accumulates child nodes loaded for different folders", () => {
    let nodes = mergeNamespaceNodes([], [], [folderNode("user", ["user"])]);
    nodes = mergeNamespaceNodes(nodes, ["user"], [
      recordNode("user:1", ["user", "1"], "r1")
    ]);

    expect(nodes.map((node) => node.id)).toEqual(["user", "user:1"]);
  });

  it("replaces the children of a folder when it is reloaded", () => {
    let nodes = mergeNamespaceNodes(
      [],
      [],
      [folderNode("a", ["a"]), folderNode("b", ["b"])]
    );

    nodes = mergeNamespaceNodes(nodes, [], [folderNode("a", ["a"])]);

    expect(nodes.map((node) => node.id)).toEqual(["a"]);
  });

  it("dedupes nodes by id and sorts by path", () => {
    const nodes = mergeNamespaceNodes(
      [],
      [],
      [folderNode("b", ["b"]), folderNode("a", ["a"]), folderNode("a", ["a"])]
    );

    expect(nodes.map((node) => node.id)).toEqual(["a", "b"]);
  });
});

describe("resourceScopeForSearch", () => {
  it("scopes to children without a search term", () => {
    expect(resourceScopeForSearch("")).toBe("children");
    expect(resourceScopeForSearch("   ")).toBe("children");
  });

  it("scopes to descendants when searching", () => {
    expect(resourceScopeForSearch("user")).toBe("descendants");
  });
});

describe("isNotFoundError", () => {
  it("detects NotFoundError instances", () => {
    const error = new Error("missing");
    error.name = "NotFoundError";

    expect(isNotFoundError(error)).toBe(true);
  });

  it("rejects other errors and non-errors", () => {
    expect(isNotFoundError(new Error("other"))).toBe(false);
    expect(isNotFoundError("NotFoundError")).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});

describe("shouldPurgeChangedResources", () => {
  it("purges on delete and rename", () => {
    expect(shouldPurgeChangedResources({ action: "delete" })).toBe(true);
    expect(shouldPurgeChangedResources({ action: "rename" })).toBe(true);
  });

  it("keeps resources on update, expire, and create", () => {
    expect(shouldPurgeChangedResources({ action: "update" })).toBe(false);
    expect(shouldPurgeChangedResources({ action: "expire" })).toBe(false);
    expect(shouldPurgeChangedResources({ action: "create" })).toBe(false);
  });
});

describe("shouldClearSelectedResource", () => {
  const deleteMutation: MutationRequest = {
    action: "delete",
    resourceId: "r1"
  };

  it("never clears for non-purging mutations", () => {
    expect(
      shouldClearSelectedResource(
        "r1",
        { action: "update", resourceId: "r1" },
        []
      )
    ).toBe(false);
  });

  it("clears when the selected resource is the mutated one", () => {
    expect(shouldClearSelectedResource("r1", deleteMutation, [])).toBe(true);
  });

  it("clears when the selected resource is reported as changed", () => {
    expect(
      shouldClearSelectedResource(
        "r1",
        { action: "delete", resourceId: "r2" },
        ["r1"]
      )
    ).toBe(true);
  });

  it("keeps an unrelated selection", () => {
    expect(
      shouldClearSelectedResource(
        "r1",
        { action: "delete", resourceId: "r2" },
        ["r3"]
      )
    ).toBe(false);
  });
});

describe("removeNamespaceNodesForResourceIds", () => {
  it("removes matching record nodes and keeps folders", () => {
    const nodes = [
      recordNode("user:1", ["user", "1"], "r1"),
      folderNode("user", ["user"]),
      recordNode("user:2", ["user", "2"], "r2")
    ];

    const result = removeNamespaceNodesForResourceIds(nodes, ["r1"]);

    expect(result.map((node) => node.id)).toEqual(["user", "user:2"]);
  });
});

describe("removeResourcesForIds", () => {
  it("filters out the given resource ids", () => {
    const result = removeResourcesForIds(
      [resource("r1"), resource("r2")],
      ["r1"]
    );

    expect(result.map((item) => item.id)).toEqual(["r2"]);
  });
});
