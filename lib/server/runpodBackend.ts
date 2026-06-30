type JsonObject = Record<string, unknown>;

const SCRAPER_BASE_URL =
  process.env.RUNPOD_SCRAPER_BASE_URL || process.env.RUNPOD_BACKEND_BASE_URL || "";
const VISION_BASE_URL =
  process.env.RUNPOD_VISION_BASE_URL || process.env.RUNPOD_BACKEND_BASE_URL || "";

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
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
      body: JSON.stringify(body),
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
  return postJson(SCRAPER_BASE_URL, "/search", body);
}

export async function getRunpodListings(body: {
  url?: string;
  urls?: string[];
}): Promise<Response | null> {
  return postJson(SCRAPER_BASE_URL, "/listing", body);
}

export async function detectRunpodDefects(body: {
  image_urls: string[];
}): Promise<Response | null> {
  return postJson(VISION_BASE_URL, "/defects", body);
}
