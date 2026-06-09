import { describe, expect, it } from "vitest";

import type { ConnectionSummary, NamespaceNode } from "@/shared/api/client";

import {
  activeTabOf,
  initialWorkspaceState,
  workspaceReducer,
  type WorkspaceState
} from "./workspace";

function connection(id: string, label = id): ConnectionSummary {
  return {
    id,
    label,
    provider: "redis",
    source: "session",
    urlPreview: `redis://${id}`
  };
}

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

function openTab(state: WorkspaceState, id: string): WorkspaceState {
  return workspaceReducer(state, { id, label: id, type: "openTab" });
}

describe("workspaceReducer syncConnections", () => {
  it("creates a tab per connection and activates the first one", () => {
    const state = workspaceReducer(initialWorkspaceState, {
      connections: [connection("a"), connection("b")],
      type: "syncConnections"
    });

    expect(state.tabs.map((tab) => tab.id)).toEqual(["a", "b"]);
    expect(state.activeTabId).toBe("a");
  });

  it("preserves existing tab state and drops removed connections", () => {
    let state = workspaceReducer(initialWorkspaceState, {
      connections: [connection("a"), connection("b")],
      type: "syncConnections"
    });
    state = workspaceReducer(state, { id: "b", type: "activateTab" });
    state = workspaceReducer(state, { path: ["user"], type: "selectNamespace" });

    state = workspaceReducer(state, {
      connections: [connection("b")],
      type: "syncConnections"
    });

    expect(state.tabs.map((tab) => tab.id)).toEqual(["b"]);
    expect(state.activeTabId).toBe("b");
    expect(activeTabOf(state)?.namespacePath).toEqual(["user"]);
  });

  it("re-activates the first tab when the active connection disappears", () => {
    let state = workspaceReducer(initialWorkspaceState, {
      connections: [connection("a"), connection("b")],
      type: "syncConnections"
    });
    state = workspaceReducer(state, { id: "b", type: "activateTab" });

    state = workspaceReducer(state, {
      connections: [connection("a")],
      type: "syncConnections"
    });

    expect(state.activeTabId).toBe("a");
  });
});

describe("workspaceReducer tab lifecycle", () => {
  it("opens and activates a new tab, re-activating an existing one", () => {
    let state = openTab(initialWorkspaceState, "x");
    expect(state.activeTabId).toBe("x");

    state = openTab(state, "y");
    expect(state.activeTabId).toBe("y");

    state = openTab(state, "x");
    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe("x");
  });

  it("closes the active tab and selects a neighbor", () => {
    let state = workspaceReducer(initialWorkspaceState, {
      connections: [connection("a"), connection("b"), connection("c")],
      type: "syncConnections"
    });
    state = workspaceReducer(state, { id: "b", type: "activateTab" });

    state = workspaceReducer(state, { id: "b", type: "closeTab" });

    expect(state.tabs.map((tab) => tab.id)).toEqual(["a", "c"]);
    expect(state.activeTabId).toBe("c");
  });

  it("keeps the active tab when closing another one", () => {
    let state = workspaceReducer(initialWorkspaceState, {
      connections: [connection("a"), connection("b")],
      type: "syncConnections"
    });

    state = workspaceReducer(state, { id: "b", type: "closeTab" });

    expect(state.tabs.map((tab) => tab.id)).toEqual(["a"]);
    expect(state.activeTabId).toBe("a");
  });

  it("ignores activation of unknown tabs", () => {
    const state = openTab(initialWorkspaceState, "x");

    expect(workspaceReducer(state, { id: "z", type: "activateTab" })).toBe(
      state
    );
  });
});

describe("workspaceReducer active tab updates", () => {
  it("clears the selected resource when navigating to a folder", () => {
    let state = openTab(initialWorkspaceState, "a");
    state = workspaceReducer(state, { resourceId: "r1", type: "selectResource" });
    expect(activeTabOf(state)?.selectedResourceId).toBe("r1");

    state = workspaceReducer(state, { path: ["user"], type: "selectNamespace" });

    expect(activeTabOf(state)?.namespacePath).toEqual(["user"]);
    expect(activeTabOf(state)?.selectedResourceId).toBeNull();
  });

  it("accumulates merged namespace nodes", () => {
    let state = openTab(initialWorkspaceState, "a");
    state = workspaceReducer(state, {
      nodes: [folderNode("user", ["user"])],
      path: [],
      type: "mergeNamespaces"
    });
    state = workspaceReducer(state, {
      nodes: [recordNode("user:1", ["user", "1"], "r1")],
      path: ["user"],
      type: "mergeNamespaces"
    });

    expect(activeTabOf(state)?.namespaceNodes.map((node) => node.id)).toEqual([
      "user",
      "user:1"
    ]);
  });

  it("tracks the search draft and committed search separately", () => {
    let state = openTab(initialWorkspaceState, "a");
    state = workspaceReducer(state, { type: "setSearchDraft", value: "foo" });
    expect(activeTabOf(state)?.searchDraft).toBe("foo");
    expect(activeTabOf(state)?.search).toBe("");

    state = workspaceReducer(state, { type: "commitSearch", value: "foo" });
    expect(activeTabOf(state)?.search).toBe("foo");
  });

  it("purges stale resources and clears the selection when purged", () => {
    let state = openTab(initialWorkspaceState, "a");
    state = workspaceReducer(state, {
      nodes: [
        recordNode("user:1", ["user", "1"], "r1"),
        recordNode("user:2", ["user", "2"], "r2")
      ],
      path: [],
      type: "mergeNamespaces"
    });
    state = workspaceReducer(state, { resourceId: "r1", type: "selectResource" });

    state = workspaceReducer(state, {
      resourceIds: ["r1"],
      type: "purgeResources"
    });

    expect(
      activeTabOf(state)?.namespaceNodes.map((node) => node.resourceId)
    ).toEqual(["r2"]);
    expect(activeTabOf(state)?.selectedResourceId).toBeNull();
  });

  it("clears the selected resource on demand", () => {
    let state = openTab(initialWorkspaceState, "a");
    state = workspaceReducer(state, { resourceId: "r1", type: "selectResource" });

    state = workspaceReducer(state, { type: "clearSelectedResource" });

    expect(activeTabOf(state)?.selectedResourceId).toBeNull();
  });
});

describe("activeTabOf", () => {
  it("returns null when no tab is active", () => {
    expect(activeTabOf(initialWorkspaceState)).toBeNull();
  });
});
