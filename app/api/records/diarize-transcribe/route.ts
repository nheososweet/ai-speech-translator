import { NextResponse } from "next/server";

const UPSTREAM_API_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL ?? "http://220.130.209.122:41432";
const DIARIZE_TRANSCRIBE_API_URL = `${UPSTREAM_API_BASE_URL.replace(/\/$/, "")}/diarize-and-transcribe`;

export async function POST(request: Request) {
  try {
    const incomingFormData = await request.formData();
    const file = incomingFormData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Thiếu file audio để xử lý transcript." },
        { status: 400 },
      );
    }

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);

    const upstreamResponse = await fetch(DIARIZE_TRANSCRIBE_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
      },
      body: upstreamFormData,
      cache: "no-store",
    });

    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const isJson = contentType.toLowerCase().includes("application/json");
    const payload = isJson
      ? await upstreamResponse.json()
      : await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: "Không thể xử lý diarize/transcribe từ API nguồn.",
          detail: payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Lỗi không xác định khi gọi API diarize/transcribe.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
