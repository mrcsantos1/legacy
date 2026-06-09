import {
  databaseService,
  resolveConnection
} from "@/server/database/container";
import { errorResponse, jsonResponse } from "@/server/http/responses";
import { resolveSession } from "@/server/http/session";
import type { ResourceInspectionQuery } from "@/server/database/types";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{
    readonly connectionId: string;
    readonly resourceId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = resolveSession(request);
    const { connectionId, resourceId } = await context.params;
    const connection = resolveConnection(session.sessionId, connectionId);
    const query = parseInspectionQuery(request.url);
    const result = await databaseService.inspectResource(
      connection,
      resourceId,
      query
    );

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

function parseInspectionQuery(url: string): ResourceInspectionQuery {
  const params = new URL(url).searchParams;
  const query: {
    bytes?: number;
    cursor?: string;
    limit?: number;
  } = {};

  const limit = parsePositiveInt(params.get("limit"));
  if (limit !== undefined) {
    query.limit = limit;
  }

  const bytes = parsePositiveInt(params.get("bytes"));
  if (bytes !== undefined) {
    query.bytes = bytes;
  }

  const cursor = params.get("cursor");
  if (cursor) {
    query.cursor = cursor;
  }

  return query;
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
