import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
});
