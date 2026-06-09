import { jsonResponse } from "@/server/http/responses";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse({
    ok: true,
    service: "legacy"
  });
}
