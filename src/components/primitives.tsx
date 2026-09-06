"use client";

import { useEffect, useRef, useState } from "react";

export { timeAgo } from "@/lib/format";

/** Counter that animates to a real value, honouring reduced-motion. */
export function Counter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="mono">{shown.toLocaleString("en-US")}</span>;
}

export function StatusDot({ tone = "ok" }: { tone?: "ok" | "warn" | "crit" | "idle" }) {
  const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "crit" ? "var(--crit)" : "var(--text-dim)";
  return (
    <>
      <span className="dot" aria-hidden="true" />
      <style jsx>{`
        .dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color};
          animation: ${tone === "idle" ? "none" : "pulse-ring 2.6s infinite"};
        }
      `}</style>
    </>
  );
}

/** Health as a luminous arc — real score, no decoration. */
export function HealthRing({ score, size = 54 }: { score: number | null; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  const tone = score == null ? "var(--text-dim)" : pct >= 80 ? "var(--ok)" : pct >= 55 ? "var(--warn)" : "var(--crit)";

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} role="img" aria-label={score == null ? "Health not computed" : `Health ${pct} percent`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        {score != null && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={tone} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 5px ${tone})` }}
          />
        )}
      </svg>
      <span
        className="mono"
        style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          fontSize: size * 0.26, color: tone,
        }}
      >
        {score == null ? "—" : pct}
      </span>
    </div>
  );
}

