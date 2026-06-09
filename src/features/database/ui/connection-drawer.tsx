import type { FormEvent } from "react";

import type { RememberedConnection } from "@/features/database/model/remembered-connections";

import { Button } from "@/shared/ui/button";
import { FieldLabel, TextInput } from "@/shared/ui/field";
import { Clock, PlugZap, Server, Trash2 } from "lucide-react";

interface ConnectionDrawerProps {
  readonly isConnecting: boolean;
  readonly label: string;
  readonly onConnectRemembered: (entry: RememberedConnection) => void;
  readonly onForgetRemembered: (id: string) => void;
  readonly onLabelChange: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onUrlChange: (value: string) => void;
  readonly remembered: readonly RememberedConnection[];
  readonly url: string;
}

export function ConnectionDrawer({
  isConnecting,
  label,
  onConnectRemembered,
  onForgetRemembered,
  onLabelChange,
  onSubmit,
  onUrlChange,
  remembered,
  url
}: ConnectionDrawerProps) {
  return (
    <section className="border-b border-[#C3BAAA] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--legacy-ink)]">
        <Server aria-hidden="true" size={16} />
        Connections
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="connection-label">Label</FieldLabel>
          <TextInput
            id="connection-label"
            onChange={(event) => onLabelChange(event.target.value)}
            value={label}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="connection-url">Redis URL</FieldLabel>
          <TextInput
            id="connection-url"
            onChange={(event) => onUrlChange(event.target.value)}
            value={url}
          />
        </div>
        <Button
          className="w-full"
          disabled={isConnecting}
          type="submit"
          variant="primary"
        >
          <PlugZap aria-hidden="true" size={16} />
          Connect
        </Button>
      </form>

      {remembered.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6F675C]">
            <Clock aria-hidden="true" size={13} />
            Remembered
          </div>
          <ul className="space-y-1">
            {remembered.map((entry) => (
              <li
                className="flex items-center gap-1 rounded-md border border-transparent hover:bg-[#ECE3D6]"
                key={entry.id}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                  disabled={isConnecting}
                  onClick={() => onConnectRemembered(entry)}
                  title={`Connect to ${entry.label}`}
                  type="button"
                >
                  <PlugZap aria-hidden="true" className="shrink-0" size={14} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {entry.label}
                    </span>
                    <span className="block truncate text-xs text-[#6F675C]">
                      {entry.url}
                    </span>
                  </span>
                </button>
                <button
                  aria-label={`Forget ${entry.label}`}
                  className="rounded-md p-1.5 text-[#6F675C] transition hover:bg-[#E4D8C6] hover:text-[#7A2E22]"
                  onClick={() => onForgetRemembered(entry.id)}
                  title="Forget connection"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
