// PedalBot v3 — proxy to the ScrapeCreators Marketplace Search endpoint.
// Keeps SCRAPECREATORS_API_KEY server-side; forwards all query params through.

export async function GET(req: Request) {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    return Response.json(
      { error: "SCRAPECREATORS_API_KEY not configured", listings: [] },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const upstream = new URL(
    "https://api.scrapecreators.com/v1/facebook/marketplace/search"
  );
  for (const [key, value] of searchParams.entries()) {
    upstream.searchParams.set(key, value);
  }

  try {
    const response = await fetch(upstream.toString(), {
      headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY },
      cache: "no-store",
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (err) {
    console.error("[/api/marketplace/search] upstream error:", err);
    return Response.json({ error: "Upstream search failed", listings: [] }, { status: 502 });
  }
}
