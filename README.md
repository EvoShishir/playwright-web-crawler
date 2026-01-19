# PageMedic

A modern, real-time web crawler built with Next.js and Playwright that crawls websites, detects broken links and images, and streams results live to your browser.

![PageMedic](https://img.shields.io/badge/PageMedic-v1.0-indigo?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Playwright](https://img.shields.io/badge/Playwright-Latest-green?style=flat-square)

## Overview

**PageMedic** is a powerful web health checker that uses Playwright's Chromium browser to diagnose your website. It detects broken links (404s) and broken images, tracks where issues originate, and displays all events in real-time—making it perfect for website auditing, SEO analysis, and quality assurance.

## Features

### 🔗 Broken Link Detection
- **404 Detection**: Automatically finds broken internal links
- **Source Page Tracking**: Shows exactly which page contains the broken link
- **Link Text & Context**: Displays the anchor text and HTML element location (nav, footer, etc.)
- **Referrer Tracking**: When a page returns 404, see all pages that link to it

### 🖼️ Broken Image Detection
- **Failed Image Detection**: Finds images that fail to load
- **Alt Text Display**: Shows the image's alt attribute for identification
- **Element Context**: Shows which section of the page contains the broken image
- **Failure Reason**: Displays why the image failed (HTTP 404, zero width, incomplete load)

### 📊 Real-time Dashboard
- **Tabbed Interface**: Switch between Activity Log, Broken Links, and Broken Images
- **Live Statistics**: Track pages crawled, broken links, broken images, errors, and warnings
- **Expandable Details**: Click on any broken link/image to see full details
- **Copy URLs**: One-click copy for broken URLs
- **Clickable Source Pages**: Jump directly to the page containing the issue

### 🎨 User Experience
- **Light/Dark Theme**: Toggle between themes with smooth transitions
- **Scroll to Bottom Button**: Appears when scrolled up in the activity log
- **Auto-scroll**: Logs auto-scroll when at bottom, pause when reviewing
- **Live Indicator**: Pulsing indicator shows when crawling is active
- **Responsive Design**: Works on desktop and tablet screens

### ⚙️ Smart Crawling
- **Sitemap Support**: Import URLs from sitemap.xml
- **SSL Certificate Handling**: Works with self-signed certificates
- **Origin Isolation**: Only crawls same-domain links
- **Batch Processing**: Crawls in batches of 100 for efficiency
- **Resource Type Detection**: Distinguishes between pages, images, and documents

### 🛡️ False Positive Prevention
- **Social Media Skip List**: Doesn't flag Twitter, LinkedIn, Facebook, etc. (they block bots)
- **CORS Error Filtering**: Ignores cross-origin resource errors
- **ERR_ABORTED Filtering**: Ignores navigation cancellation errors
- **PDF/Document Handling**: Checks documents via HEAD request instead of navigation

## Screenshots

### Activity Log
Real-time crawling progress with live updates:
- 🔍 Currently crawling URL with spinner
- ✅ Successful operations
- ❌ Errors and broken resources
- 📊 Queue and batch status

### Broken Links Panel
Expandable cards showing:
- Status code (404, 500, etc.)
- Broken URL
- **Source page** (where to fix it)
- Link text and element location

### Broken Images Panel
Detailed breakdown of:
- Image source URL
- Page containing the broken image
- Alt text and failure reason
- Element context

## Installation

### Prerequisites
- Node.js 18+ 
- pnpm, npm, yarn, or bun

### Setup

1. Clone the repository:
```bash
git clone https://github.com/EvoShishir/playwright-web-crawler.git
cd playwright-web-crawler
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Playwright browsers:
```bash
pnpm exec playwright install chromium
```

## Usage

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to launch PageMedic.

### Production

```bash
pnpm build
pnpm start
```

### Using PageMedic

1. **Enter Start URL** (required)
   - Example: `https://example.com`

2. **Enter Sitemap URL** (optional)
   - Example: `https://example.com/sitemap.xml`

3. **Click "Start Crawl"**
   - Watch real-time logs in the Activity Log tab
   - Switch to Broken Links or Broken Images tabs to see issues

4. **Review Issues**
   - Click on any broken link/image card to expand details
   - "FIX HERE" label shows which page to edit
   - Click source page link to visit it directly

5. **Stop Anytime**
   - Click "Stop" to halt crawling gracefully

### Understanding the Results

#### Broken Links Panel
Each broken link shows:
- **Status Code**: HTTP error code (404, 500, etc.)
- **Broken URL**: The URL that returned an error
- **Source Page**: The page containing the link (where you need to fix it!)
- **Link Text**: The anchor text of the broken link
- **Element Location**: HTML context like `<nav>`, `<footer.links>`, etc.

#### Broken Images Panel
Each broken image shows:
- **Image Source**: The src URL that failed
- **Page**: Where the image appears
- **Alt Text**: The image's alt attribute
- **Reason**: Why it failed (404, zero width, etc.)
- **Element Location**: HTML context

### Log Message Reference

| Emoji | Meaning |
|-------|---------|
| 🚀 | PageMedic starting |
| 📄 | Loading sitemap |
| ✅ | Success/completion |
| 🔍 | Currently crawling |
| 🔗 | Link information |
| 🖼️ | Image information |
| 🔗❌ | Broken link detected |
| 🖼️❌ | Broken image detected |
| 🚫 | Request failed |
| ❌ | Console error |
| 🔥 | JavaScript error |
| ⚠️ | Warning/navigation error |
| 📊 | Queue status |
| 🏁 | Crawl complete |

## Architecture

### Frontend
- **React 19** with hooks for state management
- **Server-Sent Events (SSE)** for real-time streaming
- **Tailwind CSS** for styling
- **Component-based** architecture with TypeScript

### Backend
- **Next.js 16** App Router API routes
- **Playwright** for browser automation
- **Streaming responses** via SSE
- **Link registry** for referrer tracking

### Data Flow
1. User submits start URL → PageMedic API creates SSE stream
2. Playwright launches headless Chromium
3. Each page visited → Extract links, register sources
4. Broken resources → Look up referrer, send to client
5. Client receives events → Updates UI in real-time

## Configuration

### Adjustable Parameters

In `app/api/crawl/route.ts`:
- `BATCH_SIZE`: URLs per batch (default: 100)
- `MAX_PAGES`: Maximum pages to crawl (default: 1000)
- `timeout`: Navigation timeout (default: 30000ms)

### Skip Lists

Social media domains that PageMedic skips for external link checking:
- Twitter/X, LinkedIn, Facebook, Instagram
- YouTube, TikTok, Pinterest, Reddit
- Discord, WhatsApp, Telegram, Medium
- Apple App Store, Google Play Store

### Ignored Error Patterns
- CORS policy errors
- `net::ERR_ABORTED`
- `net::ERR_BLOCKED`
- Mixed content warnings
- Security errors

## Technical Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org) | Type-safe JavaScript |
| [Playwright](https://playwright.dev) | Browser automation |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling |
| Server-Sent Events | Real-time streaming |

## Project Structure

```
app/
├── api/
│   └── crawl/
│       └── route.ts          # PageMedic crawler API endpoint
├── components/
│   ├── ActivityLog.tsx       # Log viewer component
│   ├── BrokenLinksPanel.tsx  # Broken links display
│   ├── BrokenImagesPanel.tsx # Broken images display
│   ├── ContentPanel.tsx      # Tabbed content area
│   ├── ConfigCard.tsx        # URL input & stats
│   ├── StatsGrid.tsx         # Statistics cards
│   └── ...
├── hooks/
│   ├── useCrawler.ts         # Crawler state management
│   ├── useStats.ts           # Statistics calculation
│   ├── useTheme.ts           # Theme management
│   └── useAutoScroll.ts      # Scroll behavior
├── types/
│   └── crawler.ts            # TypeScript interfaces
├── utils/
│   ├── logParser.ts          # Log message parsing
│   └── logStyles.ts          # Log styling utilities
├── page.tsx                  # Main PageMedic component
├── layout.tsx                # Root layout
└── globals.css               # Global styles
```

## Limitations

- Crawls only same-origin links (internal links)
- Maximum 1000 pages per crawl (configurable)
- 30-second timeout per page
- Headless mode only
- No authentication support (public pages only)
- External links to social media are not verified

## Future Enhancements

- [ ] Export results to CSV/JSON
- [ ] Crawl depth limiting
- [ ] Authentication support (login flows)
- [ ] Screenshot capture on errors
- [ ] Performance metrics (Core Web Vitals)
- [ ] Parallel browser instances
- [ ] Pause/resume functionality
- [ ] Historical crawl comparison
- [ ] Custom ignore patterns
- [ ] Webhook notifications

## Contributing

Contributions to PageMedic are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use PageMedic for personal or commercial purposes.

## Support

- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Documentation](https://playwright.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**PageMedic** - Diagnose your website's health in real-time 🩺
