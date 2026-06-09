import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import type { ResourceInspection } from "@/shared/api/client";

import { ValueViewer } from "./value-viewer";

function inspectionWith(value: string): ResourceInspection {
  return {
    metadata: {},
    resource: {
      id: "k1",
      kind: "key",
      name: "cfg:1",
      path: ["cfg", "1"],
      provider: "redis",
      ttlSeconds: -1,
      type: "string"
    },
    value: { encoding: "utf8", kind: "scalar", value }
  };
}

describe("ValueViewer", () => {
  it("formats a JSON value on demand and exposes Pretty/Copy actions", async () => {
    const editorRef = createRef<HTMLTextAreaElement>();

    render(
      <ValueViewer
        editorDefaultValue={'{"a":1}'}
        editorRef={editorRef}
        inspection={inspectionWith('{"a":1}')}
        valueDisplayLabel="Detected JSON string"
      />
    );

    const editor = screen.getByLabelText("Record value") as HTMLTextAreaElement;
    expect(editor.value).toBe('{"a":1}');
    expect(screen.getByRole("button", { name: "Pretty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Format" }));

    expect(editor.value).toContain(`"a": 1`);
  });

  it("hides JSON-only actions for plain string values", () => {
    const editorRef = createRef<HTMLTextAreaElement>();

    render(
      <ValueViewer
        editorDefaultValue="Ada"
        editorRef={editorRef}
        inspection={inspectionWith("Ada")}
        valueDisplayLabel="Raw string"
      />
    );

    const editor = screen.getByLabelText("Record value") as HTMLTextAreaElement;
    expect(editor.value).toBe("Ada");
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Format" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pretty" })
    ).not.toBeInTheDocument();
  });
});
