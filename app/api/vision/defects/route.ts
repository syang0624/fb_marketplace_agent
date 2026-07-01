import { detectRunpodDefects } from "@/lib/server/runpodBackend";
import { parseJsonResponse, responseDebugInfo } from "@/lib/server/httpResponse";

export async function POST(req: Request) {
  const body = (await req.json()) as { image_urls?: string[]; imageUrls?: string[] };
  const imageUrls = body.image_urls ?? body.imageUrls ?? [];

  if (!imageUrls.length) {
    return Response.json({ reports: [] });
  }

  const runpodResponse = await detectRunpodDefects({ image_urls: imageUrls });
  if (!runpodResponse) {
    return Response.json(
      { error: "RUNPOD_VISION_BASE_URL or RUNPOD_BACKEND_BASE_URL not configured", reports: [] },
      { status: 503 }
    );
  }

  const parsed = await parseJsonResponse(runpodResponse);
  if (parsed.ok) {
    return Response.json(parsed.data ?? { reports: [] }, { status: runpodResponse.status });
  }

  console.error(
    "[/api/vision/defects] RunPod returned non-JSON response:",
    responseDebugInfo(runpodResponse, parsed)
  );
  return Response.json({ error: "RunPod vision response was not valid JSON", reports: [] }, { status: 502 });
}
