import { chromium, Page, Request, Response as PlaywrightResponse } from "playwright";
import { NextRequest } from "next/server";
import https from "https";
import http from "http";
import { BrokenLink, BrokenImage } from "../../types/crawler";

// Domains that commonly block automated requests (false positives)
const SKIP_EXTERNAL_DOMAINS = [
  "twitter.com",
  "x.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "google.com",
  "pinterest.com",
  "reddit.com",
  "discord.com",
  "whatsapp.com",
  "t.me",
  "telegram.org",
  "snapchat.com",
  "medium.com",
  "apple.com",
  "apps.apple.com",
  "play.google.com",
];

// File extensions that should not be crawled as pages (but checked for existence)
const NON_HTML_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".wav",
  ".ogg",
  ".webm",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".bmp",
  ".tiff",
  ".tif",
  ".eps",
  ".ai",
  ".psd",
  ".css",
  ".js",
  ".json",
  ".xml",
  ".txt",
  ".csv",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
];

// Error messages to ignore (not actual broken resources)
const IGNORE_ERROR_PATTERNS = [
  /CORS/i,
  /Access-Control-Allow-Origin/i,
  /cross-origin/i,
  /net::ERR_ABORTED/i,
  /net::ERR_BLOCKED/i,
  /net::ERR_FAILED/i, // Often transient
  /SecurityError/i,
  /Mixed Content/i,
  /insecure content/i,
];

function shouldIgnoreError(message: string): boolean {
  return IGNORE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function isNonHtmlResource(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return NON_HTML_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function shouldSkipExternalCheck(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SKIP_EXTERNAL_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Link reference info - tracks where a link was found
interface LinkReference {
  foundOnPage: string;
  linkText: string;
  elementContext: string;
}

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
    const protocol = url.startsWith("https") ? https : http;
    const options = {
      rejectUnauthorized: false, // Allow self-signed certificates
    };
    protocol
      .get(url, options, (res) => {
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

// Check URL status with HEAD request
async function checkUrlStatus(
  url: string
): Promise<{ status: number; ok: boolean }> {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (url.startsWith("https") ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "HEAD",
        timeout: 10000,
        rejectUnauthorized: false,
      };
      const req = protocol.request(options, (res) => {
        resolve({ status: res.statusCode || 0, ok: (res.statusCode || 0) < 400 });
      });
      req.on("error", () => resolve({ status: 0, ok: false }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ status: 0, ok: false });
      });
      req.end();
    } catch {
      resolve({ status: 0, ok: false });
    }
  });
}

// Extract link info from page
async function extractLinksWithContext(page: Page): Promise<
  Array<{
    href: string;
    text: string;
    context: string;
  }>
> {
  return page.$$eval("a[href]", (anchors) => {
    return anchors.map((a) => {
      const anchor = a as HTMLAnchorElement;
      const parent = anchor.closest("nav, header, footer, article, section, aside, main");
      const parentTag = parent?.tagName.toLowerCase() || "body";
      const parentClass = parent?.className
        ? `.${parent.className.split(" ").filter(Boolean).slice(0, 2).join(".")}`
        : "";

      return {
        href: anchor.href,
        text: anchor.textContent?.trim().slice(0, 100) || "[No text]",
        context: `<${parentTag}${parentClass}>`,
      };
    });
  });
}

// Extract image info from page
async function extractImagesWithContext(page: Page): Promise<
  Array<{
    src: string;
    alt: string;
    context: string;
    naturalWidth: number;
    complete: boolean;
  }>
> {
  return page.$$eval("img", (images) => {
    return images.map((img) => {
      const image = img as HTMLImageElement;
      const parent = image.closest("figure, article, section, header, footer, aside, main, div");
      const parentTag = parent?.tagName.toLowerCase() || "body";
      const parentClass = parent?.className
        ? `.${parent.className.split(" ").filter(Boolean).slice(0, 2).join(".")}`
        : "";

      return {
        src: image.src,
        alt: image.alt || "[No alt text]",
        context: `<${parentTag}${parentClass}>`,
        naturalWidth: image.naturalWidth,
        complete: image.complete,
      };
    });
  });
}

// Parse 404 error from console message
function parse404FromConsoleError(message: string): { url: string; status: number } | null {
  // Skip CORS and other ignorable errors
  if (shouldIgnoreError(message)) {
    return null;
  }

  // Match patterns like "Failed to load resource: the server responded with a status of 404 ()"
  const statusMatch = message.match(/status of (\d{3})/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 400 && status < 500) { // Only 4xx errors, not 5xx
      // Try to extract URL from the message
      const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        return { url: urlMatch[1], status };
      }
    }
  }
  return null;
}

// Determine resource type from URL or content-type
function getResourceType(url: string, contentType?: string): "link" | "image" | "document" | "other" {
  const urlLower = url.toLowerCase();
  
  // Check by file extension - images
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|tiff?)(\?|$)/i.test(urlLower)) {
    return "image";
  }
  
  // Check by file extension - documents (PDFs, etc.)
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i.test(urlLower)) {
    return "document";
  }
  
  // Check by content-type
  if (contentType) {
    if (contentType.startsWith("image/")) {
      return "image";
    }
    if (contentType.includes("pdf") || contentType.includes("document")) {
      return "document";
    }
  }
  
  // Check if it looks like a page/document
  if (/\.(html?|php|aspx?|jsp)(\?|$)/i.test(urlLower) || !urlLower.match(/\.[a-z0-9]{2,4}(\?|$)/i)) {
    return "link";
  }
  
  return "other";
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
      const context = await browser.newContext({
        ignoreHTTPSErrors: true, // Allow self-signed certificates
      });
      const page = await context.newPage();

      const visited = new Set<string>();
      const checkedResources = new Set<string>();
      const queue: string[] = [startUrl];
      const origin = new URL(startUrl).origin;

      // Track where each URL was discovered (referrer tracking)
      // Map: URL -> array of references (pages that link to this URL)
      const linkRegistry = new Map<string, LinkReference[]>();

      let totalCrawled = 0;
      let brokenLinksCount = 0;
      let brokenImagesCount = 0;
      const BATCH_SIZE = 100;
      const MAX_PAGES = 1000; // Safety limit

      // Track current page URL for context
      let currentPageUrl = startUrl;

      // Helper to register a link reference
      const registerLink = (url: string, ref: LinkReference) => {
        if (!linkRegistry.has(url)) {
          linkRegistry.set(url, []);
        }
        const refs = linkRegistry.get(url)!;
        // Avoid duplicate references from same page
        if (!refs.some(r => r.foundOnPage === ref.foundOnPage && r.linkText === ref.linkText)) {
          refs.push(ref);
        }
      };

      // Helper to get link references for a URL
      const getLinkReferences = (url: string): LinkReference[] => {
        return linkRegistry.get(url) || [];
      };

      // Load sitemap if provided
      if (sitemapUrl) {
        sendEvent({ type: "log", message: `📄 Loading sitemap: ${sitemapUrl}` });
        try {
          const xml = await fetchSitemap(sitemapUrl);
          const sitemapUrls = parseSitemap(xml).filter((u) =>
            u.startsWith(origin)
          );

          sitemapUrls.forEach((u) => {
            // Only queue HTML pages, not resources
            if (!isNonHtmlResource(u)) {
              queue.push(u);
            }
            // Register sitemap as the source
            registerLink(u, {
              foundOnPage: sitemapUrl,
              linkText: "[From sitemap]",
              elementContext: "<sitemap>",
            });
          });

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

      // Register start URL
      registerLink(startUrl, {
        foundOnPage: "[Start URL]",
        linkText: "[User provided]",
        elementContext: "<input>",
      });

      // Listen for failed network requests (catches 404s, 500s, etc.)
      // Only for sub-resources, not main document navigations
      page.on("response", (response: PlaywrightResponse) => {
        const url = response.url();
        const status = response.status();
        const request = response.request();
        const resourceType = request.resourceType();

        // Only track internal resources with error status codes
        if (!url.startsWith(origin)) return;
        if (status < 400) return;
        if (checkedResources.has(url)) return;
        
        // Skip main document navigations - handled in main loop with proper referrer tracking
        if (resourceType === "document") {
          return;
        }
        
        // Skip non-essential resource types (CSS, fonts, etc.)
        if (["stylesheet", "font", "script", "media"].includes(resourceType)) {
          return;
        }
        
        checkedResources.add(url);

        const contentType = response.headers()["content-type"] || "";
        const type = getResourceType(url, contentType);

        // Skip documents like PDFs - they're handled separately
        if (type === "document") {
          return;
        }

        if (type === "image" || resourceType === "image") {
          brokenImagesCount++;
          const brokenImage: BrokenImage = {
            src: url,
            foundOnPage: currentPageUrl,
            altText: "[Detected from network]",
            elementContext: `<${resourceType}>`,
            reason: `HTTP ${status} - Resource not found`,
            timestamp: new Date().toISOString(),
          };
          sendEvent({
            type: "broken_image",
            message: `🖼️❌ Broken image (${status}): ${url.slice(0, 80)}...`,
            data: brokenImage,
          });
        } else if (type === "link" || resourceType === "fetch" || resourceType === "xhr") {
          // For fetch/xhr requests, use the link registry if available
          const references = getLinkReferences(url);
          if (references.length > 0) {
            for (const ref of references) {
              brokenLinksCount++;
              const brokenLink: BrokenLink = {
                url: url,
                statusCode: status,
                foundOnPage: ref.foundOnPage,
                linkText: ref.linkText,
                elementContext: ref.elementContext,
                timestamp: new Date().toISOString(),
              };
              sendEvent({
                type: "broken_link",
                message: `🔗❌ Broken resource (${status}): ${url} | Linked from: ${ref.foundOnPage}`,
                data: brokenLink,
              });
            }
          } else {
            brokenLinksCount++;
            const brokenLink: BrokenLink = {
              url: url,
              statusCode: status,
              foundOnPage: currentPageUrl,
              linkText: "[Detected from network]",
              elementContext: `<${resourceType}>`,
              timestamp: new Date().toISOString(),
            };
            sendEvent({
              type: "broken_link",
              message: `🔗❌ Broken resource (${status}): ${url}`,
              data: brokenLink,
            });
          }
        }
      });

      // Set up request failed listener - only for critical failures
      page.on("requestfailed", (request: Request) => {
        const url = request.url();
        if (!url.startsWith(origin)) return;
        if (checkedResources.has(url)) return;

        const failure = request.failure();
        const errorText = failure?.errorText || "";
        const resourceType = request.resourceType();

        // Ignore aborted, blocked, and other non-critical errors
        if (shouldIgnoreError(errorText) || 
            errorText.includes("ERR_ABORTED") || 
            errorText.includes("ERR_BLOCKED") ||
            errorText.includes("ERR_FAILED")) {
          return;
        }
        
        // Skip main document navigations - handled in main loop
        if (resourceType === "document") {
          return;
        }
        
        // Skip non-essential resource types
        if (["stylesheet", "font", "script", "media"].includes(resourceType)) {
          return;
        }

        checkedResources.add(url);

        sendEvent({
          type: "log",
          message: `🚫 Request failed: ${url} | Reason: ${errorText} | Page: ${currentPageUrl}`,
        });

        // Add to broken resources based on type
        if (resourceType === "image") {
          brokenImagesCount++;
          const brokenImage: BrokenImage = {
            src: url,
            foundOnPage: currentPageUrl,
            altText: "[Detected from network]",
            elementContext: `<${resourceType}>`,
            reason: errorText || "Request failed",
            timestamp: new Date().toISOString(),
          };
          sendEvent({
            type: "broken_image",
            message: `🖼️❌ Broken image: ${url.slice(0, 80)}...`,
            data: brokenImage,
          });
        }
      });

      // Listen for console errors to catch 404s - but filter noise
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          
          // Skip CORS and other ignorable errors
          if (shouldIgnoreError(text)) {
            return;
          }
          
          sendEvent({
            type: "log",
            message: `❌ Console error: ${text} | Page: ${currentPageUrl}`,
          });

          // Try to parse 404 from console error
          const parsed = parse404FromConsoleError(text);
          if (parsed && parsed.url.startsWith(origin) && !checkedResources.has(parsed.url)) {
            // Skip non-HTML resources - they're handled via HEAD requests
            if (isNonHtmlResource(parsed.url)) {
              return;
            }
            
            checkedResources.add(parsed.url);
            
            const type = getResourceType(parsed.url);
            
            if (type === "image") {
              brokenImagesCount++;
              const brokenImage: BrokenImage = {
                src: parsed.url,
                foundOnPage: currentPageUrl,
                altText: "[Detected from console]",
                elementContext: "<console-error>",
                reason: `HTTP ${parsed.status} - From console error`,
                timestamp: new Date().toISOString(),
              };
              sendEvent({
                type: "broken_image",
                message: `🖼️❌ Broken image (${parsed.status}): ${parsed.url.slice(0, 80)}...`,
                data: brokenImage,
              });
            } else if (type === "link") {
              // Use link registry if available for better source tracking
              const references = getLinkReferences(parsed.url);
              if (references.length > 0) {
                for (const ref of references) {
                  brokenLinksCount++;
                  const brokenLink: BrokenLink = {
                    url: parsed.url,
                    statusCode: parsed.status,
                    foundOnPage: ref.foundOnPage,
                    linkText: ref.linkText,
                    elementContext: ref.elementContext,
                    timestamp: new Date().toISOString(),
                  };
                  sendEvent({
                    type: "broken_link",
                    message: `🔗❌ Broken resource (${parsed.status}): ${parsed.url} | Linked from: ${ref.foundOnPage}`,
                    data: brokenLink,
                  });
                }
              } else {
                brokenLinksCount++;
                const brokenLink: BrokenLink = {
                  url: parsed.url,
                  statusCode: parsed.status,
                  foundOnPage: currentPageUrl,
                  linkText: "[Detected from console]",
                  elementContext: "<console-error>",
                  timestamp: new Date().toISOString(),
                };
                sendEvent({
                  type: "broken_link",
                  message: `🔗❌ Broken resource (${parsed.status}): ${parsed.url}`,
                  data: brokenLink,
                });
              }
            }
          }
        }
      });

      page.on("pageerror", (err) => {
        sendEvent({
          type: "log",
          message: `🔥 JS error: ${err.message} | Page: ${currentPageUrl}`,
        });
      });

      // Crawl loop
      while (queue.length && totalCrawled < MAX_PAGES) {
        let batchCount = 0;

        while (queue.length && batchCount < BATCH_SIZE && totalCrawled < MAX_PAGES) {
          const url = queue.shift();

          if (!url || visited.has(url)) continue;
          
          // Skip non-HTML resources (PDFs, images, etc.)
          if (isNonHtmlResource(url)) {
            // Check if the resource exists with a HEAD request
            const references = getLinkReferences(url);
            if (references.length > 0 && !checkedResources.has(url)) {
              const { status, ok } = await checkUrlStatus(url);
              checkedResources.add(url);
              
              if (!ok && status >= 400) {
                // Resource is broken
                for (const ref of references) {
                  brokenLinksCount++;
                  const brokenLink: BrokenLink = {
                    url: url,
                    statusCode: status,
                    foundOnPage: ref.foundOnPage,
                    linkText: ref.linkText,
                    elementContext: ref.elementContext,
                    timestamp: new Date().toISOString(),
                  };
                  sendEvent({
                    type: "broken_link",
                    message: `🔗❌ Broken resource (${status}): ${url} | Linked from: ${ref.foundOnPage}`,
                    data: brokenLink,
                  });
                }
              } else {
                sendEvent({
                  type: "log",
                  message: `📄 Resource OK: ${url}`,
                });
              }
            }
            visited.add(url);
            continue;
          }
          
          visited.add(url);
          totalCrawled++;
          batchCount++;
          currentPageUrl = url;

          sendEvent({
            type: "log",
            message: `\n🔍 Crawling (${totalCrawled}): ${url}`,
          });

          try {
            const response = await page.goto(url, {
              waitUntil: "networkidle",
              timeout: 30000,
            });

            // Check if the page itself is a 404
            if (response && response.status() >= 400) {
              const status = response.status();
              sendEvent({
                type: "log",
                message: `⚠️ Page returned ${status}: ${url}`,
              });

              // Get all pages that linked to this broken page
              const references = getLinkReferences(url);
              
              if (!checkedResources.has(url)) {
                checkedResources.add(url);
                
                // Create a broken link entry for EACH page that links to this URL
                if (references.length > 0) {
                  for (const ref of references) {
                    brokenLinksCount++;
                    const brokenLink: BrokenLink = {
                      url: url,
                      statusCode: status,
                      foundOnPage: ref.foundOnPage,
                      linkText: ref.linkText,
                      elementContext: ref.elementContext,
                      timestamp: new Date().toISOString(),
                    };
                    sendEvent({
                      type: "broken_link",
                      message: `🔗❌ Broken page (${status}): ${url} | Linked from: ${ref.foundOnPage}`,
                      data: brokenLink,
                    });
                  }
                } else {
                  // No reference found (shouldn't happen normally)
                  brokenLinksCount++;
                  const brokenLink: BrokenLink = {
                    url: url,
                    statusCode: status,
                    foundOnPage: "[Unknown source]",
                    linkText: "[Unknown]",
                    elementContext: "<unknown>",
                    timestamp: new Date().toISOString(),
                  };
                  sendEvent({
                    type: "broken_link",
                    message: `🔗❌ Broken page (${status}): ${url}`,
                    data: brokenLink,
                  });
                }
              }
              
              // Skip extracting links from 404 pages
              continue;
            }

            // Extract and check all links on the page
            const links = await extractLinksWithContext(page);
            const internalLinks = links.filter((l) => l.href.startsWith(origin));

            sendEvent({
              type: "log",
              message: `🔗 Found ${links.length} links (${internalLinks.length} internal)`,
            });

            // Register and queue internal links
            for (const link of internalLinks) {
              // Register where this link was found
              registerLink(link.href, {
                foundOnPage: url,
                linkText: link.text,
                elementContext: link.context,
              });
              
              // Add to queue if not visited
              if (!visited.has(link.href) && !queue.includes(link.href)) {
                queue.push(link.href);
              }
            }

            // Extract and check all images on the page (DOM-based check)
            const images = await extractImagesWithContext(page);
            sendEvent({
              type: "log",
              message: `🖼️ Found ${images.length} images`,
            });

            for (const img of images) {
              if (!img.src || checkedResources.has(img.src)) continue;
              
              // Check if image failed to load based on DOM properties
              let isBroken = false;
              let reason = "";

              if (!img.complete) {
                isBroken = true;
                reason = "Image failed to load (incomplete)";
              } else if (img.naturalWidth === 0) {
                isBroken = true;
                reason = "Image has zero width (failed to load)";
              }

              if (isBroken) {
                checkedResources.add(img.src);
                brokenImagesCount++;
                const brokenImage: BrokenImage = {
                  src: img.src,
                  foundOnPage: url,
                  altText: img.alt,
                  elementContext: img.context,
                  reason: reason,
                  timestamp: new Date().toISOString(),
                };

                sendEvent({
                  type: "broken_image",
                  message: `🖼️❌ Broken image: ${img.src.slice(0, 80)}...`,
                  data: brokenImage,
                });
              }
            }
          } catch (err: any) {
            sendEvent({
              type: "log",
              message: `⚠️ Navigation error: ${err.message} | Page: ${url}`,
            });
            
            // If navigation failed, still report with referrer info
            const references = getLinkReferences(url);
            if (references.length > 0 && !checkedResources.has(url)) {
              checkedResources.add(url);
              for (const ref of references) {
                brokenLinksCount++;
                const brokenLink: BrokenLink = {
                  url: url,
                  statusCode: 0,
                  foundOnPage: ref.foundOnPage,
                  linkText: ref.linkText,
                  elementContext: ref.elementContext,
                  timestamp: new Date().toISOString(),
                };
                sendEvent({
                  type: "broken_link",
                  message: `🔗❌ Navigation failed: ${url} | Linked from: ${ref.foundOnPage}`,
                  data: brokenLink,
                });
              }
            }
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
        message: `\n🏁 Crawl complete. Pages: ${visited.size} | Broken Links: ${brokenLinksCount} | Broken Images: ${brokenImagesCount}`,
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
