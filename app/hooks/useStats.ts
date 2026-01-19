import { useMemo } from "react";
import { BrokenLink, BrokenImage } from "../types/crawler";

export interface CrawlerStats {
  crawled: number;
  errors: number;
  warnings: number;
  brokenLinks: number;
  brokenImages: number;
}

export function useStats(
  logs: string[],
  brokenLinks: BrokenLink[],
  brokenImages: BrokenImage[]
): CrawlerStats {
  return useMemo(() => {
    let crawled = 0;
    let errors = 0;
    let warnings = 0;

    logs.forEach((log) => {
      if (log.includes("🔍 Crawling")) crawled++;
      if (log.includes("❌") || log.includes("🚫")) errors++;
      if (log.includes("⚠️") || log.includes("🔥")) warnings++;
    });

    return {
      crawled,
      errors,
      warnings,
      brokenLinks: brokenLinks.length,
      brokenImages: brokenImages.length,
    };
  }, [logs, brokenLinks, brokenImages]);
}
