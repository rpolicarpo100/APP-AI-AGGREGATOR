"use client";

import Link from "next/link";
import { Counter } from "./primitives";

export type Metric = {
  key: string;
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warn" | "crit";
};

/**
 * Large numerals over a technical grid — the dashboard's anchor.
 * Every tile navigates to the view that explains the number.
 */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid">
      {metrics.map((m, i) => (
        <Link
          key={m.key}
          href={m.href}
          className={`tile tone-${m.tone ?? "default"}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="label">{m.label}</span>
          <span className="metric-value">
            <Counter value={m.value} />
          </span>
          <span className="scanline" aria-hidden="true" />
        </Link>
      ))}
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
          gap: 1px;
          background: var(--line);
          border: 1px solid var(--line);
          margin-bottom: 30px;
        }
        .tile {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          min-height: 128px;
          padding: 17px 18px 16px;
          background: var(--surface-0);
          animation: rise 620ms var(--ease) both;
          transition: background var(--med) var(--ease);
        }
        .tile:hover { background: var(--surface-2); }
        .tile:hover .scanline { opacity: 1; }
        .tile::after {
          content: "";
          position: absolute;
          left: 0; bottom: 0;
          width: 0; height: 1px;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
          transition: width var(--slow) var(--ease);
        }
        .tile:hover::after { width: 100%; }
        .tone-warn .metric-value { color: var(--warn); }
        .tone-crit .metric-value { color: var(--crit); }
        .scanline {
          position: absolute; left: 0; right: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-glow), transparent);
          opacity: 0;
          animation: scan 3.4s linear infinite;
        }
      `}</style>
    </div>
  );
}
