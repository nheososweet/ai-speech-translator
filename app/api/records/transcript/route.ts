import axios from "axios";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transcriptUrl = url.searchParams.get("url");

  if (!transcriptUrl) {
    return NextResponse.json(
      { error: "Thiếu tham số url transcript." },
      { status: 400 },
    );
  }

  try {
    const parsed = new URL(transcriptUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ http/https cho transcript url." },
        { status: 400 },
      );
    }

    const response = await axios.get<string>(transcriptUrl, {
      responseType: "text",
      timeout: 60_000,
    });

    return NextResponse.json({ content: response.data ?? "" });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Không thể đọc transcript từ nguồn.",
          detail: error.response?.data ?? error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tải transcript." },
      { status: 500 },
    );
  }
}
