"use client";

import {
  AlertTriangle,
  Clock,
  Database,
  KeyRound,
  Layers,
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
import type { DataPreview, ResourceInspection } from "@/shared/api/client";
import { Button } from "@/shared/ui/button";
import { FieldLabel, TextInput } from "@/shared/ui/field";

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
    selectedResourceId: model.stores.$selectedResourceId
  });
  const [label, setLabel] = useState("Local Redis");
  const [url, setUrl] = useState("redis://localhost:6379");
  const [searchDraft, setSearchDraft] = useState("");
  const [ttlDraft, setTtlDraft] = useState("300");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const { appStarted } = units;

  useEffect(() => {
    appStarted();
  }, [appStarted]);

  const visibleResources = useMemo(
    () => units.resources.slice(0, 200),
    [units.resources]
  );

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
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <Database aria-hidden="true" size={18} />
          </div>
          <div>
            <h1 className="text-base font-semibold">Legacy</h1>
            <p className="text-xs text-slate-500">Universal database viewer</p>
          </div>
        </div>
        <Button
          disabled={units.isLoadingResources || !units.selectedConnectionId}
          onClick={() => units.resourcesRefreshed()}
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

      <section className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_360px] overflow-hidden">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <section className="border-b border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
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
              <p className="px-2 py-3 text-sm text-slate-500">Loading connections</p>
            ) : null}
            <div className="space-y-1">
              {units.connections.map((connection) => (
                <button
                  className={clsx(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition",
                    units.selectedConnectionId === connection.id
                      ? "bg-emerald-50 text-emerald-900"
                      : "hover:bg-slate-100"
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
                    <span className="block truncate text-xs text-slate-500">
                      {connection.urlPreview}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers aria-hidden="true" size={16} />
                Namespaces
              </div>
              {units.isLoadingNamespaces ? (
                <span className="text-xs text-slate-500">Loading</span>
              ) : null}
            </div>

            <button
              className={clsx(
                "mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                units.selectedNamespacePath.length === 0
                  ? "bg-slate-900 text-white"
                  : "hover:bg-slate-100"
              )}
              onClick={() => units.namespaceSelected([])}
              type="button"
            >
              <KeyRound aria-hidden="true" size={15} />
              Root
            </button>

            <div className="mt-1 space-y-1">
              {units.namespaceNodes.map((node) => (
                <button
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                    units.selectedNamespacePath.join(":") === node.path.join(":")
                      ? "bg-slate-900 text-white"
                      : "hover:bg-slate-100"
                  )}
                  key={node.id}
                  onClick={() => units.namespaceSelected(node.path)}
                  style={{ paddingLeft: `${8 + node.depth * 14}px` }}
                  type="button"
                >
                  <Layers aria-hidden="true" size={14} />
                  <span className="truncate">{node.label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
            <form className="flex w-full max-w-xl items-center gap-2" onSubmit={handleSearch}>
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <TextInput
                  className="pl-9"
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search keys"
                  value={searchDraft}
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <div className="ml-4 text-xs text-slate-500">
              {units.resourceCursor === "0" ? "Scan complete" : "More keys available"}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">
                    Name
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">
                    Type
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">
                    TTL
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">
                    Provider
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleResources.map((resource) => (
                  <tr
                    className={clsx(
                      "cursor-pointer bg-white hover:bg-emerald-50",
                      units.selectedResourceId === resource.id && "bg-emerald-50"
                    )}
                    key={resource.id}
                  >
                    <td className="border-b border-slate-100 p-0">
                      <button
                        aria-label={`Inspect ${resource.name}`}
                        className="block w-full truncate px-4 py-3 text-left font-medium"
                        onClick={() => units.resourceSelected(resource.id)}
                        type="button"
                      >
                        {resource.name}
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {resource.type}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {formatTtl(resource.ttlSeconds)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {resource.provider}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!units.isLoadingResources && visibleResources.length === 0 ? (
              <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500">
                No resources
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
            <Pencil aria-hidden="true" size={16} />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">Inspector</h2>
              <p className="truncate text-xs text-slate-500">
                {units.selectedConnection?.label ?? "No connection selected"}
              </p>
            </div>
          </div>

          <InspectorPanel
            editorDefaultValue={formatPreviewForEditing(units.inspection?.value)}
            editorRef={editorRef}
            inspection={units.inspection}
            isInspecting={units.isInspecting}
            isMutating={units.isMutating}
            onDelete={handleDelete}
            onExpire={handleExpire}
            onTtlChange={setTtlDraft}
            onUpdate={handleUpdate}
            ttlDraft={ttlDraft}
          />
        </aside>
      </section>
    </main>
  );
}

interface InspectorPanelProps {
  readonly editorDefaultValue: string;
  readonly editorRef: RefObject<HTMLTextAreaElement | null>;
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
  editorDefaultValue,
  editorRef,
  inspection,
  isInspecting,
  isMutating,
  onDelete,
  onExpire,
  onTtlChange,
  onUpdate,
  ttlDraft
}: InspectorPanelProps) {
  if (isInspecting) {
    return (
      <div className="p-4 text-sm text-slate-500">Loading resource</div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
        Select a resource from the grid
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="space-y-1 border-b border-slate-200 pb-4">
        <div className="truncate text-sm font-semibold">
          {inspection.resource.name}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{inspection.resource.type}</span>
          <span>{inspection.resource.provider}</span>
          <span>{formatTtl(inspection.resource.ttlSeconds)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <FieldLabel htmlFor="resource-value">Value</FieldLabel>
        <textarea
          className="min-h-52 w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          defaultValue={editorDefaultValue}
          id="resource-value"
          key={inspection.resource.id}
          ref={editorRef}
        />
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

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-xs font-medium uppercase text-slate-500">
          Metadata
        </div>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
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
      return value.value ?? "";
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

function formatTtl(ttlSeconds: number | undefined): string {
  if (ttlSeconds === undefined) {
    return "-";
  }

  if (ttlSeconds < 0) {
    return "persistent";
  }

  return `${ttlSeconds}s`;
}
