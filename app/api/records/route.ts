import axios from "axios";
import { NextResponse } from "next/server";

const UPSTREAM_API_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL ?? "http://220.130.209.122:41432";
const RECORDS_API_URL = `${UPSTREAM_API_BASE_URL.replace(/\/$/, "")}/records`;

export const maxDuration = 180;

export async function GET() {
  try {
    const response = await axios.get(RECORDS_API_URL, {
      headers: {
        accept: "application/json",
      },
      timeout: 180_000,
    });

    const upstream = response.data;

    return NextResponse.json({
      records: upstream,
      upstream,
      upstreamStatus: response.status,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const upstreamStatus = error.response?.status ?? 502;
      const upstream = error.response?.data ?? error.message;

      return NextResponse.json(
        {
          error: "Không thể tải danh sách records từ API nguồn.",
          detail: upstream,
          upstream,
          upstreamStatus,
        },
        { status: upstreamStatus },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tải records." },
      { status: 500 },
    );
  }
}
