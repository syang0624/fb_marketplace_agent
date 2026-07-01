export type ParsedJsonResponse = {
  data: unknown;
  ok: boolean;
  contentType: string;
  bodyPreview: string;
  error?: string;
};

export async function parseJsonResponse(response: Response): Promise<ParsedJsonResponse> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return { data: null, ok: true, contentType, bodyPreview: "" };
  }

  try {
    return {
      data: JSON.parse(trimmed),
      ok: true,
      contentType,
      bodyPreview: trimmed.slice(0, 500),
    };
  } catch (err) {
    return {
      data: null,
      ok: false,
      contentType,
      bodyPreview: trimmed.slice(0, 500),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function responseDebugInfo(response: Response, parsed: ParsedJsonResponse) {
  return {
    status: response.status,
    statusText: response.statusText,
    contentType: parsed.contentType || "(missing)",
    bodyPreview: parsed.bodyPreview,
    error: parsed.error,
  };
}
