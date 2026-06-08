export const LEGACY_SESSION_COOKIE = "legacy_session";

export interface SessionResolution {
  readonly isNew: boolean;
  readonly sessionId: string;
}

export function resolveSession(request: Request): SessionResolution {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const existing = cookies.get(LEGACY_SESSION_COOKIE);

  if (existing) {
    return {
      isNew: false,
      sessionId: existing
    };
  }

  return {
    isNew: true,
    sessionId: `browser:${crypto.randomUUID()}`
  };
}

export function attachSessionCookie(
  response: Response,
  session: SessionResolution
): Response {
  if (!session.isNew) {
    return response;
  }

  response.headers.set(
    "set-cookie",
    `${LEGACY_SESSION_COOKIE}=${session.sessionId}; Path=/; HttpOnly; SameSite=Lax`
  );

  return response;
}

function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!header) {
    return cookies;
  }

  for (const cookie of header.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name && valueParts.length > 0) {
      cookies.set(name, valueParts.join("="));
    }
  }

  return cookies;
}
