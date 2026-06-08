import {
  databaseService,
  resolveConnection
} from "@/server/database/container";
import { errorResponse, jsonResponse } from "@/server/http/responses";
import { resolveSession } from "@/server/http/session";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly connectionId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = resolveSession(request);
    const { connectionId } = await context.params;
    const url = new URL(request.url);
    const delimiter = url.searchParams.get("delimiter") ?? ":";
    const path = parsePath(url.searchParams.get("path"), delimiter);
    const count = parseOptionalInteger(url.searchParams.get("count"));
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const connection = resolveConnection(session.sessionId, connectionId);
    const result = await databaseService.listNamespaces(connection, {
      count,
      cursor,
      delimiter,
      path
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

function parsePath(value: string | null, delimiter: string): string[] {
  return value ? value.split(delimiter).filter(Boolean) : [];
}

function parseOptionalInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}
