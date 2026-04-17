import axios from "axios";
import { NextResponse } from "next/server";

export const maxDuration = 1200;

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
      timeout: 1_200_000,
    });

    const upstream = response.data ?? "";

    return NextResponse.json({
      content: upstream,
      upstream,
      upstreamStatus: response.status,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const upstreamStatus = error.response?.status ?? 502;
      const upstream = error.response?.data ?? error.message;

      return NextResponse.json(
        {
          error: "Không thể đọc transcript từ nguồn.",
          detail: upstream,
          upstream,
          upstreamStatus,
        },
        { status: upstreamStatus },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tải transcript." },
      { status: 500 },
    );
  }
}
