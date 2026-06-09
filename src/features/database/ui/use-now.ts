"use client";

import { useEffect, useState } from "react";

// One shared clock per consumer keeps TTL countdowns ticking without any
// per-second server traffic and without one interval per table row.
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
