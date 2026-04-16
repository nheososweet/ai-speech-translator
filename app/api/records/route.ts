import axios from "axios";
import { NextResponse } from "next/server";

const UPSTREAM_API_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL ?? "http://220.130.209.122:41432";
const RECORDS_API_URL = `${UPSTREAM_API_BASE_URL.replace(/\/$/, "")}/records`;

export async function GET() {
  try {
    const response = await axios.get(RECORDS_API_URL, {
      headers: {
        accept: "application/json",
      },
      timeout: 60_000,
    });

    return NextResponse.json({ records: response.data });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Không thể tải danh sách records từ API nguồn.",
          detail: error.response?.data ?? error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tải records." },
      { status: 500 },
    );
  }
}
