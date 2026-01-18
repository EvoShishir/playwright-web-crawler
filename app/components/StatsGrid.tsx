import { StatsCard } from "./StatsCard";
import { CrawlerStats } from "../hooks/useStats";

interface StatsGridProps {
  stats: CrawlerStats;
  isDark: boolean;
}

export function StatsGrid({ stats, isDark }: StatsGridProps) {
  return (
    <div className="space-y-4">
      <StatsCard
        value={stats.crawled}
        label="Pages Crawled"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        isDark={isDark}
        iconBgColor={isDark ? "bg-indigo-500/30" : "bg-indigo-100"}
        iconTextColor={isDark ? "text-indigo-400" : "text-indigo-600"}
      />

      <StatsCard
        value={stats.errors}
        label="Errors"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        isDark={isDark}
        iconBgColor={isDark ? "bg-red-500/30" : "bg-red-100"}
        iconTextColor={isDark ? "text-red-400" : "text-red-600"}
      />

      <StatsCard
        value={stats.warnings}
        label="Warnings"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        }
        isDark={isDark}
        iconBgColor={isDark ? "bg-amber-500/30" : "bg-amber-100"}
        iconTextColor={isDark ? "text-amber-400" : "text-amber-600"}
      />
    </div>
  );
}
