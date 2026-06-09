import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { DatabaseApi } from "@/shared/api/client";

import { DatabaseWorkbench } from "./database-workbench";

function emptyApi(): DatabaseApi {
  return {
    async createSessionConnection() {
      throw new Error("not used");
    },
    async deleteSessionConnection() {
      return { deleted: true };
    },
    async getConnections() {
      return { connections: [] };
    },
    async inspectResource() {
      throw new Error("not used");
    },
    async listNamespaces() {
      return { cursor: "0", nodes: [] };
    },
    async listResources() {
      return { cursor: "0", resources: [] };
    },
    async mutateResource() {
      throw new Error("not used");
    }
  };
}

describe("DatabaseWorkbench layout", () => {
  it("collapses and expands the inspector panel", async () => {
    render(<DatabaseWorkbench api={emptyApi()} />);

    expect(await screen.findByText("Record Inspector")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Inspector" })
    );

    expect(screen.queryByText("Record Inspector")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Expand Inspector" })
    );

    expect(screen.getByText("Record Inspector")).toBeInTheDocument();
  });

  it("collapses and expands the workspace panel", async () => {
    render(<DatabaseWorkbench api={emptyApi()} />);

    expect(await screen.findByText("Folders")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Workspace" })
    );

    expect(screen.queryByText("Folders")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Expand Workspace" })
    );

    expect(screen.getByText("Folders")).toBeInTheDocument();
  });
});
