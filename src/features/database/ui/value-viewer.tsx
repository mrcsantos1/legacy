import type { RefObject } from "react";

import type { ResourceInspection } from "@/shared/api/client";

import { clsx } from "clsx";
import { Braces, Check, Code, Copy, Pencil } from "lucide-react";
import { useState } from "react";

import {
    describePreviewMeta,
    formatTtl,
    previewMetaOf,
    tryParseJson
} from "./value-format";

interface ValueViewerProps {
  readonly editorDefaultValue: string;
  readonly editorRef: RefObject<HTMLTextAreaElement | null>;
  readonly inspection: ResourceInspection;
  readonly valueDisplayLabel: string;
}

type ValueView = "edit" | "pretty";

export function ValueViewer({
  editorDefaultValue,
  editorRef,
  inspection,
  valueDisplayLabel
}: ValueViewerProps) {
  const [view, setView] = useState<ValueView>("edit");
  const [copied, setCopied] = useState(false);

  const canPretty = tryParseJson(editorDefaultValue) !== null;
  const activeView: ValueView = canPretty ? view : "edit";
  const meta = previewMetaOf(inspection.value);
  const metaFacts = meta ? describePreviewMeta(meta) : [];

  function currentText(): string {
    return editorRef.current?.value ?? editorDefaultValue;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(currentText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the copy action is best-effort.
    }
  }

  function handleFormat() {
    const parsed = tryParseJson(currentText());

    if (parsed === null || !editorRef.current) {
      return;
    }

    editorRef.current.value = JSON.stringify(parsed, null, 2);
    setView("edit");
  }

  return (
    <div className="flex min-h-full flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" title={inspection.resource.name}>
            {inspection.resource.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6F675C]">
            <span>{inspection.resource.type}</span>
            <span>{inspection.resource.provider}</span>
            <span>{formatTtl(inspection.resource.ttlSeconds)}</span>
            {metaFacts.map((fact) => (
              <span
                className="rounded border border-[#C3BAAA] px-1.5 py-0.5"
                key={fact}
              >
                {fact}
              </span>
            ))}
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#C3BAAA] bg-[#F7F1E8] px-2 py-1 text-xs text-[#6F675C]"
          title="How Legacy interpreted this value"
        >
          <Code aria-hidden="true" size={13} />
          {valueDisplayLabel}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        {canPretty ? (
          <div
            aria-label="Value view"
            className="inline-flex overflow-hidden rounded-md border border-[#C3BAAA]"
            role="group"
          >
            <ViewTab
              icon={<Pencil aria-hidden="true" size={13} />}
              isActive={activeView === "edit"}
              label="Edit"
              onClick={() => setView("edit")}
            />
            <ViewTab
              icon={<Braces aria-hidden="true" size={13} />}
              isActive={activeView === "pretty"}
              label="Pretty"
              onClick={() => setView("pretty")}
            />
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1">
          {canPretty ? (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-[#C3BAAA] bg-[#FBF7EF] px-2 py-1 text-xs text-[var(--legacy-ink)] transition hover:bg-[#EFE6D8]"
              onClick={handleFormat}
              title="Format value as indented JSON"
              type="button"
            >
              <Braces aria-hidden="true" size={13} />
              Format
            </button>
          ) : null}
          <button
            className="inline-flex items-center gap-1 rounded-md border border-[#C3BAAA] bg-[#FBF7EF] px-2 py-1 text-xs text-[var(--legacy-ink)] transition hover:bg-[#EFE6D8]"
            onClick={handleCopy}
            title="Copy value to clipboard"
            type="button"
          >
            {copied ? (
              <Check aria-hidden="true" size={13} />
            ) : (
              <Copy aria-hidden="true" size={13} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <textarea
        aria-label="Record value"
        className={clsx(
          "min-h-[480px] flex-1 resize-none rounded-md border border-[#C3BAAA] bg-[#111412] p-4 font-mono text-sm leading-6 text-[#D6D0C4] outline-none focus:border-[var(--legacy-rust)] focus:ring-2 focus:ring-[#E8C4AA]",
          activeView !== "edit" && "hidden"
        )}
        defaultValue={editorDefaultValue}
        key={inspection.resource.id}
        ref={editorRef}
        spellCheck={false}
      />

      {activeView === "pretty" ? (
        <pre className="min-h-[480px] flex-1 overflow-auto rounded-md border border-[#C3BAAA] bg-[#111412] p-4 font-mono text-sm leading-6 text-[#D6D0C4]">
          {formatPretty(editorDefaultValue)}
        </pre>
      ) : null}
    </div>
  );
}

function ViewTab({
  icon,
  isActive,
  label,
  onClick
}: {
  readonly icon: React.ReactNode;
  readonly isActive: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-1 text-xs transition",
        isActive
          ? "bg-[var(--legacy-charcoal)] text-[var(--legacy-concrete)]"
          : "bg-[#FBF7EF] text-[var(--legacy-ink)] hover:bg-[#EFE6D8]"
      )}
      onClick={onClick}
      title={`${label} view`}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function formatPretty(text: string): string {
  const parsed = tryParseJson(text);

  if (parsed === null) {
    return text;
  }

  return JSON.stringify(parsed, null, 2);
}
