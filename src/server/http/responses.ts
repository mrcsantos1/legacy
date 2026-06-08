import { DatabaseError } from "@/server/database/errors";

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof DatabaseError) {
    return jsonResponse(
      {
        error: {
          message: error.message,
          name: error.name
        }
      },
      { status: error.status }
    );
  }

  return jsonResponse(
    {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        name: "InternalServerError"
      }
    },
    { status: 500 }
  );
}
