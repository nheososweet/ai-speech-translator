import axios from "axios";
import { NextResponse } from "next/server";

export const maxDuration = 1200;

function safeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceUrl = url.searchParams.get("url");
  const filenameParam = url.searchParams.get("filename");

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Thiếu tham số url để tải file." },
      { status: 400 },
    );
  }

  try {
    const parsed = new URL(sourceUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ http/https cho url tải file." },
        { status: 400 },
      );
    }

    const response = await axios.get<ArrayBuffer>(sourceUrl, {
      responseType: "arraybuffer",
      timeout: 1_200_000,
    });

    const fallbackName = parsed.pathname.split("/").pop() || "download.bin";
    const filename = safeFilename(filenameParam || fallbackName);
    const upstreamContentType = response.headers["content-type"] as
      | string
      | undefined;
    const upstreamContentLength = response.headers["content-length"] as
      | string
      | undefined;

    return new NextResponse(response.data, {
      status: response.status,
      headers: {
        "Content-Type": upstreamContentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        ...(upstreamContentLength
          ? { "Content-Length": upstreamContentLength }
          : {}),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const upstreamStatus = error.response?.status ?? 502;
      const upstream = error.response?.data ?? error.message;

      return NextResponse.json(
        {
          error: "Không thể tải file từ nguồn.",
          detail: upstream,
          upstream,
          upstreamStatus,
        },
        { status: upstreamStatus },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tải file." },
      { status: 500 },
    );
  }
}
