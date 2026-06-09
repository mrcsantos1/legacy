import type { DataPreview, DataPreviewMeta } from "@/shared/api/client";

// Large value safety: initial render must stay compact/raw. Pretty JSON
// formatting happens only through an explicit user action in the viewer.
export function formatPreviewForEditing(value: DataPreview | undefined): string {
  if (!value) {
    return "";
  }

  switch (value.kind) {
    case "scalar":
      return value.value ?? "";
    case "object":
      return JSON.stringify(value.value);
    case "list":
      return JSON.stringify(value.value);
    case "zset":
      return JSON.stringify(value.value);
    case "unsupported":
      return value.message;
  }
}

export function describeValueDisplay(value: DataPreview | undefined): string {
  if (!value) {
    return "No value selected";
  }

  switch (value.kind) {
    case "scalar":
      return tryParseJson(value.value) !== null
        ? "Detected JSON string"
        : "Raw string";
    case "object":
      return "Redis hash object";
    case "list":
      return "Redis list/set";
    case "zset":
      return "Redis sorted set";
    case "unsupported":
      return "Unsupported preview";
  }
}

export function tryParseJson(value: string | null): unknown | null {
  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("{") && !trimmedValue.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return null;
  }
}

export function formatTtl(ttlSeconds: number | undefined): string {
  if (ttlSeconds === undefined) {
    return "-";
  }

  if (ttlSeconds < 0) {
    return "persistent";
  }

  return `${ttlSeconds}s`;
}

export function getResourceEmptyMessage(input: {
  readonly hasConnection: boolean;
  readonly hasSearch: boolean;
}): string {
  if (!input.hasConnection) {
    return "No connection selected";
  }

  if (input.hasSearch) {
    return "No matching records";
  }

  return "Folder is empty";
}

export function previewMetaOf(
  value: DataPreview | undefined
): DataPreviewMeta | undefined {
  if (!value || value.kind === "unsupported") {
    return undefined;
  }

  return value.meta;
}

export function formatByteSize(byteSize: number): string {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }

  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }

  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function describePreviewMeta(meta: DataPreviewMeta): string[] {
  const facts: string[] = [];

  if (meta.itemCount !== undefined) {
    facts.push(`${meta.itemCount} items`);
  }

  if (meta.byteSize !== undefined) {
    facts.push(formatByteSize(meta.byteSize));
  }

  if (meta.truncated) {
    facts.push("preview truncated");
  }

  return facts;
}
