import axios from "axios";
import { NextResponse } from "next/server";

import {
  extractAgentResponseText,
  resolveAgentExternalApiUrl,
} from "@/lib/agent-config";

const AGENT_EMAIL_API_URL = resolveAgentExternalApiUrl();
const AGENT_EMAIL_API_KEY = process.env.AGENT_MOM_EMAIL_API_KEY;

export async function POST(request: Request) {
  try {
    if (!AGENT_EMAIL_API_KEY) {
      return NextResponse.json(
        { error: "Thiếu AGENT_MOM_EMAIL_API_KEY trong môi trường." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      recipients?: string[];
      meetingTitle?: string;
      minutes?: string;
      rawTranscript?: string;
      reportUrl?: string;
      sessionId?: string;
    };

    const recipients = Array.isArray(body.recipients)
      ? body.recipients
          .map((recipient) => String(recipient ?? "").trim())
          .filter((recipient) => recipient.length > 0)
      : [];

    if (!recipients.length) {
      return NextResponse.json(
        { error: "Thiếu danh sách email người nhận." },
        { status: 400 },
      );
    }

    const sessionId =
      body.sessionId?.trim() ||
      process.env.NEXT_PUBLIC_AGENT_MOM_EMAIL_SESSION_ID ||
      "my-send-email-agent-session-001";

    const promptMessage = [
      "Bạn là agent gửi email tự động.",
      "Hãy thực hiện gửi email theo nghiệp vụ đã được cấu hình nội bộ của bạn.",
      `Người nhận (cách nhau dấu phẩy): ${recipients.join(", ")}`,
      `Tiêu đề cuộc họp: ${body.meetingTitle?.trim() || "Không có tiêu đề"}`,
      `Biên bản: ${(body.minutes ?? "").trim() || "Chưa có biên bản"}`,
      `URL file biên bản: ${body.reportUrl?.trim() || "Chưa có link file"}`,
      `Transcript: ${(body.rawTranscript ?? "").trim() || "Chưa có transcript"}`,
      "Sau khi xử lý, phản hồi ngắn gọn trạng thái gửi mail.",
    ].join("\n\n");

    const response = await axios.post(
      AGENT_EMAIL_API_URL,
      {
        session_id: sessionId,
        message: promptMessage,
      },
      {
        headers: {
          Authorization: `Bearer ${AGENT_EMAIL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      },
    );

    const resultText = extractAgentResponseText(response.data);
    if (!resultText) {
      return NextResponse.json(
        {
          error: "Agent gửi mail trả về dữ liệu rỗng.",
          raw: response.data,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ resultText });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Không gọi được external agent API cho gửi mail.",
          detail: error.response?.data ?? error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi gửi mail qua agent." },
      { status: 500 },
    );
  }
}