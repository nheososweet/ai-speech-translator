import axios from "axios";
import { NextResponse } from "next/server";

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
      timeout: 60_000,
    });

    const fallbackName = parsed.pathname.split("/").pop() || "download.bin";
    const filename = safeFilename(filenameParam || fallbackName);

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type":
          (response.headers["content-type"] as string | undefined) ||
          "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Không thể tải file từ nguồn.",
          detail: error.response?.data ?? error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tải file." },
      { status: 500 },
    );
  }
}
