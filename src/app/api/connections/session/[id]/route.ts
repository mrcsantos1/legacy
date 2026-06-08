import { deleteSessionConnection } from "@/server/database/container";
import { NotFoundError } from "@/server/database/errors";
import { errorResponse, jsonResponse } from "@/server/http/responses";
import { resolveSession } from "@/server/http/session";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = resolveSession(request);
    const { id } = await context.params;
    const deleted = deleteSessionConnection(session.sessionId, id);

    if (!deleted) {
      throw new NotFoundError(`Session connection not found: ${id}`);
    }

    return jsonResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
