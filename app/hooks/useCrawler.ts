import { useState, useCallback } from "react";
import { extractCrawlingUrl } from "../utils/logParser";

interface CrawlerEventData {
  type: "log" | "prompt" | "done" | "error";
  message?: string;
  sessionId?: string;
}

export function useCrawler() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const handleStartCrawl = useCallback(
    (startUrl: string, sitemapUrl: string, onResetAutoScroll?: () => void) => {
      if (!startUrl) {
        alert("Please enter a start URL");
        return;
      }

      setLogs([]);
      setIsCrawling(true);
      onResetAutoScroll?.();

      const params = new URLSearchParams({ startUrl });
      if (sitemapUrl) {
        params.append("sitemapUrl", sitemapUrl);
      }

      const es = new EventSource(`/api/crawl?${params.toString()}`);

      es.onmessage = (event) => {
        const data: CrawlerEventData = JSON.parse(event.data);

        if (data.type === "log") {
          setLogs((prev) => [...prev, data.message!]);
          const url = extractCrawlingUrl(data.message!);
          if (url) {
            setCurrentUrl(url);
          }
        } else if (data.type === "prompt") {
          const shouldContinue = window.confirm(data.message!);
          fetch("/api/crawl/response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: data.sessionId,
              response: shouldContinue ? "y" : "n",
            }),
          });
        } else if (data.type === "done") {
          setLogs((prev) => [...prev, data.message!]);
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
    },
    []
  );

  const handleStop = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsCrawling(false);
    setCurrentUrl(null);
    setLogs((prev) => [...prev, "⏹️ Crawling stopped by user"]);
  }, [eventSource]);

  return {
    logs,
    isCrawling,
    currentUrl,
    handleStartCrawl,
    handleStop,
  };
}
