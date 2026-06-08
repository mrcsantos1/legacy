import { clsx } from "clsx";

interface LegacyLogoProps {
  readonly className?: string;
  readonly compact?: boolean;
}

export function LegacyLogo({ className, compact = false }: LegacyLogoProps) {
  return (
    <div
      aria-label="Legacy home"
      className={clsx("flex items-center gap-3", className)}
    >
      <svg
        aria-hidden="true"
        className="h-10 w-10 shrink-0"
        fill="none"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          className="fill-[#111412]"
          height="46"
          rx="8"
          width="46"
          x="1"
          y="1"
        />
        <path
          className="stroke-[#D6D0C4]"
          d="M24 8v32M16 14h16M16 34h16"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          className="stroke-[#B86B3C]"
          d="M14 18c0 3 4.5 5.5 10 5.5S34 21 34 18M14 24c0 3 4.5 5.5 10 5.5S34 27 34 24M14 30c0 3 4.5 5.5 10 5.5S34 33 34 30"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          className="stroke-[#6FD1B4]"
          d="M24 11v26"
          strokeDasharray="2 4"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle className="fill-[#6FD1B4]" cx="17" cy="18" r="1.6" />
        <circle className="fill-[#D6A84F]" cx="31" cy="30" r="1.6" />
      </svg>
      {!compact ? (
        <span className="min-w-0">
          <span className="block text-base font-semibold leading-5 text-[var(--legacy-concrete)]">
            Legacy
          </span>
          <span className="block text-xs text-[#AFA89B]">
            Archive database viewer
          </span>
        </span>
      ) : null}
    </div>
  );
}
