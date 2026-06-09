import { allSettled, fork } from "effector";
import { describe, expect, it, vi } from "vitest";

import { createDatabaseModel } from "./database-model";

describe("database Effector model", () => {
  it("loads connections and auto-selects the first configured connection", async () => {
    const model = createDatabaseModel({
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return {
          connections: [
            {
              id: "env:redis:default",
              label: "Default Redis",
              provider: "redis",
              source: "environment",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource() {
        throw new Error("not used");
      },
      async listNamespaces() {
        return {
          cursor: "0",
          nodes: []
        };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: []
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    });
    const scope = fork();

    await allSettled(model.events.appStarted, { scope });

    expect(scope.getState(model.stores.$connections)).toHaveLength(1);
    expect(scope.getState(model.stores.$selectedConnectionId)).toBe(
      "env:redis:default"
    );
  });

  it("accumulates folder nodes and loads direct children for selected folders", async () => {
    const listResources = vi.fn(async () => ({
      cursor: "0",
      resources: []
    }));
    const model = createDatabaseModel({
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return {
          connections: [
            {
              id: "env:redis:default",
              label: "Default Redis",
              provider: "redis",
              source: "environment",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource() {
        throw new Error("not used");
      },
      async listNamespaces(input) {
        return input.path?.join(":") === "user"
          ? {
              cursor: "0",
              nodes: [
                {
                  depth: 1,
                  hasChildren: true,
                  id: "user:1000",
                  kind: "folder",
                  label: "1000",
                  path: ["user", "1000"]
                }
              ]
            }
          : {
              cursor: "0",
              nodes: [
                {
                  depth: 0,
                  hasChildren: true,
                  id: "user",
                  kind: "folder",
                  label: "user",
                  path: ["user"]
                }
              ]
            };
      },
      listResources,
      async mutateResource() {
        throw new Error("not used");
      }
    });
    const scope = fork();

    await allSettled(model.events.appStarted, { scope });
    await allSettled(model.events.namespaceSelected, {
      params: ["user"],
      scope
    });

    expect(scope.getState(model.stores.$namespaceNodes)).toEqual([
      {
        depth: 0,
        hasChildren: true,
        id: "user",
        kind: "folder",
        label: "user",
        path: ["user"]
      },
      {
        depth: 1,
        hasChildren: true,
        id: "user:1000",
        kind: "folder",
        label: "1000",
        path: ["user", "1000"]
      }
    ]);
    expect(listResources).toHaveBeenLastCalledWith({
      connectionId: "env:redis:default",
      count: 100,
      namespace: ["user"],
      scope: "children",
      search: ""
    });
  });

  it("clears selected resources when navigating to another folder", async () => {
    const model = createDatabaseModel({
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return {
          connections: [
            {
              id: "env:redis:default",
              label: "Default Redis",
              provider: "redis",
              source: "environment",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource(input) {
        return {
          metadata: { ttlSeconds: 60 },
          resource: {
            id: input.resourceId,
            kind: "key",
            name: "user:1000",
            path: ["user", "1000"],
            provider: "redis",
            ttlSeconds: 60,
            type: "string"
          },
          value: {
            encoding: "utf8",
            kind: "scalar",
            value: "Ada"
          }
        };
      },
      async listNamespaces() {
        return {
          cursor: "0",
          nodes: []
        };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: []
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    });
    const scope = fork();

    await allSettled(model.events.appStarted, { scope });
    await allSettled(model.events.resourceSelected, {
      params: "user%3A1000",
      scope
    });

    expect(scope.getState(model.stores.$selectedResourceId)).toBe("user%3A1000");

    await allSettled(model.events.namespaceSelected, {
      params: ["user"],
      scope
    });

    expect(scope.getState(model.stores.$selectedResourceId)).toBeNull();
    expect(scope.getState(model.stores.$inspection)).toBeNull();
  });

  it("refreshes namespaces and clears the selected resource after deleting it", async () => {
    const listNamespaces = vi
      .fn()
      .mockResolvedValueOnce({
        cursor: "0",
        nodes: [
          {
            depth: 0,
            hasChildren: false,
            id: "user:1",
            kind: "record",
            label: "1",
            path: ["user", "1"],
            resourceId: "user%3A1"
          }
        ]
      })
      .mockResolvedValue({
        cursor: "0",
        nodes: []
      });
    const model = createDatabaseModel({
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return {
          connections: [
            {
              id: "env:redis:default",
              label: "Default Redis",
              provider: "redis",
              source: "environment",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource(input) {
        return {
          metadata: { ttlSeconds: 60 },
          resource: {
            id: input.resourceId,
            kind: "key",
            name: "user:1",
            path: ["user", "1"],
            provider: "redis",
            ttlSeconds: 60,
            type: "string"
          },
          value: {
            encoding: "utf8",
            kind: "scalar",
            value: "Ada"
          }
        };
      },
      listNamespaces,
      async listResources() {
        return {
          cursor: "0",
          resources: []
        };
      },
      async mutateResource() {
        return {
          changedResourceIds: ["user%3A1"],
          status: "success"
        };
      }
    });
    const scope = fork();

    await allSettled(model.events.appStarted, { scope });
    await allSettled(model.events.resourceSelected, {
      params: "user%3A1",
      scope
    });
    await allSettled(model.effects.mutateResourceFx, {
      params: {
        connectionId: "env:redis:default",
        mutation: { action: "delete", resourceId: "user%3A1" }
      },
      scope
    });

    expect(scope.getState(model.stores.$selectedResourceId)).toBeNull();
    expect(scope.getState(model.stores.$inspection)).toBeNull();
    expect(scope.getState(model.stores.$namespaceNodes)).toEqual([]);
    expect(listNamespaces).toHaveBeenLastCalledWith({
      connectionId: "env:redis:default",
      count: 100,
      path: []
    });
  });

  it("refreshes namespaces and clears the selected resource after renaming it", async () => {
    const listNamespaces = vi
      .fn()
      .mockResolvedValueOnce({
        cursor: "0",
        nodes: [
          {
            depth: 0,
            hasChildren: false,
            id: "user:1",
            kind: "record",
            label: "1",
            path: ["user", "1"],
            resourceId: "user%3A1"
          }
        ]
      })
      .mockResolvedValue({
        cursor: "0",
        nodes: [
          {
            depth: 0,
            hasChildren: false,
            id: "user:2",
            kind: "record",
            label: "2",
            path: ["user", "2"],
            resourceId: "user%3A2"
          }
        ]
      });
    const model = createDatabaseModel({
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return {
          connections: [
            {
              id: "env:redis:default",
              label: "Default Redis",
              provider: "redis",
              source: "environment",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource(input) {
        return {
          metadata: { ttlSeconds: 60 },
          resource: {
            id: input.resourceId,
            kind: "key",
            name: "user:1",
            path: ["user", "1"],
            provider: "redis",
            ttlSeconds: 60,
            type: "string"
          },
          value: {
            encoding: "utf8",
            kind: "scalar",
            value: "Ada"
          }
        };
      },
      listNamespaces,
      async listResources() {
        return {
          cursor: "0",
          resources: []
        };
      },
      async mutateResource() {
        return {
          changedResourceIds: ["user%3A1", "user%3A2"],
          status: "success"
        };
      }
    });
    const scope = fork();

    await allSettled(model.events.appStarted, { scope });
    await allSettled(model.events.resourceSelected, {
      params: "user%3A1",
      scope
    });
    await allSettled(model.effects.mutateResourceFx, {
      params: {
        connectionId: "env:redis:default",
        mutation: {
          action: "rename",
          newName: "user:2",
          resourceId: "user%3A1"
        }
      },
      scope
    });

    expect(scope.getState(model.stores.$selectedResourceId)).toBeNull();
    expect(scope.getState(model.stores.$inspection)).toBeNull();
    expect(scope.getState(model.stores.$namespaceNodes)).toEqual([
      {
        depth: 0,
        hasChildren: false,
        id: "user:2",
        kind: "record",
        label: "2",
        path: ["user", "2"],
        resourceId: "user%3A2"
      }
    ]);
  });

  it("removes stale tree records when inspection reports NotFoundError", async () => {
    const listNamespaces = vi
      .fn()
      .mockResolvedValueOnce({
        cursor: "0",
        nodes: [
          {
            depth: 0,
            hasChildren: false,
            id: "user:ghost",
            kind: "record",
            label: "ghost",
            path: ["user", "ghost"],
            resourceId: "user%3Aghost"
          }
        ]
      })
      .mockResolvedValue({
        cursor: "0",
        nodes: []
      });
    const model = createDatabaseModel({
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return {
          connections: [
            {
              id: "env:redis:default",
              label: "Default Redis",
              provider: "redis",
              source: "environment",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource() {
        const error = new Error("Redis key not found: user:ghost");
        error.name = "NotFoundError";
        throw error;
      },
      listNamespaces,
      async listResources() {
        return {
          cursor: "0",
          resources: []
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    });
    const scope = fork();

    await allSettled(model.events.appStarted, { scope });
    await allSettled(model.events.resourceSelected, {
      params: "user%3Aghost",
      scope
    });

    expect(scope.getState(model.stores.$selectedResourceId)).toBeNull();
    expect(scope.getState(model.stores.$inspection)).toBeNull();
    expect(scope.getState(model.stores.$namespaceNodes)).toEqual([]);
    expect(listNamespaces).toHaveBeenLastCalledWith({
      connectionId: "env:redis:default",
      count: 100,
      path: []
    });
  });
});
