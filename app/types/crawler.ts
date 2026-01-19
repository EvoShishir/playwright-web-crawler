export interface BrokenLink {
  url: string;
  statusCode: number;
  foundOnPage: string;
  linkText: string;
  elementContext: string;
  timestamp: string;
}

export interface BrokenImage {
  src: string;
  foundOnPage: string;
  altText: string;
  elementContext: string;
  reason: string;
  timestamp: string;
}

export interface ConsoleError {
  message: string;
  foundOnPage: string;
  type: "error" | "warning" | "js_error";
  timestamp: string;
}

export interface CrawlerEventData {
  type: "log" | "prompt" | "done" | "error" | "broken_link" | "broken_image" | "console_error";
  message?: string;
  sessionId?: string;
  data?: BrokenLink | BrokenImage | ConsoleError;
}
