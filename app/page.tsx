"use client";

import { useTheme } from "./hooks/useTheme";
import { useCrawler } from "./hooks/useCrawler";
import { useStats } from "./hooks/useStats";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { ConfigCard } from "./components/ConfigCard";
import { ActivityLog } from "./components/ActivityLog";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

export default function Home() {
  const { isDark, toggleTheme } = useTheme();
  const { logs, isCrawling, currentUrl, handleStartCrawl, handleStop } =
    useCrawler();
  const stats = useStats(logs);
  const { containerRef, handleScroll, resetAutoScroll } = useAutoScroll([logs]);

  const handleStart = (startUrl: string, sitemapUrl: string) => {
    handleStartCrawl(startUrl, sitemapUrl, resetAutoScroll);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-zinc-800 gradient-bg-dark text-white"
          : "bg-slate-50 gradient-bg-light text-slate-900"
      }`}
    >
      <Header isDark={isDark} onToggleTheme={toggleTheme} />
      <main className="p-6 grid md:grid-cols-3 gap-4">
        <ConfigCard
          isDark={isDark}
          onToggleTheme={toggleTheme}
          stats={stats}
          isCrawling={isCrawling}
          onStartCrawl={handleStart}
          onStop={handleStop}
        />

        <ActivityLog
          logs={logs}
          currentUrl={currentUrl}
          isCrawling={isCrawling}
          isDark={isDark}
          containerRef={containerRef}
          onScroll={handleScroll}
        />
      </main>

      <Footer isDark={isDark} />
    </div>
  );
}
