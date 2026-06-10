import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseApi } from "@/shared/api/client";

import { DatabaseWorkbench } from "./database-workbench";

function sessionConnections() {
  return {
    connections: [
      {
        id: "session:default",
        label: "Default Redis",
        provider: "redis" as const,
        source: "session" as const,
        urlPreview: "redis://localhost:6379"
      }
    ]
  };
}

function keyResource(id: string, name: string) {
  return {
    id,
    kind: "key" as const,
    name,
    path: name.split(":"),
    provider: "redis" as const,
    ttlSeconds: 60,
    type: "string"
  };
}

function folderNode(label: string) {
  return {
    depth: 0,
    hasChildren: true,
    id: label,
    kind: "folder" as const,
    label,
    path: [label]
  };
}

function scalarInspection(input: {
  readonly id: string;
  readonly name: string;
  readonly truncated?: boolean;
  readonly value: string;
}) {
  return {
    metadata: {},
    resource: {
      id: input.id,
      kind: "key" as const,
      name: input.name,
      path: input.name.split(":"),
      provider: "redis" as const,
      ttlSeconds: -1,
      type: "string"
    },
    value: {
      encoding: "utf8" as const,
      kind: "scalar" as const,
      meta: { truncated: input.truncated ?? false },
      value: input.value
    }
  };
}

describe("DatabaseWorkbench", () => {
  it("shows Docker networking guidance when a localhost Redis connection fails", async () => {
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("connect ECONNREFUSED 127.0.0.1:6379");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return { connections: [] };
      },
      async inspectResource() {
        throw new Error("not used");
      },
      async listNamespaces() {
        throw new Error("not used");
      },
      async listResources() {
        throw new Error("not used");
      },
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "host.docker.internal"
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "shared Docker network"
    );
  });

  it("renders connections, resource grid, and selected resource inspector", async () => {
    const api: DatabaseApi = {
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
    };

    render(<DatabaseWorkbench api={api} />);

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
    const api: DatabaseApi = {
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
    };

    render(<DatabaseWorkbench api={api} />);

    const recordNode = await screen.findByRole("button", {
      name: "Open record app-api:context:019595c5"
    });

    await userEvent.click(recordNode);

    expect(await screen.findByText("Record content")).toBeInTheDocument();
    expect(screen.getByText("Detected JSON string")).toBeInTheDocument();
    const editor = screen.getByLabelText("Record value");

    expect((editor as HTMLTextAreaElement).value).toBe(
      "{\"name\":\"W22Prime\",\"functions\":[{\"name\":\"Find Electrical Project Calculation System\"}]}"
    );

    await userEvent.click(screen.getByRole("button", { name: "Format" }));

    expect((editor as HTMLTextAreaElement).value).toContain(`"name": "W22Prime"`);
    expect((editor as HTMLTextAreaElement).value).toContain(`"functions": [`);
  });

  it("removes a stale tree record when opening it reports NotFoundError", async () => {
    let listNamespacesCalls = 0;
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
    const api: DatabaseApi = {
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
    };

    render(<DatabaseWorkbench api={api} />);

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

  it("counts down the selected record TTL without extra server calls", async () => {
    const inspectResource = vi.fn(async () => ({
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
    }));
    const api: DatabaseApi = {
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
    };

    render(<DatabaseWorkbench api={api} />);

    const row = await screen.findByRole("button", { name: /inspect user:1/i });
    await userEvent.click(row);

    expect(await screen.findAllByText("5s")).toHaveLength(2);

    // A stalled interval tick can skip past "4s" entirely, so the assertion
    // accepts any decremented value rather than one exact second.
    await waitFor(
      () => {
        expect(screen.getAllByText(/^[1-4]s$/)).toHaveLength(2);
      },
      { timeout: 10_000 }
    );
    expect(screen.queryByText("Loading resource")).not.toBeInTheDocument();
    // The countdown is client-side; one inspection call is all it takes.
    expect(inspectResource).toHaveBeenCalledTimes(1);
  }, 15_000);

  it("counts down resource table TTL while a folder is open", async () => {
    const listResources = vi.fn(async () => ({
      cursor: "0",
      resources: [
        {
          id: "user%3A1",
          kind: "key" as const,
          name: "user:1",
          path: ["user", "1"],
          provider: "redis" as const,
          ttlSeconds: 5,
          type: "string"
        }
      ]
    }));
    const api: DatabaseApi = {
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
    };

    render(<DatabaseWorkbench api={api} />);

    expect(await screen.findByText("5s")).toBeInTheDocument();

    // A stalled interval tick can skip past "4s" entirely, so the assertion
    // accepts any decremented value rather than one exact second.
    await waitFor(
      () => {
        expect(screen.getByText(/^[1-4]s$/)).toBeInTheDocument();
      },
      { timeout: 10_000 }
    );
    // The countdown is client-side; one scan call is all it takes.
    expect(listResources).toHaveBeenCalledTimes(1);
  }, 15_000);

  it("loads more records through the scan cursor", async () => {
    const listResources = vi.fn(async (input: { cursor?: string }) =>
      input.cursor === "5"
        ? { cursor: "0", resources: [keyResource("user%3A2", "user:2")] }
        : { cursor: "5", resources: [keyResource("user%3A1", "user:1")] }
    );
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      async inspectResource() {
        throw new Error("not used");
      },
      async listNamespaces() {
        return { cursor: "0", nodes: [] };
      },
      listResources,
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    expect(
      await screen.findByRole("button", { name: /inspect user:1/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Scan partial")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /inspect user:2/i })
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Load more records" })
    );

    expect(
      await screen.findByRole("button", { name: /inspect user:2/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /inspect user:1/i })
    ).toBeInTheDocument();
    expect(
      listResources.mock.calls.some((call) => call[0]?.cursor === "5")
    ).toBe(true);
    await waitFor(() => {
      expect(screen.getByText("Scan complete")).toBeInTheDocument();
    });
  });

  it("loads more folders through the namespace cursor", async () => {
    const listNamespaces = vi.fn(async (input: { cursor?: string }) =>
      input.cursor === "7"
        ? { cursor: "0", nodes: [folderNode("order")] }
        : { cursor: "7", nodes: [folderNode("user")] }
    );
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      async inspectResource() {
        throw new Error("not used");
      },
      listNamespaces,
      async listResources() {
        return { cursor: "0", resources: [] };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    expect(
      await screen.findByRole("button", { name: "Open folder user" })
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Load more folders" })
    );

    expect(
      await screen.findByRole("button", { name: "Open folder order" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open folder user" })
    ).toBeInTheDocument();
    expect(
      listNamespaces.mock.calls.some((call) => call[0]?.cursor === "7")
    ).toBe(true);
  });

  it("requests a larger preview on demand and resets it on selection change", async () => {
    const inspectResource = vi.fn(
      async (input: { limit?: number; resourceId: string }) =>
        scalarInspection({
          id: input.resourceId,
          name: input.resourceId === "user%3A1" ? "user:1" : "user:2",
          truncated: true,
          value: `${
            input.resourceId === "user%3A1" ? "first" : "second"
          }-limit-${input.limit ?? 0}`
        })
    );
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      inspectResource,
      async listNamespaces() {
        return { cursor: "0", nodes: [] };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: [
            keyResource("user%3A1", "user:1"),
            keyResource("user%3A2", "user:2")
          ]
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:1/i })
    );
    expect(
      await screen.findByDisplayValue("first-limit-100")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(
      await screen.findByDisplayValue("first-limit-200")
    ).toBeInTheDocument();
    expect(
      inspectResource.mock.calls.some((call) => call[0]?.limit === 200)
    ).toBe(true);

    await userEvent.click(
      screen.getByRole("button", { name: "Back to folder" })
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:2/i })
    );

    expect(
      await screen.findByDisplayValue("second-limit-100")
    ).toBeInTheDocument();
  });

  it("discards the previous inspection payload when the selection changes", async () => {
    let firstResourceCalls = 0;
    const inspectResource = vi.fn(async (input: { resourceId: string }) => {
      if (input.resourceId === "user%3A1") {
        firstResourceCalls += 1;
        return scalarInspection({
          id: "user%3A1",
          name: "user:1",
          value: firstResourceCalls === 1 ? "v1" : "v1-updated"
        });
      }

      return scalarInspection({ id: "user%3A2", name: "user:2", value: "v2" });
    });
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      inspectResource,
      async listNamespaces() {
        return { cursor: "0", nodes: [] };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: [
            keyResource("user%3A1", "user:1"),
            keyResource("user%3A2", "user:2")
          ]
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:1/i })
    );
    expect(await screen.findByDisplayValue("v1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Back to folder" })
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:2/i })
    );
    expect(await screen.findByDisplayValue("v2")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Back to folder" })
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:1/i })
    );

    // gcTime: 0 — the stale first payload must not flash back from cache.
    expect(screen.queryByDisplayValue("v1")).not.toBeInTheDocument();
    expect(await screen.findByDisplayValue("v1-updated")).toBeInTheDocument();
  });

  it("removes a vanished key from the table with a localized notice", async () => {
    let resourceCalls = 0;
    const listResources = vi.fn(
      (): Promise<{ cursor: string; resources: ReturnType<typeof keyResource>[] }> => {
        resourceCalls += 1;

        if (resourceCalls === 1) {
          return Promise.resolve({
            cursor: "0",
            resources: [keyResource("user%3Aghost", "user:ghost")]
          });
        }

        // The reconciling rescan stays pending: only the synchronous cache
        // update can make the ghost row disappear.
        return new Promise(() => undefined);
      }
    );
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      async inspectResource() {
        const error = new Error("Redis key not found: user:ghost");
        error.name = "NotFoundError";
        throw error;
      },
      async listNamespaces() {
        return {
          cursor: "0",
          nodes: [
            {
              depth: 0,
              hasChildren: false,
              id: "user:keep",
              kind: "record" as const,
              label: "keep",
              path: ["user", "keep"],
              resourceId: "user%3Akeep"
            }
          ]
        };
      },
      listResources,
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:ghost/i })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /inspect user:ghost/i })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(
        'Key "user:ghost" no longer exists and was removed from the list.'
      )
    ).toBeInTheDocument();
    // Recovery is targeted: the rest of the tree stays untouched.
    expect(
      screen.getByRole("button", { name: "Open record user:keep" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss stale key notice" })
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("treats a NotFound mutation as a stale key instead of a global error", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      async inspectResource() {
        return scalarInspection({ id: "user%3A1", name: "user:1", value: "Ada" });
      },
      async listNamespaces() {
        return { cursor: "0", nodes: [] };
      },
      async listResources() {
        return { cursor: "0", resources: [keyResource("user%3A1", "user:1")] };
      },
      async mutateResource() {
        const error = new Error("Redis key not found: user:1");
        error.name = "NotFoundError";
        throw error;
      }
    };

    render(<DatabaseWorkbench api={api} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /inspect user:1/i })
    );
    expect(await screen.findByDisplayValue("Ada")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText(
        'Key "user:1" no longer exists and was removed from the list.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Ada")).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("preserves visible rows while a refresh scan is pending", async () => {
    let resourceCalls = 0;
    const listResources = vi.fn(
      (): Promise<{ cursor: string; resources: ReturnType<typeof keyResource>[] }> => {
        resourceCalls += 1;

        if (resourceCalls === 1) {
          return Promise.resolve({
            cursor: "0",
            resources: [keyResource("user%3A1", "user:1")]
          });
        }

        return new Promise(() => undefined);
      }
    );
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      async inspectResource() {
        throw new Error("not used");
      },
      async listNamespaces() {
        return { cursor: "0", nodes: [] };
      },
      listResources,
      async mutateResource() {
        throw new Error("not used");
      }
    };

    const { container } = render(<DatabaseWorkbench api={api} />);

    expect(
      await screen.findByRole("button", { name: /inspect user:1/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    // The pending rescan must not blank the table; rows stay visible behind
    // a localized refresh indicator.
    await waitFor(() => {
      expect(container.querySelector("table")).toHaveClass("opacity-60");
    });
    expect(
      screen.getByRole("button", { name: /inspect user:1/i })
    ).toBeInTheDocument();
  });

  it("applies TTL color tiers with explanatory tooltips in the table", async () => {
    const api: DatabaseApi = {
      async createSessionConnection() {
        throw new Error("not used");
      },
      async deleteSessionConnection() {
        throw new Error("not used");
      },
      async getConnections() {
        return sessionConnections();
      },
      async inspectResource() {
        throw new Error("not used");
      },
      async listNamespaces() {
        return { cursor: "0", nodes: [] };
      },
      async listResources() {
        return {
          cursor: "0",
          resources: [
            { ...keyResource("user%3A1", "user:1"), ttlSeconds: 10 },
            { ...keyResource("user%3A2", "user:2"), ttlSeconds: -1 }
          ]
        };
      },
      async mutateResource() {
        throw new Error("not used");
      }
    };

    render(<DatabaseWorkbench api={api} />);

    const dangerBadge = await screen.findByTitle(
      "This key is about to expire."
    );
    expect(dangerBadge).toHaveClass("text-red-700");

    const persistentBadge = screen.getByTitle("This key has no expiration.");
    expect(persistentBadge).toHaveTextContent("persistent");
  });
});
