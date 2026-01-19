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

export interface CrawlerEventData {
  type: "log" | "prompt" | "done" | "error" | "broken_link" | "broken_image";
  message?: string;
  sessionId?: string;
  data?: BrokenLink | BrokenImage;
}
