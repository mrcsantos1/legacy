import { listConnectionSummaries } from "@/server/database/container";
import { attachSessionCookie, resolveSession } from "@/server/http/session";
import { jsonResponse } from "@/server/http/responses";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = resolveSession(request);
  const response = jsonResponse({
    connections: listConnectionSummaries(session.sessionId)
  });

  return attachSessionCookie(response, session);
}
