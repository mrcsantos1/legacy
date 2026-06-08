import {
  createSessionConnection,
  databaseService
} from "@/server/database/container";
import { ValidationError } from "@/server/database/errors";
import { attachSessionCookie, resolveSession } from "@/server/http/session";
import { errorResponse, jsonResponse } from "@/server/http/responses";
import { newConnectionSchema } from "@/shared/api/schemas";
import type { ConnectionConfig } from "@/server/database/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = resolveSession(request);
    const input = newConnectionSchema.parse(await request.json());
    const testConfig: ConnectionConfig = {
      database: input.database,
      id: "connection:test",
      label: input.label,
      provider: input.provider,
      source: "session",
      tls: input.tls,
      url: input.url
    };
    const connectionTest = await databaseService.testConnection(testConfig);

    if (!connectionTest.ok) {
      throw new ValidationError(
        connectionTest.error ?? "Unable to connect to Redis."
      );
    }

    const summary = createSessionConnection(session.sessionId, input);
    const response = jsonResponse({ connection: summary }, { status: 201 });

    return attachSessionCookie(response, session);
  } catch (error) {
    return errorResponse(error);
  }
}
