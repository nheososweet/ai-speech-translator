import axios from "axios";
import { NextResponse } from "next/server";

const UPSTREAM_API_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL ?? "http://220.130.209.122:41432";
const DIARIZE_TRANSCRIBE_API_URL = `${UPSTREAM_API_BASE_URL.replace(/\/$/, "")}/diarize-and-transcribe`;
const DIARIZE_TRANSCRIBE_TIMEOUT_MS = 1_200_000;

export const maxDuration = 1200;

export async function POST(request: Request) {
  const startedAt = Date.now();

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

    const upstreamResponse = await axios.post(DIARIZE_TRANSCRIBE_API_URL, upstreamFormData, {
      headers: {
        accept: "application/json",
      },
      timeout: DIARIZE_TRANSCRIBE_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    const contentType =
      (upstreamResponse.headers["content-type"] as string | undefined) ?? "";
    const isJson = contentType.toLowerCase().includes("application/json");
    const rawPayload = upstreamResponse.data;
    const payload =
      isJson && typeof rawPayload === "string"
        ? (() => {
            try {
              return JSON.parse(rawPayload);
            } catch {
              return rawPayload;
            }
          })()
        : rawPayload;

    if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
      return NextResponse.json(
        {
          error: "Không thể xử lý diarize/transcribe từ API nguồn.",
          detail: payload,
          upstream: payload,
          upstreamStatus: upstreamResponse.status,
          elapsedMs: Date.now() - startedAt,
        },
        { status: upstreamResponse.status },
      );
    }

    if (isJson) {
      return NextResponse.json(payload, {
        status: upstreamResponse.status,
      });
    }

    return new NextResponse(String(payload ?? ""), {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType || "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorCode = error.code ?? "AXIOS_ERROR";
      const upstreamStatus = error.response?.status;
      const upstream = error.response?.data;

      return NextResponse.json(
        {
          error: "Lỗi khi gọi API diarize/transcribe.",
          detail: error.message,
          errorCode,
          elapsedMs: Date.now() - startedAt,
          ...(upstreamStatus ? { upstreamStatus } : {}),
          ...(upstream !== undefined ? { upstream } : {}),
        },
        {
          status: upstreamStatus ?? (errorCode === "ECONNABORTED" ? 504 : 500),
        },
      );
    }

    return NextResponse.json(
      {
        error: "Lỗi không xác định khi gọi API diarize/transcribe.",
        detail: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
