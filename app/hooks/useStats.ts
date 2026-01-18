import { useMemo } from "react";

export interface CrawlerStats {
  crawled: number;
  errors: number;
  warnings: number;
}

export function useStats(logs: string[]): CrawlerStats {
  return useMemo(() => {
    let crawled = 0;
    let errors = 0;
    let warnings = 0;

    logs.forEach((log) => {
      if (log.includes("🔍 Crawling")) crawled++;
      if (log.includes("❌") || log.includes("🚫")) errors++;
      if (log.includes("⚠️") || log.includes("🔥")) warnings++;
    });

    return { crawled, errors, warnings };
  }, [logs]);
}
