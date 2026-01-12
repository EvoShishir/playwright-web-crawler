import { chromium } from "playwright";
import { NextRequest } from "next/server";
import https from "https";

// Helper to create SSE response
function createSSEResponse() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  let isClosed = false;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const sendEvent = (data: any) => {
    if (isClosed) return;
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch (err) {
      // Controller might be closed
      isClosed = true;
    }
  };

  const close = () => {
    if (!isClosed) {
      try {
        controller.close();
        isClosed = true;
      } catch (err) {
        // Already closed
        isClosed = true;
      }
    }
  };

  return { stream, sendEvent, close };
}

// Fetch and parse sitemap
async function fetchSitemap(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function parseSitemap(xml: string): string[] {
  const urls = new Set<string>();
  const locMatches = xml.match(/<loc>(.*?)<\/loc>/g) || [];

  for (const match of locMatches) {
    const loc = match.replace(/<\/?loc>/g, "").trim();
    urls.add(loc);
  }

  return [...urls];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startUrl = searchParams.get("startUrl");
  const sitemapUrl = searchParams.get("sitemapUrl");

  if (!startUrl) {
    return new Response("Missing startUrl parameter", { status: 400 });
  }

  const { stream, sendEvent, close } = createSSEResponse();

  // Start crawling in the background
  (async () => {
    let browser;

    try {
      sendEvent({ type: "log", message: "🚀 Starting crawler..." });

      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      const visited = new Set<string>();
      const queue: string[] = [startUrl];
      const origin = new URL(startUrl).origin;

      let totalCrawled = 0;
      const BATCH_SIZE = 100;
      const MAX_PAGES = 1000; // Safety limit

      // Load sitemap if provided
      if (sitemapUrl) {
        sendEvent({ type: "log", message: `📄 Loading sitemap: ${sitemapUrl}` });
        try {
          const xml = await fetchSitemap(sitemapUrl);
          const sitemapUrls = parseSitemap(xml).filter((u) =>
            u.startsWith(origin)
          );

          sitemapUrls.forEach((u) => queue.push(u));

          sendEvent({
            type: "log",
            message: `✅ Added ${sitemapUrls.length} URLs from sitemap`,
          });
        } catch (err: any) {
          sendEvent({
            type: "log",
            message: `⚠️ Failed to load sitemap: ${err.message}`,
          });
        }
      }

      // Set up error listeners
      page.on("requestfailed", (request) => {
        const url = request.url();
        if (!url.startsWith(origin)) return;

        sendEvent({
          type: "log",
          message: `🚫 Internal request failed: ${url} | Page: ${page.url()}`,
        });
      });

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          sendEvent({
            type: "log",
            message: `❌ Console error: ${msg.text()} | Page: ${page.url()}`,
          });
        }
      });

      page.on("pageerror", (err) => {
        sendEvent({
          type: "log",
          message: `🔥 JS error: ${err.message} | Page: ${page.url()}`,
        });
      });

      // Crawl loop
      while (queue.length && totalCrawled < MAX_PAGES) {
        let batchCount = 0;

        while (queue.length && batchCount < BATCH_SIZE && totalCrawled < MAX_PAGES) {
          const url = queue.shift();

          if (!url || visited.has(url)) continue;
          visited.add(url);

          totalCrawled++;
          batchCount++;

          sendEvent({
            type: "log",
            message: `\n🔍 Crawling (${totalCrawled}): ${url}`,
          });

          try {
            await page.goto(url, {
              waitUntil: "networkidle",
              timeout: 30000,
            });

            // Extract links
            const links = await page.$$eval("a[href]", (anchors) => {
              const origin = window.location.origin;
              return anchors
                .map((a) => (a as HTMLAnchorElement).href)
                .filter((href) => href.startsWith(origin));
            });

            for (const link of links) {
              if (!visited.has(link) && !queue.includes(link)) {
                queue.push(link);
              }
            }
          } catch (err: any) {
            sendEvent({
              type: "log",
              message: `⚠️ Navigation error: ${err.message} | Page: ${url}`,
            });
          }
        }

        sendEvent({
          type: "log",
          message: `\n✅ Batch finished. Total pages crawled: ${totalCrawled}`,
        });

        if (queue.length) {
          sendEvent({
            type: "log",
            message: `📊 ${queue.length} URLs remaining in queue`,
          });
        }
      }

      await browser.close();

      sendEvent({
        type: "done",
        message: `\n🏁 Crawl complete. Pages visited: ${visited.size}`,
      });
    } catch (err: any) {
      sendEvent({
        type: "error",
        message: err.message,
      });

      if (browser) {
        await browser.close();
      }
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
