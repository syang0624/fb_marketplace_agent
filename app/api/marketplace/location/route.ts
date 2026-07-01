// MRI v3 — proxy to the ScrapeCreators Marketplace Location Search.
// Turns a location string into coordinates. Falls back to San Francisco coords
// if the key is missing or the upstream call fails, so search always proceeds.

import { parseJsonResponse, responseDebugInfo } from "@/lib/server/httpResponse";

const SF_FALLBACK = { lat: 37.7749, lng: -122.4194, location: "San Francisco, CA", fallback: true };

const SF_EXACT = { ...SF_FALLBACK, fallback: false };

function isSanFranciscoQuery(query: string): boolean {
  const normalized = query
    .toLowerCase()
    .replace(/\b(california|ca|usa|united states|bay area)\b/g, "")
    .replace(/[^a-z]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized === "san francisco" || normalized === "sf";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") ?? "";

  if (isSanFranciscoQuery(query)) {
    return Response.json(SF_EXACT);
  }

  if (!process.env.SCRAPECREATORS_API_KEY) {
    return Response.json(SF_FALLBACK);
  }

  const upstream = new URL(
    "https://api.scrapecreators.com/v1/facebook/marketplace/location/search"
  );
  if (query) upstream.searchParams.set("query", query);

  try {
    const response = await fetch(upstream.toString(), {
      headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(Number(process.env.SCRAPECREATORS_TIMEOUT_MS || 15000)),
    });
    if (!response.ok) return Response.json(SF_FALLBACK);
    const parsed = await parseJsonResponse(response);
    if (parsed.ok) return Response.json(parsed.data ?? SF_FALLBACK, { status: response.status });

    console.error(
      "[/api/marketplace/location] ScrapeCreators returned non-JSON response, using SF fallback:",
      responseDebugInfo(response, parsed)
    );
    return Response.json(SF_FALLBACK);
  } catch (err) {
    console.error("[/api/marketplace/location] upstream error, using SF fallback:", err);
    return Response.json(SF_FALLBACK);
  }
}
