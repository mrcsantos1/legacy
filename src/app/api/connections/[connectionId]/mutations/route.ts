import {
  databaseService,
  resolveConnection
} from "@/server/database/container";
import { errorResponse, jsonResponse } from "@/server/http/responses";
import { resolveSession } from "@/server/http/session";
import { mutationRequestSchema } from "@/shared/api/schemas";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly connectionId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = resolveSession(request);
    const { connectionId } = await context.params;
    const connection = resolveConnection(session.sessionId, connectionId);
    const mutation = mutationRequestSchema.parse(await request.json());
    const result = await databaseService.mutate(connection, mutation);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
