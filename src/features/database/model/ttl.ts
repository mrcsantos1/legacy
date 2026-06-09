export const TTL_WARNING_SECONDS = 60;
export const TTL_DANGER_SECONDS = 15;

export type TtlTier =
  | "persistent"
  | "healthy"
  | "warning"
  | "danger"
  | "expired"
  | "unknown";

// Live TTL is derived client-side from the last server-observed TTL and the
// timestamp of that observation; the server is only consulted for periodic
// reconciliation, never for per-second countdown ticks.
export function computeRemainingTtl(
  ttlSeconds: number | undefined,
  observedAtMs: number,
  nowMs: number
): number | null | undefined {
  if (ttlSeconds === undefined) {
    return undefined;
  }

  if (ttlSeconds < 0) {
    return null;
  }

  const elapsedSeconds = Math.floor(Math.max(0, nowMs - observedAtMs) / 1000);

  return Math.max(0, ttlSeconds - elapsedSeconds);
}

export function ttlTierOf(remaining: number | null | undefined): TtlTier {
  if (remaining === undefined) {
    return "unknown";
  }

  if (remaining === null) {
    return "persistent";
  }

  if (remaining <= 0) {
    return "expired";
  }

  if (remaining <= TTL_DANGER_SECONDS) {
    return "danger";
  }

  if (remaining <= TTL_WARNING_SECONDS) {
    return "warning";
  }

  return "healthy";
}

export function describeTtlTier(tier: TtlTier): string {
  switch (tier) {
    case "persistent":
      return "This key has no expiration.";
    case "healthy":
      return "Live countdown from the last server-observed TTL; reconciled with the server periodically.";
    case "warning":
      return "This key expires in under a minute.";
    case "danger":
      return "This key is about to expire.";
    case "expired":
      return "TTL reached zero locally; the key disappears once the server confirms it is gone.";
    case "unknown":
      return "TTL is not reported for this resource.";
  }
}

export function formatRemainingTtl(
  remaining: number | null | undefined
): string {
  if (remaining === undefined) {
    return "-";
  }

  if (remaining === null) {
    return "persistent";
  }

  if (remaining <= 0) {
    return "expired";
  }

  return `${remaining}s`;
}
