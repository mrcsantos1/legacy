import { allSettled, fork } from "effector";
import { describe, expect, it } from "vitest";

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
});
