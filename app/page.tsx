"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [startUrl, setStartUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update, but only if user is at bottom
  useEffect(() => {
    if (shouldAutoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logs, shouldAutoScroll]);

  // Check if user is at bottom of scroll container
  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold

    setShouldAutoScroll(isAtBottom);
  };

  // Helper to parse log message and convert URLs to clickable links
  const parseLogMessage = (log: string) => {
    // URL regex pattern
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
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleStartCrawl = () => {
    if (!startUrl) {
      alert("Please enter a start URL");
      return;
    }

    setLogs([]);
    setIsCrawling(true);
    setShouldAutoScroll(true);

    // Build query params
    const params = new URLSearchParams({ startUrl });
    if (sitemapUrl) {
      params.append("sitemapUrl", sitemapUrl);
    }

    // Create EventSource for Server-Sent Events
    const es = new EventSource(`/api/crawl?${params.toString()}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "log") {
        setLogs((prev) => [...prev, data.message]);

        // Extract current URL being crawled from the log message
        const crawlingMatch = data.message.match(
          /🔍 Crawling \(\d+\): (https?:\/\/[^\s]+)/
        );
        if (crawlingMatch) {
          setCurrentUrl(crawlingMatch[1]);
        }
      } else if (data.type === "prompt") {
        // Handle batch prompt
        const shouldContinue = window.confirm(data.message);

        // Send response back via fetch
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
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Playwright Web Crawler</h1>

        {/* Input Form */}
        <div className="bg-zinc-800 p-6 rounded-lg mb-6">
          <div className="flex gap-4">
            <div className="mb-4 flex-1/2">
              <label className="block text-sm font-medium mb-2">
                Start URL (required)
              </label>
              <input
                type="url"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isCrawling}
                className="w-full px-4 py-2 bg-zinc-700 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="mb-4 flex-1/2">
              <label className="block text-sm font-medium mb-2">
                Sitemap URL (optional)
              </label>
              <input
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                disabled={isCrawling}
                className="w-full px-4 py-2 bg-zinc-700 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleStartCrawl}
              disabled={isCrawling}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCrawling ? "Crawling..." : "Start Crawl"}
            </button>

            {isCrawling && (
              <button
                onClick={handleStop}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-medium transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Logs Display */}
        <div className="bg-zinc-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Crawl Logs</h2>
          <div
            ref={logsContainerRef}
            onScroll={handleScroll}
            className="bg-black rounded p-4 h-[500px] overflow-y-auto font-mono text-sm"
          >
            {logs.length === 0 ? (
              <div className="text-zinc-500">
                Logs will appear here when crawling starts...
              </div>
            ) : (
              logs.map((log, index) => {
                // Check if this log contains the current URL being crawled
                const crawlingMatch = log.match(
                  /🔍 Crawling \(\d+\): (https?:\/\/[^\s]+)/
                );
                const isCurrentLog =
                  crawlingMatch &&
                  currentUrl &&
                  crawlingMatch[1] === currentUrl;

                return (
                  <div key={index} className="py-2 flex items-center gap-2">
                    <span className={isCurrentLog ? "" : ""}>
                      {parseLogMessage(log)}
                    </span>
                    {isCurrentLog && (
                      <svg
                        className="animate-spin h-6 w-6 text-blue-500 shrink-0 mt-0.5"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
