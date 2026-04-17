import axios from "axios";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { extractAgentResponseText, resolveAgentExternalApiUrl } from "@/lib/agent-config";

const AGENT_API_URL = resolveAgentExternalApiUrl();
const AGENT_API_KEY = process.env.AGENT_MINUTES_API_KEY;
const AGENT_STREAM_TIMEOUT_MS = 1_200_000;
const SSE_DONE_MARKER = /data:\s*\[DONE\]/i;

export const maxDuration = 1200;

async function readUpstreamStreamToText(
  stream: Readable,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let fullText = "";

    const finalize = (value: string) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(value);
    };

    stream.on("data", (chunk: unknown) => {
      const chunkText = Buffer.isBuffer(chunk)
        ? chunk.toString("utf8")
        : String(chunk ?? "");

      fullText += chunkText;

      // Some SSE servers keep the connection open after [DONE].
      if (SSE_DONE_MARKER.test(fullText)) {
        stream.destroy();
        finalize(fullText);
      }
    });

    stream.on("end", () => finalize(fullText));
    stream.on("close", () => finalize(fullText));
    stream.on("error", (error) => {
      if (!settled) {
        reject(error);
      }
    });
  });
}

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

    const response = await axios.post<Readable>(
      AGENT_API_URL,
      {
        session_id: sessionId,
        message: rawTranscript,
      },
      {
        headers: {
          Authorization: `Bearer ${AGENT_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        },
        responseType: "stream",
        timeout: AGENT_STREAM_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );

    const upstream = await readUpstreamStreamToText(response.data);

    if (response.status >= 400) {
      return NextResponse.json(
        {
          error: "Không gọi được external agent API.",
          detail: upstream,
          upstream,
          upstreamStatus: response.status,
        },
        { status: response.status },
      );
    }

    const minutesMarkdown = extractAgentResponseText(upstream);
    if (!minutesMarkdown) {
      return NextResponse.json(
        {
          error:
            "Agent trả về dữ liệu rỗng hoặc định dạng chưa hỗ trợ. Kiểm tra response schema thực tế.",
          raw: upstream,
          upstream,
          upstreamStatus: response.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      minutesMarkdown,
      upstream,
      upstreamStatus: response.status,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const upstreamStatus = error.response?.status ?? 502;
      const upstream =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.message;

      return NextResponse.json(
        {
          error: "Không gọi được external agent API.",
          detail: upstream,
          upstream,
          upstreamStatus,
        },
        { status: upstreamStatus },
      );
    }

    return NextResponse.json(
      { error: "Lỗi không xác định khi tạo biên bản." },
      { status: 500 },
    );
  }
}
