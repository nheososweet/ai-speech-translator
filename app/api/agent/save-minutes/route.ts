import { NextRequest, NextResponse } from "next/server";

interface SaveMinutesRequest {
  id: number;
  textContent: string;
}

interface SaveMinutesResponse {
  status: "success" | "error";
  reportUrl?: string;
  error?: string;
  detail?: unknown;
  upstream?: unknown;
  upstreamStatus?: number;
}

export const maxDuration = 1200;

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SaveMinutesResponse>> {
  try {
    const body: SaveMinutesRequest = await request.json();

    if (!body.id || body.textContent === undefined) {
      return NextResponse.json(
        {
          status: "error",
          error: "Missing required fields: id and textContent",
        },
        { status: 400 },
      );
    }

    // Call external API to save minutes and get report URL
    const externalApiUrl = "http://220.130.209.122:41432/update-report";
    const formData = new URLSearchParams();
    formData.append("id", String(body.id));
    formData.append("text_content", body.textContent);

    const externalResponse = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(1_200_000),
    });

    const contentType = externalResponse.headers.get("content-type") ?? "";
    const isJson = contentType.toLowerCase().includes("application/json");
    const externalPayload = isJson
      ? await externalResponse.json()
      : await externalResponse.text();

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          status: "error",
          error: "External API error.",
          detail: externalPayload,
          upstream: externalPayload,
          upstreamStatus: externalResponse.status,
        },
        { status: externalResponse.status },
      );
    }

    if (!externalPayload || typeof externalPayload !== "object") {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid response format from external API",
          upstream: externalPayload,
          upstreamStatus: externalResponse.status,
        },
        { status: 502 },
      );
    }

    const externalData = externalPayload as {
      status?: unknown;
      report_url?: unknown;
    };

    if (externalData.status !== "success" || !externalData.report_url) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid response from external API",
          upstream: externalPayload,
          upstreamStatus: externalResponse.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: "success",
      reportUrl: String(externalData.report_url),
      upstream: externalPayload,
      upstreamStatus: externalResponse.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        status: "error",
        error: `Failed to save minutes: ${message}`,
      },
      { status: 500 },
    );
  }
}
