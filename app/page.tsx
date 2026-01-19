"use client";

import { useTheme } from "./hooks/useTheme";
import { useCrawler } from "./hooks/useCrawler";
import { useStats } from "./hooks/useStats";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { ConfigCard } from "./components/ConfigCard";
import { ContentPanel } from "./components/ContentPanel";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

export default function Home() {
  const { isDark, toggleTheme } = useTheme();
  const { logs, brokenLinks, brokenImages, isCrawling, currentUrl, handleStartCrawl, handleStop } =
    useCrawler();
  const stats = useStats(logs, brokenLinks, brokenImages);
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
      <main className="px-6 py-4 grid md:grid-cols-3 gap-4">
        <ConfigCard
          isDark={isDark}
          onToggleTheme={toggleTheme}
          stats={stats}
          isCrawling={isCrawling}
          onStartCrawl={handleStart}
          onStop={handleStop}
        />

        <ContentPanel
          logs={logs}
          brokenLinks={brokenLinks}
          brokenImages={brokenImages}
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
