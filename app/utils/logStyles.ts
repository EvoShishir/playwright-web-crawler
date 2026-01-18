export type Theme = "dark" | "light";

/**
 * Get log entry styling based on log content and theme
 */
export function getLogStyle(log: string, isDark: boolean): string {
  if (log.includes("❌") || log.includes("🚫")) {
    return isDark ? "text-red-400" : "text-red-600";
  }
  if (log.includes("✅")) {
    return isDark ? "text-emerald-400" : "text-emerald-600";
  }
  if (log.includes("⚠️") || log.includes("🔥")) {
    return isDark ? "text-amber-400" : "text-amber-600";
  }
  if (log.includes("🚀") || log.includes("🏁")) {
    return isDark ? "text-indigo-400" : "text-indigo-600";
  }
  return isDark ? "text-zinc-300" : "text-slate-700";
}

/**
 * Get link styling based on theme
 */
export function getLinkStyle(isDark: boolean): string {
  return isDark
    ? "text-indigo-400 hover:text-indigo-300 decoration-indigo-400/50 hover:decoration-indigo-300"
    : "text-indigo-600 hover:text-indigo-500 decoration-indigo-500/50 hover:decoration-indigo-500";
}
