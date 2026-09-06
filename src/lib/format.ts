/**
 * Pure formatting helpers — safe to import from both server and client
 * components (no "use client" boundary).
 */

export function timeAgo(date: Date | string | null): string {
  if (!date) return "NEVER";
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}S AGO`;
  if (s < 3600) return `${Math.floor(s / 60)}M AGO`;
  if (s < 86400) return `${Math.floor(s / 3600)}H AGO`;
  const days = Math.floor(s / 86400);
  if (days < 30) return `${days}D AGO`;
  if (days < 365) return `${Math.floor(days / 30)}MO AGO`;
  return `${Math.floor(days / 365)}Y AGO`;
}
