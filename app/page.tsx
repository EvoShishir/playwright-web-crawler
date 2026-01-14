"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export default function Home() {
  const [startUrl, setStartUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle(
        "light",
        savedTheme === "light"
      );
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  const isDark = theme === "dark";

  // Calculate stats from logs
  const stats = useMemo(() => {
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

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (shouldAutoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logs, shouldAutoScroll]);

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    setShouldAutoScroll(isAtBottom);
  };

  // Parse log message and convert URLs to clickable links
  const parseLogMessage = (log: string) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = log.split(urlPattern);

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isDark
                ? "text-indigo-400 hover:text-indigo-300 decoration-indigo-400/50 hover:decoration-indigo-300"
                : "text-indigo-600 hover:text-indigo-500 decoration-indigo-500/50 hover:decoration-indigo-500"
            } underline underline-offset-2 transition-colors`}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Get log entry styling based on type
  const getLogStyle = (log: string) => {
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
  };

  const handleStartCrawl = () => {
    if (!startUrl) {
      alert("Please enter a start URL");
      return;
    }

    setLogs([]);
    setIsCrawling(true);
    setShouldAutoScroll(true);

    const params = new URLSearchParams({ startUrl });
    if (sitemapUrl) {
      params.append("sitemapUrl", sitemapUrl);
    }

    const es = new EventSource(`/api/crawl?${params.toString()}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "log") {
        setLogs((prev) => [...prev, data.message]);
        const crawlingMatch = data.message.match(
          /🔍 Crawling \(\d+\): (https?:\/\/[^\s]+)/
        );
        if (crawlingMatch) {
          setCurrentUrl(crawlingMatch[1]);
        }
      } else if (data.type === "prompt") {
        const shouldContinue = window.confirm(data.message);
        fetch("/api/crawl/response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: data.sessionId,
            response: shouldContinue ? "y" : "n",
          }),
        });
      } else if (data.type === "done") {
        setLogs((prev) => [...prev, data.message]);
        setCurrentUrl(null);
        es.close();
        setIsCrawling(false);
        setEventSource(null);
      } else if (data.type === "error") {
        setLogs((prev) => [...prev, `❌ Error: ${data.message}`]);
        setCurrentUrl(null);
        es.close();
        setIsCrawling(false);
        setEventSource(null);
      }
    };

    es.onerror = () => {
      setLogs((prev) => [...prev, "❌ Connection lost"]);
      es.close();
      setIsCrawling(false);
      setCurrentUrl(null);
      setEventSource(null);
    };

    setEventSource(es);
  };

  const handleStop = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsCrawling(false);
    setCurrentUrl(null);
    setLogs((prev) => [...prev, "⏹️ Crawling stopped by user"]);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-zinc-800 gradient-bg-dark text-white"
          : "bg-slate-50 gradient-bg-light text-slate-900"
      }`}
    >
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Configuration Card */}
        <section
          className={`rounded-2xl p-6 border transition-colors ${
            isDark
              ? "bg-zinc-800/80 border-zinc-600/80 glow-primary-subtle"
              : "bg-white/80 border-slate-200 glow-primary-subtle-light"
          }`}
        >
          <div>
            <div className="max-w-6xl mx-auto pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      <span className="text-gradient">Web Crawler</span>
                    </h1>
                    <p
                      className={`text-sm ${
                        isDark ? "text-zinc-400" : "text-slate-500"
                      }`}
                    >
                      Powered by Playwright
                    </p>
                  </div>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`theme-toggle p-3 rounded-xl border ${
                    isDark
                      ? "bg-zinc-800 border-zinc-600/80 hover:bg-zinc-700"
                      : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                  } transition-colors`}
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <svg
                      className="w-5 h-5 text-amber-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-slate-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {/* <div className="flex items-center gap-2 mb-6">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDark ? "bg-indigo-500/10" : "bg-indigo-100"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${
                    isDark ? "text-indigo-400" : "text-indigo-600"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h2
                className={`text-lg font-semibold ${
                  isDark ? "text-zinc-100" : "text-slate-800"
                }`}
              >
                Configuration
              </h2>
            </div> */}

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  className={`block text-sm font-medium ${
                    isDark ? "text-zinc-400" : "text-slate-600"
                  }`}
                >
                  Start URL
                  <span className="text-indigo-500 ml-1">*</span>
                </label>
                <input
                  type="url"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isCrawling}
                  className={`w-full px-4 py-3 rounded-xl border input-focus-ring transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? "bg-zinc-900 border-zinc-600/80 text-white placeholder-zinc-500"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label
                  className={`block text-sm font-medium ${
                    isDark ? "text-zinc-400" : "text-slate-600"
                  }`}
                >
                  Sitemap URL
                  <span
                    className={`ml-1 text-xs ${
                      isDark ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    (optional)
                  </span>
                </label>
                <input
                  type="url"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  disabled={isCrawling}
                  className={`w-full px-4 py-3 rounded-xl border input-focus-ring transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? "bg-zinc-900 border-zinc-600/80 text-white placeholder-zinc-500"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleStartCrawl}
                disabled={isCrawling || !startUrl}
                className="group relative px-6 py-3 bg-gradient-to-r border border-indigo-600/80 from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-indigo-500/25 transition-all duration-200 btn-press"
              >
                <span className="flex items-center gap-2">
                  {isCrawling ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Crawling...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Start Crawl
                    </>
                  )}
                </span>
              </button>

              {isCrawling && (
                <button
                  onClick={handleStop}
                  className={`px-6 py-3 border rounded-xl font-medium transition-all duration-200 btn-press ${
                    isDark
                      ? "bg-zinc-800 border-zinc-600/80 text-zinc-300 hover:bg-red-950 hover:border-red-700 hover:text-red-400"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                      />
                    </svg>
                    Stop
                  </span>
                </button>
              )}
            </div>
            {/* Stats Bar */}
            {/* {logs.length > 0 && (
              <section className="grid grid-cols-3 gap-4">
                <div
                  className={`rounded-xl p-4 flex items-center gap-4 border ${
                    isDark
                      ? "bg-zinc-800/80 border-zinc-600/80"
                      : "bg-white/80 border-slate-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDark ? "bg-indigo-500/30" : "bg-indigo-100"
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${
                        isDark ? "text-indigo-400" : "text-indigo-600"
                      }`}
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
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {stats.crawled}
                    </div>
                    <div
                      className={`text-xs uppercase tracking-wider ${
                        isDark ? "text-zinc-500" : "text-slate-500"
                      }`}
                    >
                      Pages Crawled
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-xl p-4 flex items-center gap-4 border ${
                    isDark
                      ? "bg-zinc-800/80 border-zinc-600/80"
                      : "bg-white/80 border-slate-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDark ? "bg-red-500/30" : "bg-red-100"
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${
                        isDark ? "text-red-400" : "text-red-600"
                      }`}
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
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {stats.errors}
                    </div>
                    <div
                      className={`text-xs uppercase tracking-wider ${
                        isDark ? "text-zinc-500" : "text-slate-500"
                      }`}
                    >
                      Errors
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-xl p-4 flex items-center gap-4 border ${
                    isDark
                      ? "bg-zinc-800/80 border-zinc-600/80"
                      : "bg-white/80 border-slate-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDark ? "bg-amber-500/30" : "bg-amber-100"
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${
                        isDark ? "text-amber-400" : "text-amber-600"
                      }`}
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
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {stats.warnings}
                    </div>
                    <div
                      className={`text-xs uppercase tracking-wider ${
                        isDark ? "text-zinc-500" : "text-slate-500"
                      }`}
                    >
                      Warnings
                    </div>
                  </div>
                </div>
              </section>
            )} */}
          </div>
        </section>

        {/* Stats Bar */}
        {/* {logs.length > 0 && ( */}
        <section className="grid grid-cols-3 gap-4">
          <div
            className={`rounded-xl p-4 flex items-center gap-4 border ${
              isDark
                ? "bg-zinc-800/80 border-zinc-600/80"
                : "bg-white/80 border-slate-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDark ? "bg-indigo-500/30" : "bg-indigo-100"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  isDark ? "text-indigo-400" : "text-indigo-600"
                }`}
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
            </div>
            <div>
              <div
                className={`text-2xl font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {stats.crawled}
              </div>
              <div
                className={`text-xs uppercase tracking-wider ${
                  isDark ? "text-zinc-500" : "text-slate-500"
                }`}
              >
                Pages Crawled
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 flex items-center gap-4 border ${
              isDark
                ? "bg-zinc-800/80 border-zinc-600/80"
                : "bg-white/80 border-slate-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDark ? "bg-red-500/30" : "bg-red-100"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  isDark ? "text-red-400" : "text-red-600"
                }`}
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
            </div>
            <div>
              <div
                className={`text-2xl font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {stats.errors}
              </div>
              <div
                className={`text-xs uppercase tracking-wider ${
                  isDark ? "text-zinc-500" : "text-slate-500"
                }`}
              >
                Errors
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 flex items-center gap-4 border ${
              isDark
                ? "bg-zinc-800/80 border-zinc-600/80"
                : "bg-white/80 border-slate-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDark ? "bg-amber-500/30" : "bg-amber-100"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  isDark ? "text-amber-400" : "text-amber-600"
                }`}
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
            </div>
            <div>
              <div
                className={`text-2xl font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {stats.warnings}
              </div>
              <div
                className={`text-xs uppercase tracking-wider ${
                  isDark ? "text-zinc-500" : "text-slate-500"
                }`}
              >
                Warnings
              </div>
            </div>
          </div>
        </section>
        {/* )} */}

        {/* Logs Card */}
        <section
          className={`rounded-2xl overflow-hidden border ${
            isDark
              ? "bg-zinc-800/80 border-zinc-600/80"
              : "bg-white/80 border-slate-200"
          }`}
        >
          <div
            className={`px-6 py-4 border-b-2 flex items-center justify-between ${
              isDark ? "border-zinc-600/80" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDark ? "bg-emerald-500/10" : "bg-emerald-100"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${
                    isDark ? "text-emerald-400" : "text-emerald-600"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <h2
                className={`text-lg font-semibold ${
                  isDark ? "text-zinc-100" : "text-slate-800"
                }`}
              >
                Activity Log
              </h2>
            </div>

            {isCrawling && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  isDark ? "bg-indigo-500/10" : "bg-indigo-50"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span
                  className={`text-xs font-medium ${
                    isDark ? "text-indigo-400" : "text-indigo-600"
                  }`}
                >
                  Live
                </span>
              </div>
            )}
          </div>

          <div
            ref={logsContainerRef}
            onScroll={handleScroll}
            className={`h-[500px] overflow-y-auto ${
              isDark
                ? "custom-scrollbar-dark bg-zinc-900"
                : "custom-scrollbar-light bg-slate-50"
            }`}
          >
            {logs.length === 0 ? (
              <div
                className={`h-full flex flex-col items-center justify-center ${
                  isDark ? "text-zinc-500" : "text-slate-400"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    isDark ? "bg-zinc-800" : "bg-slate-100"
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${
                      isDark ? "text-zinc-600" : "text-slate-400"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <p className="text-sm">Activity logs will appear here</p>
                <p
                  className={`text-xs mt-1 ${
                    isDark ? "text-zinc-500" : "text-slate-400"
                  }`}
                >
                  Enter a URL and start crawling
                </p>
              </div>
            ) : (
              <div className="p-4 font-mono text-sm space-y-0.5">
                {logs.map((log, index) => {
                  const crawlingMatch = log.match(
                    /🔍 Crawling \(\d+\): (https?:\/\/[^\s]+)/
                  );
                  const isCurrentLog =
                    crawlingMatch &&
                    currentUrl &&
                    crawlingMatch[1] === currentUrl;

                  return (
                    <div
                      key={index}
                      className={`log-entry py-2 px-3 rounded-lg flex items-start gap-3 transition-colors ${
                        isCurrentLog
                          ? isDark
                            ? "bg-indigo-500/10 border border-indigo-500/20"
                            : "bg-indigo-50 border border-indigo-200"
                          : isDark
                          ? "hover:bg-zinc-800"
                          : "hover:bg-white"
                      }`}
                    >
                      <span className={`flex-1 ${getLogStyle(log)}`}>
                        {parseLogMessage(log)}
                      </span>
                      {isCurrentLog && (
                        <div className="flex items-center gap-2 shrink-0">
                          <svg
                            className={`animate-spin h-4 w-4 ${
                              isDark ? "text-indigo-400" : "text-indigo-500"
                            }`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className={`border-t-2 mt-12 ${
          isDark ? "border-zinc-600/80" : "border-slate-200"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div
            className={`flex items-center justify-between text-sm ${
              isDark ? "text-zinc-500" : "text-slate-400"
            }`}
          >
            <p>Real-time web crawling</p>
            <p>
              &copy; {new Date().getFullYear()} Atef Arman Shishir | All rights
              reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
