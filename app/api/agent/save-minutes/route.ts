import { NextRequest, NextResponse } from "next/server";

interface SaveMinutesRequest {
  id: number;
  textContent: string;
}

interface SaveMinutesResponse {
  status: "success" | "error";
  reportUrl?: string;
  error?: string;
}

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
    });

    if (!externalResponse.ok) {
      const error = await externalResponse.text();
      return NextResponse.json(
        {
          status: "error",
          error: `External API error: ${externalResponse.statusText} - ${error}`,
        },
        { status: externalResponse.status },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const externalData: any = await externalResponse.json();

    if (externalData.status !== "success" || !externalData.report_url) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid response from external API",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "success",
      reportUrl: externalData.report_url,
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
