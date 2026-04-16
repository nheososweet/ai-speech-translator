import axios from "axios";
import { NextResponse } from "next/server";

import { extractAgentResponseText, resolveAgentExternalApiUrl } from "@/lib/agent-config";

const AGENT_API_URL = resolveAgentExternalApiUrl();
const AGENT_API_KEY = process.env.AGENT_MINUTES_API_KEY;

export async function POST(request: Request) {
  try {
    if (!AGENT_API_KEY) {
      return NextResponse.json(
        { error: "Thiếu AGENT_MINUTES_API_KEY trong môi trường." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      rawTranscript?: string;
      sessionId?: string;
    };

    const rawTranscript = body.rawTranscript?.trim();
    if (!rawTranscript) {
      return NextResponse.json(
        { error: "Thiếu rawTranscript để tạo biên bản." },
        { status: 400 },
      );
    }

    const sessionId =
      body.sessionId?.trim() ||
      process.env.NEXT_PUBLIC_AGENT_MINUTES_SESSION_ID ||
      "my-session-001";

    const response = await axios.post(
      AGENT_API_URL,
      {
        session_id: sessionId,
        message: rawTranscript,
      },
      {
        headers: {
          Authorization: `Bearer ${AGENT_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      },
    );

    const minutesMarkdown = extractAgentResponseText(response.data);
    if (!minutesMarkdown) {
      return NextResponse.json(
        {
          error:
            "Agent trả về dữ liệu rỗng hoặc định dạng chưa hỗ trợ. Kiểm tra response schema thực tế.",
          raw: response.data,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ minutesMarkdown });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Không gọi được external agent API.",
          detail: error.response?.data ?? error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tạo biên bản." },
      { status: 500 },
    );
  }
}
