import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createDatabaseModel } from "../model/database-model";
import { DatabaseWorkbench } from "./database-workbench";

describe("DatabaseWorkbench", () => {
  it("renders connections, resource grid, and selected resource inspector", async () => {
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
              id: "session:default",
              label: "Default Redis",
              provider: "redis",
              source: "session",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource() {
        return {
          metadata: { ttlSeconds: 60 },
          resource: {
            id: "user%3A1",
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
      async listNamespaces() {
        return {
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
      async listResources() {
        return {
          cursor: "0",
          resources: [
            {
              id: "user%3A1",
              kind: "key",
              name: "user:1",
              path: ["user", "1"],
              provider: "redis",
              ttlSeconds: 60,
              type: "string"
            }
          ]
        };
      },
      async mutateResource() {
        return {
          changedResourceIds: ["user%3A1"],
          status: "success"
        };
      }
    });

    render(<DatabaseWorkbench model={model} />);

    expect(await screen.findByLabelText("Legacy home")).toBeInTheDocument();
    expect(await screen.findByText("Folders")).toBeInTheDocument();
    expect(await screen.findByText("Archive Root")).toBeInTheDocument();
    expect(await screen.findAllByText("Default Redis")).toHaveLength(2);
    const row = await screen.findByRole("button", { name: /inspect user:1/i });

    await userEvent.click(row);

    expect(await screen.findByDisplayValue("Ada")).toBeInTheDocument();
    expect(screen.getByText("Record content")).toBeInTheDocument();
    expect(screen.getByText("Record Inspector")).toBeInTheDocument();
  });

  it("opens a leaf record from the folder tree in the central record view", async () => {
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
              id: "session:default",
              label: "Default Redis",
              provider: "redis",
              source: "session",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      async inspectResource() {
        return {
          metadata: { ttlSeconds: 67637 },
          resource: {
            id: "app-api%3Acontext%3A019595c5",
            kind: "key",
            name: "app-api:context:019595c5",
            path: ["app-api", "context", "019595c5"],
            provider: "redis",
            ttlSeconds: 67637,
            type: "string"
          },
          value: {
            encoding: "utf8",
            kind: "scalar",
            value: "{\"name\":\"W22Prime\",\"functions\":[{\"name\":\"Find Electrical Project Calculation System\"}]}"
          }
        };
      },
      async listNamespaces() {
        return {
          cursor: "0",
          nodes: [
            {
              depth: 2,
              hasChildren: false,
              id: "app-api:context:019595c5",
              kind: "record",
              label: "019595c5",
              path: ["app-api", "context", "019595c5"],
              resourceId: "app-api%3Acontext%3A019595c5"
            }
          ]
        };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: []
        };
      },
      async mutateResource() {
        return {
          changedResourceIds: ["app-api%3Acontext%3A019595c5"],
          status: "success"
        };
      }
    });

    render(<DatabaseWorkbench model={model} />);

    const recordNode = await screen.findByRole("button", {
      name: "Open record app-api:context:019595c5"
    });

    await userEvent.click(recordNode);

    expect(await screen.findByText("Record content")).toBeInTheDocument();
    expect(screen.getByText("Detected JSON string")).toBeInTheDocument();
    const editor = screen.getByLabelText("Record value");

    expect((editor as HTMLTextAreaElement).value).toContain(`"name": "W22Prime"`);
    expect((editor as HTMLTextAreaElement).value).toContain(`"functions": [`);
  });

  it("removes a stale tree record when opening it reports NotFoundError", async () => {
    const listNamespaces = async () => ({
      cursor: "0",
      nodes:
        listNamespacesCalls++ === 0
          ? [
              {
                depth: 0,
                hasChildren: false,
                id: "user:ghost",
                kind: "record" as const,
                label: "ghost",
                path: ["user", "ghost"],
                resourceId: "user%3Aghost"
              }
            ]
          : []
    });
    let listNamespacesCalls = 0;
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
              id: "session:default",
              label: "Default Redis",
              provider: "redis",
              source: "session",
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
        return {
          changedResourceIds: ["user%3Aghost"],
          status: "success"
        };
      }
    });

    render(<DatabaseWorkbench model={model} />);

    const staleNode = await screen.findByRole("button", {
      name: "Open record user:ghost"
    });

    await userEvent.click(staleNode);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Open record user:ghost" })
      ).not.toBeInTheDocument();
    });
  });

  it("updates the selected record TTL automatically without reselecting it", async () => {
    const inspectResource = vi
      .fn()
      .mockResolvedValueOnce({
        metadata: { ttlSeconds: 5 },
        resource: {
          id: "user%3A1",
          kind: "key" as const,
          name: "user:1",
          path: ["user", "1"],
          provider: "redis" as const,
          ttlSeconds: 5,
          type: "string"
        },
        value: {
          encoding: "utf8" as const,
          kind: "scalar" as const,
          value: "Ada"
        }
      })
      .mockResolvedValueOnce({
        metadata: { ttlSeconds: 4 },
        resource: {
          id: "user%3A1",
          kind: "key" as const,
          name: "user:1",
          path: ["user", "1"],
          provider: "redis" as const,
          ttlSeconds: 4,
          type: "string"
        },
        value: {
          encoding: "utf8" as const,
          kind: "scalar" as const,
          value: "Ada"
        }
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
              id: "session:default",
              label: "Default Redis",
              provider: "redis",
              source: "session",
              urlPreview: "redis://localhost:6379"
            }
          ]
        };
      },
      inspectResource,
      async listNamespaces() {
        return {
          cursor: "0",
          nodes: []
        };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: [
            {
              id: "user%3A1",
              kind: "key",
              name: "user:1",
              path: ["user", "1"],
              provider: "redis",
              ttlSeconds: 5,
              type: "string"
            }
          ]
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    });

    render(<DatabaseWorkbench model={model} />);

    const row = await screen.findByRole("button", { name: /inspect user:1/i });
    await userEvent.click(row);

    expect(await screen.findAllByText("5s")).toHaveLength(2);

    await waitFor(() => {
      expect(screen.getAllByText("4s")).toHaveLength(2);
    }, { timeout: 2000 });
    expect(screen.queryByText("Loading resource")).not.toBeInTheDocument();
    expect(inspectResource).toHaveBeenCalledTimes(2);
  });

  it("updates resource table TTL automatically while a folder is open", async () => {
    let resourceListCallCount = 0;
    const listResources = vi.fn(async () => ({
      cursor: "0",
      resources: [
        {
          id: "user%3A1",
          kind: "key" as const,
          name: "user:1",
          path: ["user", "1"],
          provider: "redis" as const,
          ttlSeconds: resourceListCallCount++ === 0 ? 5 : 4,
          type: "string"
        }
      ]
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
              id: "session:default",
              label: "Default Redis",
              provider: "redis",
              source: "session",
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
      listResources,
      async mutateResource() {
        throw new Error("not used");
      }
    });

    render(<DatabaseWorkbench model={model} />);

    expect(await screen.findByText("5s")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("4s")).toBeInTheDocument();
    }, { timeout: 2000 });
    expect(listResources).toHaveBeenCalledTimes(2);
  });
});
