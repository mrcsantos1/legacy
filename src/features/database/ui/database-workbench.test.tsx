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

    expect(await screen.findAllByText("Default Redis")).toHaveLength(2);
    const row = await screen.findByRole("button", { name: /inspect user:1/i });

    await userEvent.click(row);

    expect(await screen.findByDisplayValue("Ada")).toBeInTheDocument();
  });
});
