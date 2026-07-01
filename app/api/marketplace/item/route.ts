// MRI v3 — proxy to the ScrapeCreators Marketplace Item endpoint.
// Fetches item details by Marketplace item id or listing URL.

import { getRunpodListings } from "@/lib/server/runpodBackend";
import { parseJsonResponse, responseDebugInfo } from "@/lib/server/httpResponse";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const url = searchParams.get("url");

  if (!id && !url) {
    return Response.json({ error: "Provide an `id` or `url` param" }, { status: 400 });
  }

  if (url) {
    const runpodResponse = await getRunpodListings({ url, urls: [url] });
    if (runpodResponse) {
      const parsed = await parseJsonResponse(runpodResponse);
      if (parsed.ok) {
        const data = parsed.data ?? {};
        if (runpodResponse.ok) return Response.json(data, { status: runpodResponse.status });
        console.error("[/api/marketplace/item] RunPod error:", data);
      } else {
        console.error(
          "[/api/marketplace/item] RunPod returned non-JSON response:",
          responseDebugInfo(runpodResponse, parsed)
        );
      }
    }
  }

  if (!process.env.SCRAPECREATORS_API_KEY) {
    return Response.json(
      { error: "SCRAPECREATORS_API_KEY not configured" },
      { status: 503 }
    );
  }

  const upstream = new URL(
    "https://api.scrapecreators.com/v1/facebook/marketplace/item"
  );

  if (id) upstream.searchParams.set("id", id);
  if (url) upstream.searchParams.set("url", url);

  try {
    const response = await fetch(upstream.toString(), {
      headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY },
      cache: "no-store",
    });
    const parsed = await parseJsonResponse(response);
    if (parsed.ok) return Response.json(parsed.data ?? {}, { status: response.status });

    console.error(
      "[/api/marketplace/item] ScrapeCreators returned non-JSON response:",
      responseDebugInfo(response, parsed)
    );
    return Response.json({ error: "Upstream item response was not valid JSON" }, { status: 502 });
  } catch (err) {
    console.error("[/api/marketplace/item] upstream error:", err);
    return Response.json({ error: "Upstream item lookup failed" }, { status: 502 });
  }
}
