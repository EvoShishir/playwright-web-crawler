# Playwright Web Crawler

A modern, real-time web crawler built with Next.js and Playwright that allows you to crawl websites with live log streaming directly to your browser.

## Overview

This application provides a user-friendly interface for crawling websites using Playwright's Chromium browser. It captures and displays all navigation events, errors, and console messages in real-time, making it perfect for website auditing, link checking, and error detection.

## Features

### Core Functionality
- **Real-time Log Streaming**: Watch crawl progress live as logs stream to your browser using Server-Sent Events (SSE)
- **Sitemap Support**: Optionally provide a sitemap URL to include additional pages in the crawl queue
- **Smart Auto-scroll**: Logs auto-scroll when you're at the bottom, but won't interrupt when you scroll up to review
- **Clickable URLs**: All URLs in logs are clickable links that open in new tabs
- **Visual Feedback**: Animated spinner appears next to the currently crawling URL
- **Error Tracking**: Captures and logs:
  - Failed network requests
  - JavaScript console errors
  - Page navigation errors
  - Runtime exceptions

### User Experience
- **Stop/Resume Control**: Stop crawling at any time with the Stop button
- **Input Validation**: Clear indication of required fields and URL format
- **Responsive UI**: Clean, dark-themed interface built with Tailwind CSS
- **Progress Tracking**: See total pages crawled and queue status in real-time

## How It Works

### Architecture

1. **Frontend (app/page.tsx:1)**
   - React client component with real-time state management
   - EventSource connection for receiving Server-Sent Events
   - Smart scroll detection to maintain user's reading position
   - URL parsing to convert log messages into clickable links

2. **Backend API (app/api/crawl/route.ts:1)**
   - Next.js API route with streaming response
   - Playwright Chromium browser automation
   - Breadth-first crawl algorithm
   - Origin-based link filtering (only crawls same-domain links)

### Crawl Process

1. User enters start URL and optional sitemap URL
2. API initializes Playwright browser in headless mode
3. If sitemap provided, fetches and parses XML to extract URLs
4. Crawl queue starts with all discovered URLs
5. For each page:
   - Navigate and wait for network idle
   - Extract all same-origin links
   - Add new links to queue
   - Log all events to client
6. Crawls in batches of 100 URLs with safety limit of 1000 pages
7. Streams completion status when done

### Error Detection

The crawler monitors three types of errors:

- **Request Failures**: Network requests that fail (timeouts, 404s, etc.)
- **Console Errors**: JavaScript errors logged to browser console
- **Page Errors**: Uncaught exceptions and runtime errors

All errors are logged with the page URL where they occurred.

## Installation

### Prerequisites
- Node.js 18+ or compatible runtime
- pnpm, npm, yarn, or bun package manager

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd playwright-crawler-next
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
# or
yarn install
```

3. Install Playwright browsers:
```bash
pnpm exec playwright install chromium
# or
npx playwright install chromium
```

## Usage

### Development

Start the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using the Crawler

1. **Enter Start URL** (required)
   - Must be a valid HTTP/HTTPS URL
   - Example: `https://example.com`

2. **Enter Sitemap URL** (optional)
   - URL to your sitemap.xml file
   - Example: `https://example.com/sitemap.xml`
   - All same-origin URLs from sitemap will be added to crawl queue

3. **Click "Start Crawl"**
   - Watch real-time logs appear in the console below
   - Blue spinner shows current page being crawled
   - All URLs are clickable for quick access

4. **Monitor Progress**
   - Logs show crawl count, URLs, and any errors
   - Auto-scrolls when at bottom of log viewer
   - Scroll up to review previous logs without interruption

5. **Stop Anytime**
   - Click "Stop" button to halt crawling
   - Browser will close gracefully
   - Final stats displayed in logs

### Reading the Logs

Log messages include:
- `🚀 Starting crawler...` - Initialization
- `📄 Loading sitemap:` - Sitemap fetch attempt
- `✅ Added X URLs from sitemap` - Sitemap success
- `🔍 Crawling (N): <URL>` - Currently crawling page N
- `🚫 Internal request failed:` - Network request failure
- `❌ Console error:` - JavaScript console error
- `🔥 JS error:` - Page runtime error
- `⚠️ Navigation error:` - Page load failure
- `✅ Batch finished. Total pages crawled: N` - Batch completion
- `🏁 Crawl complete. Pages visited: N` - Final completion

## Benefits

### For Developers
- **Fast Setup**: No complex configuration required
- **Modern Stack**: Built with latest Next.js, React, and TypeScript
- **Type Safety**: Full TypeScript support for reliability
- **Live Debugging**: See errors as they happen during crawl
- **Easy Extension**: Clean code structure for adding features

### For Website Auditing
- **Comprehensive Coverage**: Crawls all internal links automatically
- **Error Discovery**: Find broken links, JS errors, and failed requests
- **Sitemap Validation**: Test if sitemap URLs are accessible
- **Real-time Monitoring**: No waiting for results, see issues immediately
- **Link Verification**: Ensure all internal navigation works

### For Testing
- **Integration Testing**: Verify entire site navigation flows
- **Error Detection**: Catch console errors across all pages
- **Performance Monitoring**: Track slow page loads (30s timeout)
- **Scale Testing**: Test sites with up to 1000 pages

### Technical Advantages
- **Non-blocking Architecture**: Server-Sent Events allow crawling without blocking
- **Headless Browser**: Uses real Chromium for accurate JavaScript execution
- **Smart Queuing**: Avoids duplicate crawls with visited set
- **Origin Isolation**: Stays within your domain, won't crawl external sites
- **Resource Efficient**: Batch processing prevents memory issues

## Technical Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Browser Automation**: [Playwright](https://playwright.dev)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Real-time Communication**: Server-Sent Events (SSE)
- **Package Manager**: pnpm (npm/yarn/bun compatible)

## Configuration

### Adjustable Parameters

In `app/api/crawl/route.ts:75-76`:
- `BATCH_SIZE`: Number of URLs per batch (default: 100)
- `MAX_PAGES`: Safety limit for total pages (default: 1000)

In `app/api/crawl/route.ts:145`:
- `timeout`: Navigation timeout per page (default: 30000ms)

## Limitations

- Crawls only same-origin links (doesn't follow external domains)
- Maximum 1000 pages per crawl (configurable)
- 30-second timeout per page navigation
- Headless mode only (no browser UI visible)
- No authentication support (public pages only)

## Future Enhancements

Potential improvements:
- Export crawl results to CSV/JSON
- Custom error filtering and categorization
- Crawl depth limiting
- Rate limiting controls
- Authentication support (login flows)
- Screenshot capture on errors
- Performance metrics (Core Web Vitals)
- Parallel browser instances for faster crawling
- Pause/resume functionality
- Historical crawl comparison

## License

This project is built with Next.js and is subject to its license terms.

## Support

For issues or questions, please refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Documentation](https://playwright.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
