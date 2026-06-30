// PedalBot v3 — proxy to the ScrapeCreators Marketplace Item endpoint.
// Fetches item details by Marketplace item id or listing URL.

export async function GET(req: Request) {
  if (!process.env.SCRAPECREATORS_API_KEY) {
    return Response.json(
      { error: "SCRAPECREATORS_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const upstream = new URL(
    "https://api.scrapecreators.com/v1/facebook/marketplace/item"
  );

  const id = searchParams.get("id");
  const url = searchParams.get("url");
  if (id) upstream.searchParams.set("id", id);
  if (url) upstream.searchParams.set("url", url);

  if (!id && !url) {
    return Response.json({ error: "Provide an `id` or `url` param" }, { status: 400 });
  }

  try {
    const response = await fetch(upstream.toString(), {
      headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY },
      cache: "no-store",
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (err) {
    console.error("[/api/marketplace/item] upstream error:", err);
    return Response.json({ error: "Upstream item lookup failed" }, { status: 502 });
  }
}
