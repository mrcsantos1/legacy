"use client";

import {
    computeRemainingTtl,
    describeTtlTier,
    formatRemainingTtl,
    ttlTierOf,
    type TtlTier
} from "@/features/database/model/ttl";

import { useNow } from "./use-now";

const TIER_CLASSES: Record<TtlTier, string> = {
  danger: "font-semibold text-red-700",
  expired: "text-[#8E8578] line-through",
  healthy: "",
  persistent: "text-[#6F675C]",
  unknown: "text-[#6F675C]",
  warning: "font-medium text-amber-700"
};

interface TtlBadgeProps {
  readonly nowMs: number;
  readonly observedAtMs: number;
  readonly ttlSeconds: number | undefined;
}

export function TtlBadge({ nowMs, observedAtMs, ttlSeconds }: TtlBadgeProps) {
  const remaining = computeRemainingTtl(ttlSeconds, observedAtMs, nowMs);
  const tier = ttlTierOf(remaining);

  return (
    <span className={TIER_CLASSES[tier]} title={describeTtlTier(tier)}>
      {formatRemainingTtl(remaining)}
    </span>
  );
}

interface LiveTtlBadgeProps {
  readonly observedAtMs: number;
  readonly ttlSeconds: number | undefined;
}

// Self-ticking variant so large parent components (value viewer, inspector)
// do not re-render once per second just to update the countdown.
export function LiveTtlBadge({ observedAtMs, ttlSeconds }: LiveTtlBadgeProps) {
  const nowMs = useNow(1000);

  return (
    <TtlBadge nowMs={nowMs} observedAtMs={observedAtMs} ttlSeconds={ttlSeconds} />
  );
}
