"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  ChevronRight,
  Clock,
  Code,
  Database,
  FileText,
  Folder,
  FolderOpen,
  KeyRound,
  Pencil,
  PlugZap,
  RefreshCw,
  Search,
  Server,
  Trash2
} from "lucide-react";
import { useUnit } from "effector-react";
import {
  FormEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { clsx } from "clsx";

import {
  createDatabaseModel,
  databaseModel
} from "@/features/database/model/database-model";
import type {
  DataPreview,
  NamespaceNode,
  ResourceDescriptor,
  ResourceInspection
} from "@/shared/api/client";
import { Button } from "@/shared/ui/button";
import { FieldLabel, TextInput } from "@/shared/ui/field";
import { LegacyLogo } from "@/shared/ui/legacy-logo";

type DatabaseModel = ReturnType<typeof createDatabaseModel>;

interface DatabaseWorkbenchProps {
  readonly model?: DatabaseModel;
}

export function DatabaseWorkbench({
  model = databaseModel
}: DatabaseWorkbenchProps) {
  const units = useUnit({
    appStarted: model.events.appStarted,
    connectionSelected: model.events.connectionSelected,
    connections: model.stores.$connections,
    createSessionConnection: model.effects.createSessionConnectionFx,
    error: model.stores.$error,
    inspection: model.stores.$inspection,
    isConnecting: model.stores.$isConnecting,
    isInspecting: model.stores.$isInspecting,
    isLoadingConnections: model.stores.$isLoadingConnections,
    isLoadingNamespaces: model.stores.$isLoadingNamespaces,
    isLoadingResources: model.stores.$isLoadingResources,
    isMutating: model.stores.$isMutating,
    mutateResource: model.effects.mutateResourceFx,
    namespaceNodes: model.stores.$namespaceNodes,
    namespaceSelected: model.events.namespaceSelected,
    resourceCursor: model.stores.$resourceCursor,
    resourceSelected: model.events.resourceSelected,
    resources: model.stores.$resources,
    resourcesRefreshed: model.events.resourcesRefreshed,
    search: model.stores.$search,
    searchChanged: model.events.searchChanged,
    selectedConnection: model.stores.$selectedConnection,
    selectedConnectionId: model.stores.$selectedConnectionId,
    selectedNamespacePath: model.stores.$selectedNamespacePath,
    selectedResourceId: model.stores.$selectedResourceId,
    visibleDataRefreshed: model.events.visibleDataRefreshed
  });
  const [label, setLabel] = useState("Local Redis");
  const [url, setUrl] = useState("redis://localhost:6379");
  const [searchDraft, setSearchDraft] = useState("");
  const [ttlDraft, setTtlDraft] = useState("300");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const { appStarted, selectedConnectionId, visibleDataRefreshed } = units;

  useEffect(() => {
    appStarted();
  }, [appStarted]);

  useEffect(() => {
    if (!selectedConnectionId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      visibleDataRefreshed();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [selectedConnectionId, visibleDataRefreshed]);

  const visibleResources = useMemo(
    () => units.resources.slice(0, 200),
    [units.resources]
  );
  const selectedFolderLabel =
    units.selectedNamespacePath.length > 0
      ? units.selectedNamespacePath.join(" / ")
      : "Root level records";
  const selectedFolderKey = units.selectedNamespacePath.join(":");
  const emptyResourceMessage = getResourceEmptyMessage({
    hasConnection: units.selectedConnectionId !== null,
    hasSearch: units.search.trim().length > 0
  });
  const scanStatus =
    units.resourceCursor === "0" ? "Scan complete" : "Scan partial";
  const hasSelectedRecord = units.inspection !== null;
  const recordEditorValue = formatPreviewForEditing(units.inspection?.value);
  const valueDisplayLabel = describeValueDisplay(units.inspection?.value);

  function handleCreateConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void units.createSessionConnection({
      label,
      provider: "redis",
      url
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    units.searchChanged(searchDraft);
    units.resourcesRefreshed();
  }

  function handleNamespaceNodeClick(node: NamespaceNode) {
    if (node.kind === "record" && node.resourceId) {
      units.resourceSelected(node.resourceId);
      return;
    }

    units.namespaceSelected(node.path);
  }

  function handleHybridRecordClick(node: NamespaceNode) {
    if (node.resourceId) {
      units.resourceSelected(node.resourceId);
    }
  }

  function handleUpdate() {
    if (!units.selectedConnectionId || !units.inspection) {
      return;
    }

    void units.mutateResource({
      connectionId: units.selectedConnectionId,
      mutation: {
        action: "update",
        resourceId: units.inspection.resource.id,
        value:
          editorRef.current?.value ??
          formatPreviewForEditing(units.inspection.value)
      }
    });
  }

  function handleExpire() {
    if (!units.selectedConnectionId || !units.inspection) {
      return;
    }

    const ttlSeconds = Number(ttlDraft);

    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      return;
    }

    void units.mutateResource({
      connectionId: units.selectedConnectionId,
      mutation: {
        action: "expire",
        resourceId: units.inspection.resource.id,
        ttlSeconds
      }
    });
  }

  function handleDelete() {
    if (!units.selectedConnectionId || !units.inspection) {
      return;
    }

    const confirmed = window.confirm(
      `Delete Redis key "${units.inspection.resource.name}"?`
    );

    if (!confirmed) {
      return;
    }

    void units.mutateResource({
      connectionId: units.selectedConnectionId,
      mutation: {
        action: "delete",
        resourceId: units.inspection.resource.id
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--legacy-panel)] text-[var(--legacy-ink)]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#2C302C] bg-[var(--legacy-charcoal)] px-4">
        <LegacyLogo />
        <Button
          disabled={units.isLoadingResources || !units.selectedConnectionId}
          onClick={() => units.visibleDataRefreshed()}
          title="Refresh resources"
          variant="secondary"
        >
          <RefreshCw aria-hidden="true" size={16} />
          Refresh
        </Button>
      </header>

      {units.error ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <AlertTriangle aria-hidden="true" size={16} />
          <span>{units.error}</span>
        </div>
      ) : null}

      <section className="grid min-h-0 flex-1 grid-cols-[310px_minmax(0,1fr)_380px] overflow-hidden">
        <aside className="flex min-h-0 flex-col border-r border-[#C3BAAA] bg-[#F7F1E8]">
          <section className="border-b border-[#C3BAAA] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--legacy-ink)]">
              <Server aria-hidden="true" size={16} />
              Connections
            </div>
            <form className="space-y-3" onSubmit={handleCreateConnection}>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="connection-label">Label</FieldLabel>
                <TextInput
                  id="connection-label"
                  onChange={(event) => setLabel(event.target.value)}
                  value={label}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="connection-url">Redis URL</FieldLabel>
                <TextInput
                  id="connection-url"
                  onChange={(event) => setUrl(event.target.value)}
                  value={url}
                />
              </div>
              <Button
                className="w-full"
                disabled={units.isConnecting}
                type="submit"
                variant="primary"
              >
                <PlugZap aria-hidden="true" size={16} />
                Connect
              </Button>
            </form>
          </section>

          <section className="min-h-0 flex-1 overflow-y-auto p-3">
            {units.isLoadingConnections ? (
              <p className="px-2 py-3 text-sm text-[#6F675C]">Loading connections</p>
            ) : null}
            <div className="space-y-1">
              {units.connections.map((connection) => (
                <button
                  className={clsx(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition",
                    units.selectedConnectionId === connection.id
                      ? "border border-[#D7A077] bg-[#F2DCCB] text-[#58301A]"
                      : "border border-transparent hover:bg-[#ECE3D6]"
                  )}
                  key={connection.id}
                  onClick={() => units.connectionSelected(connection.id)}
                  type="button"
                >
                  <Database aria-hidden="true" className="mt-0.5" size={15} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {connection.label}
                    </span>
                    <span className="block truncate text-xs text-[#6F675C]">
                      {connection.urlPreview}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Archive aria-hidden="true" size={16} />
                Folders
              </div>
              {units.isLoadingNamespaces ? (
                <span className="text-xs text-[#6F675C]">Loading</span>
              ) : null}
            </div>

            <button
              className={clsx(
                "mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                units.selectedNamespacePath.length === 0
                  ? "bg-[var(--legacy-charcoal)] text-[var(--legacy-concrete)]"
                  : "hover:bg-[#ECE3D6]"
              )}
              onClick={() => units.namespaceSelected([])}
              type="button"
            >
              <KeyRound aria-hidden="true" size={15} />
              Archive Root
            </button>

            <div className="mt-1 space-y-1">
              {units.namespaceNodes.map((node) => (
                <div
                  className="flex items-center gap-1"
                  key={node.id}
                  style={{ paddingLeft: `${8 + node.depth * 14}px` }}
                >
                  <button
                    aria-label={namespaceNodeActionLabel(node)}
                    className={clsx(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                      isNamespaceNodeSelected({
                        node,
                        selectedFolderKey,
                        selectedResourceId: units.selectedResourceId
                      })
                        ? "bg-[var(--legacy-charcoal)] text-[var(--legacy-concrete)]"
                        : "hover:bg-[#ECE3D6]"
                    )}
                    onClick={() => handleNamespaceNodeClick(node)}
                    type="button"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={clsx(
                        "shrink-0 opacity-60",
                        node.kind === "record" && "invisible"
                      )}
                      size={13}
                    />
                    <NamespaceNodeIcon
                      isSelected={isNamespaceNodeSelected({
                        node,
                        selectedFolderKey,
                        selectedResourceId: units.selectedResourceId
                      })}
                      node={node}
                    />
                    <span className="truncate">{node.label}</span>
                  </button>

                  {node.kind === "hybrid" ? (
                    <button
                      aria-label={`Open record ${node.path.join(":")}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6F675C] hover:bg-[#ECE3D6]"
                      onClick={() => handleHybridRecordClick(node)}
                      title="Open record"
                      type="button"
                    >
                      <FileText aria-hidden="true" size={14} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex min-h-0 flex-col bg-[#FBF7EF]">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#C3BAAA] bg-[#F7F1E8] px-4">
            {hasSelectedRecord && units.inspection ? (
              <>
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-[#6F675C]">
                    <FileText aria-hidden="true" size={14} />
                    Record content
                  </div>
                  <div className="truncate text-sm font-semibold text-[var(--legacy-ink)]">
                    {units.inspection.resource.name}
                  </div>
                </div>
                <Button
                  onClick={() => units.namespaceSelected(units.selectedNamespacePath)}
                  variant="secondary"
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                  Back to folder
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0 pr-4">
                  <div className="text-xs font-medium uppercase text-[#6F675C]">
                    Folder contents
                  </div>
                  <div className="truncate text-sm font-semibold text-[var(--legacy-ink)]">
                    {selectedFolderLabel}
                  </div>
                </div>
                <form
                  className="flex w-full max-w-xl items-center gap-2"
                  onSubmit={handleSearch}
                >
                  <div className="relative flex-1">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8578]"
                      size={16}
                    />
                    <TextInput
                      className="pl-9"
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Search in folder"
                      value={searchDraft}
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    Search
                  </Button>
                </form>
                <div className="ml-4 whitespace-nowrap text-xs text-[#6F675C]">
                  {scanStatus}
                </div>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {hasSelectedRecord && units.inspection ? (
              <RecordContentPanel
                editorDefaultValue={recordEditorValue}
                editorRef={editorRef}
                inspection={units.inspection}
                valueDisplayLabel={valueDisplayLabel}
              />
            ) : (
              <ResourceTable
                isLoadingResources={units.isLoadingResources}
                onResourceSelected={units.resourceSelected}
                resources={visibleResources}
                selectedResourceId={units.selectedResourceId}
                emptyResourceMessage={emptyResourceMessage}
              />
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-[#C3BAAA] bg-[#F7F1E8]">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[#C3BAAA] px-4">
            <Pencil aria-hidden="true" size={16} />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">Record Inspector</h2>
              <p className="truncate text-xs text-[#6F675C]">
                {units.selectedConnection?.label ?? "No connection selected"}
              </p>
            </div>
          </div>

          <InspectorPanel
            inspection={units.inspection}
            isInspecting={units.isInspecting}
            isMutating={units.isMutating}
            onDelete={handleDelete}
            onExpire={handleExpire}
            onUpdate={handleUpdate}
            onTtlChange={setTtlDraft}
            ttlDraft={ttlDraft}
          />
        </aside>
      </section>
    </main>
  );
}

interface ResourceTableProps {
  readonly emptyResourceMessage: string;
  readonly isLoadingResources: boolean;
  readonly onResourceSelected: (resourceId: string) => void;
  readonly resources: ResourceDescriptor[];
  readonly selectedResourceId: string | null;
}

function ResourceTable({
  emptyResourceMessage,
  isLoadingResources,
  onResourceSelected,
  resources,
  selectedResourceId
}: ResourceTableProps) {
  return (
    <>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 bg-[#E7DFD2] text-left text-xs uppercase text-[#6F675C]">
          <tr>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              Name
            </th>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              Type
            </th>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              TTL
            </th>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              Provider
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr
              className={clsx(
                "cursor-pointer bg-[#FBF7EF] hover:bg-[#F2DCCB]",
                selectedResourceId === resource.id && "bg-[#F2DCCB]"
              )}
              key={resource.id}
            >
              <td className="border-b border-[#E0D7C8] p-0">
                <button
                  aria-label={`Inspect ${resource.name}`}
                  className="block w-full truncate px-4 py-3 text-left font-medium"
                  onClick={() => onResourceSelected(resource.id)}
                  type="button"
                >
                  {resource.name}
                </button>
              </td>
              <td className="border-b border-[#E0D7C8] px-4 py-3">
                {resource.type}
              </td>
              <td className="border-b border-[#E0D7C8] px-4 py-3">
                {formatTtl(resource.ttlSeconds)}
              </td>
              <td className="border-b border-[#E0D7C8] px-4 py-3">
                {resource.provider}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!isLoadingResources && resources.length === 0 ? (
        <div className="flex h-full min-h-64 items-center justify-center px-6 text-center text-sm text-[#6F675C]">
          {emptyResourceMessage}
        </div>
      ) : null}
    </>
  );
}

interface NamespaceNodeIconProps {
  readonly isSelected: boolean;
  readonly node: NamespaceNode;
}

function NamespaceNodeIcon({ isSelected, node }: NamespaceNodeIconProps) {
  const className = "shrink-0";

  if (node.kind === "record") {
    return <FileText aria-hidden="true" className={className} size={14} />;
  }

  if (node.kind === "hybrid") {
    return <FolderOpen aria-hidden="true" className={className} size={14} />;
  }

  return isSelected ? (
    <FolderOpen aria-hidden="true" className={className} size={14} />
  ) : (
    <Folder aria-hidden="true" className={className} size={14} />
  );
}

function namespaceNodeActionLabel(node: NamespaceNode): string {
  const path = node.path.join(":");

  if (node.kind === "record") {
    return `Open record ${path}`;
  }

  return `Open folder ${path}`;
}

function isNamespaceNodeSelected(input: {
  readonly node: NamespaceNode;
  readonly selectedFolderKey: string;
  readonly selectedResourceId: string | null;
}): boolean {
  if (input.node.kind === "record") {
    return input.selectedResourceId === input.node.resourceId;
  }

  return input.selectedFolderKey === input.node.path.join(":");
}

interface RecordContentPanelProps {
  readonly editorDefaultValue: string;
  readonly editorRef: RefObject<HTMLTextAreaElement | null>;
  readonly inspection: ResourceInspection;
  readonly valueDisplayLabel: string;
}

function RecordContentPanel({
  editorDefaultValue,
  editorRef,
  inspection,
  valueDisplayLabel
}: RecordContentPanelProps) {
  return (
    <div className="flex min-h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {inspection.resource.name}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#6F675C]">
            <span>{inspection.resource.type}</span>
            <span>{inspection.resource.provider}</span>
            <span>{formatTtl(inspection.resource.ttlSeconds)}</span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#C3BAAA] bg-[#F7F1E8] px-2 py-1 text-xs text-[#6F675C]">
          <Code aria-hidden="true" size={13} />
          {valueDisplayLabel}
        </span>
      </div>

      <textarea
        aria-label="Record value"
        className="min-h-[520px] flex-1 resize-none rounded-md border border-[#C3BAAA] bg-[#111412] p-4 font-mono text-sm leading-6 text-[#D6D0C4] outline-none focus:border-[var(--legacy-rust)] focus:ring-2 focus:ring-[#E8C4AA]"
        defaultValue={editorDefaultValue}
        key={inspection.resource.id}
        ref={editorRef}
        spellCheck={false}
      />
    </div>
  );
}

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

function InspectorPanel({
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
    return (
      <div className="p-4 text-sm text-[#6F675C]">Loading resource</div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center text-sm text-[#6F675C]">
        Select a key from the folder contents
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="space-y-1 border-b border-[#C3BAAA] pb-4">
        <div className="truncate text-sm font-semibold">
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
        <Button disabled={isMutating} onClick={onExpire} title="Set TTL">
          <Clock aria-hidden="true" size={16} />
          Expire
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        <Button disabled={isMutating} onClick={onUpdate} variant="primary">
          <Pencil aria-hidden="true" size={16} />
          Save
        </Button>
        <Button disabled={isMutating} onClick={onDelete} variant="danger">
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

function formatPreviewForEditing(value: DataPreview | undefined): string {
  if (!value) {
    return "";
  }

  switch (value.kind) {
    case "scalar":
      return formatScalarForEditing(value.value);
    case "object":
      return JSON.stringify(value.value, null, 2);
    case "list":
      return JSON.stringify(value.value, null, 2);
    case "zset":
      return JSON.stringify(value.value, null, 2);
    case "unsupported":
      return value.message;
  }
}

function formatScalarForEditing(value: string | null): string {
  if (value === null) {
    return "";
  }

  const parsedJson = tryParseJson(value);

  if (parsedJson !== null) {
    return JSON.stringify(parsedJson, null, 2);
  }

  return value;
}

function describeValueDisplay(value: DataPreview | undefined): string {
  if (!value) {
    return "No value selected";
  }

  switch (value.kind) {
    case "scalar":
      return tryParseJson(value.value) !== null ? "Detected JSON string" : "Raw string";
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

function tryParseJson(value: string | null): unknown | null {
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

function formatTtl(ttlSeconds: number | undefined): string {
  if (ttlSeconds === undefined) {
    return "-";
  }

  if (ttlSeconds < 0) {
    return "persistent";
  }

  return `${ttlSeconds}s`;
}

function getResourceEmptyMessage(input: {
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
