"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Narrow vertical rail — deliberately not a conventional sidebar.
 * Glyphs are typographic marks, not icon-library art.
 */
const NODES = [
  { href: "/", mark: "OV", label: "Overview" },
  { href: "/projects", mark: "PR", label: "Projects" },
  { href: "/ai", mark: "AI", label: "AI Projects" },
  { href: "/attention", mark: "AT", label: "Attention" },
  { href: "/activity", mark: "AC", label: "Activity" },
  { href: "/sources", mark: "SR", label: "Sources" },
];

export function Rail() {
  const path = usePathname();

  return (
    <nav className="rail" aria-label="Primary">
      <Link href="/" className="rail-sigil" aria-label="APP AI AGGREGATOR — home">
        <span aria-hidden="true">◈</span>
      </Link>

      <ul className="rail-nodes">
        {NODES.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`rail-node${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="rail-mark mono" aria-hidden="true">{n.mark}</span>
                <span className="rail-tip mono">{n.label}</span>
                <span className="sr-only">{n.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="rail-foot">
        <span className="rail-kbd mono" aria-hidden="true">⌘K</span>
      </div>

      <style jsx>{`
        .rail {
          position: fixed;
          left: 0; top: 0; bottom: 0;
          width: var(--rail);
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 18px 0 16px;
          background: linear-gradient(180deg, var(--surface-1), var(--surface-0));
          border-right: 1px solid var(--line);
        }
        .rail-sigil {
          font-size: 19px;
          color: var(--accent);
          margin-bottom: 26px;
          filter: drop-shadow(0 0 9px var(--accent-glow));
          transition: transform var(--med) var(--ease);
        }
        .rail-sigil:hover { transform: rotate(90deg); }

        .rail-nodes {
          list-style: none;
          margin: 0; padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
        .rail-node {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 46px;
          color: var(--text-dim);
          transition: color var(--fast) var(--ease), background var(--fast) var(--ease);
        }
        .rail-mark {
          font-size: 10.5px;
          letter-spacing: 0.06em;
        }
        .rail-node::before {
          content: "";
          position: absolute;
          left: 0; top: 50%;
          width: 2px; height: 0;
          background: var(--accent);
          transform: translateY(-50%);
          transition: height var(--med) var(--ease);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .rail-node:hover { color: var(--text); background: rgba(255,255,255,0.02); }
        .rail-node.is-active { color: var(--accent); }
        .rail-node.is-active::before { height: 22px; }

        .rail-tip {
          position: absolute;
          left: calc(100% + 10px);
          padding: 6px 10px;
          background: var(--surface-3);
          border: 1px solid var(--line-strong);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          white-space: nowrap;
          color: var(--text);
          opacity: 0;
          transform: translateX(-6px);
          pointer-events: none;
          transition: opacity var(--fast) var(--ease), transform var(--fast) var(--ease);
        }
        .rail-node:hover .rail-tip,
        .rail-node:focus-visible .rail-tip { opacity: 1; transform: none; }

        .rail-foot { margin-top: auto; }
        .rail-kbd {
          font-size: 9.5px;
          color: var(--text-dim);
          border: 1px solid var(--line-strong);
          padding: 4px 6px;
        }

        @media (max-width: 760px) {
          .rail {
            top: auto;
            right: 0;
            width: 100%;
            height: 54px;
            flex-direction: row;
            padding: 0 8px;
            border-right: none;
            border-top: 1px solid var(--line-strong);
            background: rgba(7, 10, 15, 0.96);
            backdrop-filter: blur(12px);
          }
          .rail-sigil, .rail-foot { display: none; }
          .rail-nodes { flex-direction: row; justify-content: space-around; }
          .rail-node { height: 54px; width: 100%; }
          .rail-node::before { left: 50%; top: 0; transform: translateX(-50%); width: 0; height: 2px; }
          .rail-node.is-active::before { width: 20px; height: 2px; }
          .rail-tip { display: none; }
        }
      `}</style>
    </nav>
  );
}
