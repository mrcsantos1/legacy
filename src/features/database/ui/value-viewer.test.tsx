import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { DataPreviewMeta, ResourceInspection } from "@/shared/api/client";

import { ValueViewer } from "./value-viewer";

function inspectionWith(
  value: string,
  meta?: DataPreviewMeta
): ResourceInspection {
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
    value: { encoding: "utf8", kind: "scalar", meta, value }
  };
}

function renderViewer(input: {
  readonly canLoadMore?: boolean;
  readonly inspection: ResourceInspection;
  readonly onLoadMore?: () => void;
  readonly value: string;
}) {
  const editorRef = createRef<HTMLTextAreaElement>();

  render(
    <ValueViewer
      canLoadMore={input.canLoadMore ?? false}
      editorDefaultValue={input.value}
      editorKey="k1:p1"
      editorRef={editorRef}
      inspection={input.inspection}
      isLoadingMore={false}
      onLoadMore={input.onLoadMore ?? (() => undefined)}
      valueDisplayLabel="Detected JSON string"
    />
  );

  return editorRef;
}

describe("ValueViewer", () => {
  it("formats a JSON value on demand and exposes Pretty/Copy actions", async () => {
    renderViewer({
      inspection: inspectionWith('{"a":1}'),
      value: '{"a":1}'
    });

    const editor = screen.getByLabelText("Record value") as HTMLTextAreaElement;
    expect(editor.value).toBe('{"a":1}');
    expect(screen.getByRole("button", { name: "Pretty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Format" }));

    expect(editor.value).toContain(`"a": 1`);
  });

  it("collapses a formatted JSON value back to compact text", async () => {
    renderViewer({
      inspection: inspectionWith('{"a":1}'),
      value: '{"a":1}'
    });

    const editor = screen.getByLabelText("Record value") as HTMLTextAreaElement;
    await userEvent.click(screen.getByRole("button", { name: "Format" }));
    expect(editor.value).toContain(`"a": 1`);

    await userEvent.click(screen.getByRole("button", { name: "Collapse" }));

    expect(editor.value).toBe('{"a":1}');
  });

  it("hides JSON-only actions for plain string values", () => {
    renderViewer({
      inspection: inspectionWith("Ada"),
      value: "Ada"
    });

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

  it("warns about truncated previews and loads more on demand", async () => {
    const onLoadMore = vi.fn();
    renderViewer({
      canLoadMore: true,
      inspection: inspectionWith("partial", {
        byteSize: 1024 * 1024,
        truncated: true
      }),
      onLoadMore,
      value: "partial"
    });

    expect(screen.getByRole("status")).toHaveTextContent("Preview only");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("keeps the truncation warning when the page limit is reached", () => {
    renderViewer({
      canLoadMore: false,
      inspection: inspectionWith("partial", { truncated: true }),
      value: "partial"
    });

    expect(screen.getByRole("status")).toHaveTextContent("Preview only");
    expect(
      screen.queryByRole("button", { name: "Load more" })
    ).not.toBeInTheDocument();
  });

  it("does not warn when the preview is complete", () => {
    renderViewer({
      inspection: inspectionWith("Ada", { truncated: false }),
      value: "Ada"
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" })
    ).not.toBeInTheDocument();
  });
});
