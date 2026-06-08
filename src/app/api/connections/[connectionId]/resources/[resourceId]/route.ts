import {
  databaseService,
  resolveConnection
} from "@/server/database/container";
import { errorResponse, jsonResponse } from "@/server/http/responses";
import { resolveSession } from "@/server/http/session";

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
    const result = await databaseService.inspectResource(connection, resourceId);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
