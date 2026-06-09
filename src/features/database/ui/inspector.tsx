import type { ResourceInspection } from "@/shared/api/client";

import { Button } from "@/shared/ui/button";
import { TextInput } from "@/shared/ui/field";
import { Clock, KeyRound, Pencil, Trash2 } from "lucide-react";

import { formatTtl } from "./value-format";
import { EmptyState } from "./workbench-states";

interface InspectorPanelProps {
  readonly inspection: ResourceInspection | null;
  readonly isInspecting: boolean;
  readonly isMutating: boolean;
  readonly onDelete: () => void;
  readonly onExpire: () => void;
  readonly onTtlChange: (value: string) => void;
  readonly onUpdate: () => void;
  readonly ttlDraft: string;
}

export function InspectorPanel({
  inspection,
  isInspecting,
  isMutating,
  onDelete,
  onExpire,
  onTtlChange,
  onUpdate,
  ttlDraft
}: InspectorPanelProps) {
  if (isInspecting && !inspection) {
    return <div className="p-4 text-sm text-[#6F675C]">Loading resource</div>;
  }

  if (!inspection) {
    return (
      <EmptyState
        hint="Pick a record from the folder contents or the tree to inspect and edit it."
        icon={KeyRound}
        title="Select a key from the folder contents"
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="space-y-1 border-b border-[#C3BAAA] pb-4">
        <div className="truncate text-sm font-semibold" title={inspection.resource.name}>
          {inspection.resource.name}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6F675C]">
          <span>{inspection.resource.type}</span>
          <span>{inspection.resource.provider}</span>
          <span>{formatTtl(inspection.resource.ttlSeconds)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-[#C3BAAA] bg-[#FBF7EF] p-3 text-sm text-[#6F675C]">
        Value editing is shown in the central record view.
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <TextInput
          aria-label="TTL seconds"
          onChange={(event) => onTtlChange(event.target.value)}
          value={ttlDraft}
        />
        <Button
          disabled={isMutating}
          onClick={onExpire}
          title="Set a time-to-live in seconds"
        >
          <Clock aria-hidden="true" size={16} />
          Expire
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          disabled={isMutating}
          onClick={onUpdate}
          title="Save the edited value"
          variant="primary"
        >
          <Pencil aria-hidden="true" size={16} />
          Save
        </Button>
        <Button
          disabled={isMutating}
          onClick={onDelete}
          title="Delete this key"
          variant="danger"
        >
          <Trash2 aria-hidden="true" size={16} />
          Delete
        </Button>
      </div>

      <div className="mt-5 rounded-md border border-[#C3BAAA] bg-[#FBF7EF] p-3">
        <div className="mb-2 text-xs font-medium uppercase text-[#6F675C]">
          Metadata
        </div>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-[#4A504B]">
          {JSON.stringify(inspection.metadata, null, 2)}
        </pre>
      </div>
    </div>
  );
}
