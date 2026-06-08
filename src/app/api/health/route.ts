import { getEnvironmentConnection } from "@/server/database/environment";
import { jsonResponse } from "@/server/http/responses";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse({
    configuredDefaultConnection: getEnvironmentConnection() !== undefined,
    ok: true,
    service: "legacy"
  });
}
