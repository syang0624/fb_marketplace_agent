type JsonObject = Record<string, unknown>;

const SCRAPER_BASE_URL =
  process.env.RUNPOD_SCRAPER_BASE_URL || process.env.RUNPOD_BACKEND_BASE_URL || "";
const VISION_BASE_URL =
  process.env.RUNPOD_VISION_BASE_URL || process.env.RUNPOD_BACKEND_BASE_URL || "";

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function hasPathSegment(base: string, segment: string): boolean {
  try {
    return new URL(base).pathname.split("/").filter(Boolean).includes(segment);
  } catch {
    return base.split("/").filter(Boolean).includes(segment);
  }
}

function endpointPath(baseUrl: string, prefix: "scraper_ep" | "vision_ep", path: string): string {
  return hasPathSegment(baseUrl, prefix) ? path : `/${prefix}${path}`;
}

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";

// RunPod serverless endpoints can cold-start or stall on a slow BrightData
// scrape. Without a bound, a hung endpoint blocks the whole search pipeline
// forever (the UI never leaves "Waiting for live results…"). Cap each call so
// a stall surfaces as null and callers fall back to their next data source.
const RUNPOD_TIMEOUT_MS = Number(process.env.RUNPOD_TIMEOUT_MS || 20000);

async function postJson(baseUrl: string, path: string, body: JsonObject): Promise<Response | null> {
  if (!baseUrl) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (RUNPOD_API_KEY) headers["Authorization"] = `Bearer ${RUNPOD_API_KEY}`;
  try {
    return await fetch(joinUrl(baseUrl, path), {
      method: "POST",
      headers,
      // Flash load-balancer routes expose the handler's `data: dict` param as a
      // required top-level body field named `data`; an unwrapped payload 422s.
      body: JSON.stringify({ data: body }),
      cache: "no-store",
      signal: AbortSignal.timeout(RUNPOD_TIMEOUT_MS),
    });
  } catch (err) {
    // Network-level failure (e.g. ECONNREFUSED) or timeout (AbortError). Return
    // null so callers fall back to their next data source instead of hanging or
    // throwing a 500.
    console.error(`[runpodBackend] POST ${joinUrl(baseUrl, path)} failed:`, err);
    return null;
  }
}

export function hasRunpodScraper(): boolean {
  return Boolean(SCRAPER_BASE_URL);
}

export function hasRunpodVision(): boolean {
  return Boolean(VISION_BASE_URL);
}

export async function searchRunpodListings(body: {
  query: string;
  location?: string;
  limit?: number;
}): Promise<Response | null> {
  return postJson(SCRAPER_BASE_URL, endpointPath(SCRAPER_BASE_URL, "scraper_ep", "/search"), body);
}

export async function getRunpodListings(body: {
  url?: string;
  urls?: string[];
}): Promise<Response | null> {
  return postJson(SCRAPER_BASE_URL, endpointPath(SCRAPER_BASE_URL, "scraper_ep", "/listing"), body);
}

export async function detectRunpodDefects(body: {
  image_urls: string[];
}): Promise<Response | null> {
  return postJson(VISION_BASE_URL, endpointPath(VISION_BASE_URL, "vision_ep", "/defects"), body);
}
