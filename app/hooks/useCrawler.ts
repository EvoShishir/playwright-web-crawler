import { useState, useCallback } from "react";
import { extractCrawlingUrl } from "../utils/logParser";
import { BrokenLink, BrokenImage, ConsoleError, CrawlerEventData } from "../types/crawler";

export function useCrawler() {
  const [logs, setLogs] = useState<string[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [brokenImages, setBrokenImages] = useState<BrokenImage[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
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
      setBrokenLinks([]);
      setBrokenImages([]);
      setConsoleErrors([]);
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
        } else if (data.type === "broken_link") {
          setLogs((prev) => [...prev, data.message!]);
          if (data.data) {
            setBrokenLinks((prev) => [...prev, data.data as BrokenLink]);
          }
        } else if (data.type === "broken_image") {
          setLogs((prev) => [...prev, data.message!]);
          if (data.data) {
            setBrokenImages((prev) => [...prev, data.data as BrokenImage]);
          }
        } else if (data.type === "console_error") {
          if (data.data) {
            setConsoleErrors((prev) => [...prev, data.data as ConsoleError]);
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
    brokenLinks,
    brokenImages,
    consoleErrors,
    isCrawling,
    currentUrl,
    handleStartCrawl,
    handleStop,
  };
}
