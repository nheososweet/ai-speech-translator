import axios from "axios";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import {
  extractAgentResponseText,
  resolveAgentExternalApiUrl,
} from "@/lib/agent-config";
import type { SpeakerSummary } from "@/lib/types/meeting";

const AGENT_SPEAKER_SUMMARY_API_URL = resolveAgentExternalApiUrl();
const AGENT_SPEAKER_SUMMARY_API_KEY =
  process.env.AGENT_SPEAKER_SUMMARY_API_KEY;
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

function normalizeSpeakerSummaries(payload: unknown): SpeakerSummary[] {
  const parseArray = (value: unknown): SpeakerSummary[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const summary = item as {
          speaker?: unknown;
          keyPoints?: unknown;
        };

        if (typeof summary.speaker !== "string" || !summary.speaker.trim()) {
          return null;
        }

        const keyPoints = Array.isArray(summary.keyPoints)
          ? summary.keyPoints
              .map((point) => String(point ?? "").trim())
              .filter((point) => point.length > 0)
          : [];

        if (!keyPoints.length) {
          return null;
        }

        return {
          speaker: summary.speaker.trim(),
          keyPoints,
        };
      })
      .filter((item): item is SpeakerSummary => Boolean(item));
  };

  if (Array.isArray(payload)) {
    return parseArray(payload);
  }

  if (typeof payload !== "string" || !payload.trim()) {
    return [];
  }

  const trimmed = payload.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return parseArray(JSON.parse(withoutFence));
  } catch {
    const match = withoutFence.match(/\[[\s\S]*\]/);
    if (!match) {
      return [];
    }

    try {
      return parseArray(JSON.parse(match[0]));
    } catch {
      return [];
    }
  }
}
export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    if (!AGENT_SPEAKER_SUMMARY_API_KEY) {
      return NextResponse.json(
        { error: "Thiếu AGENT_SPEAKER_SUMMARY_API_KEY trong môi trường." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      transcriptLines?: string[];
      sessionId?: string;
    };

    const transcriptLines = Array.isArray(body.transcriptLines)
      ? body.transcriptLines
          .map((line) => String(line ?? "").trim())
          .filter((line) => line.length > 0)
      : [];

    if (!transcriptLines.length) {
      return NextResponse.json(
        { error: "Thiếu transcriptLines để tạo tóm tắt theo người nói." },
        { status: 400 },
      );
    }

    const sessionId =
      body.sessionId?.trim() || "my-speaker-summary-session-001";

    const transcriptMessage = transcriptLines.join("\n");

    const promptMessage = [
      "Bạn là trợ lý tóm tắt hội thoại.",
      "Nhiệm vụ: tóm tắt ý chính theo từng người nói từ transcript bên dưới.",
      "Trả về DUY NHẤT JSON array, không thêm markdown hoặc giải thích.",
      'Schema bắt buộc: [{"speaker":"Người 0","keyPoints":["...","..."]}]',
      "Mỗi người nói có 2-4 ý chính ngắn gọn, rõ ràng.",
      "Transcript:",
      transcriptMessage,
    ].join("\n\n");

    const response = await axios.post<Readable>(
      AGENT_SPEAKER_SUMMARY_API_URL,
      {
        session_id: sessionId,
        message: promptMessage,
      },
      {
        headers: {
          Authorization: `Bearer ${AGENT_SPEAKER_SUMMARY_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        },
        responseType: "stream",
        timeout: AGENT_STREAM_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );

    const fullText = await readUpstreamStreamToText(response.data);

    if (response.status >= 400) {
      return NextResponse.json(
        {
          error: "External API error",
          detail: fullText,
          status: response.status,
          upstream: fullText,
          upstreamStatus: response.status,
        },
        { status: response.status },
      );
    }

    console.log("DONE EXTERNAL API", {
      elapsedMs: Date.now() - startedAt,
      size: fullText.length,
    });

    // 👉 extract & normalize như cũ
    const agentText = extractAgentResponseText(fullText);
    const speakerSummaries = normalizeSpeakerSummaries(agentText);

    if (!speakerSummaries.length) {
      return NextResponse.json(
        {
          error: "Agent trả về dữ liệu rỗng hoặc sai schema.",
          raw: fullText,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      speakerSummaries,
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
          error: "Lỗi khi gọi external agent API",
          detail: upstream,
          upstream,
          upstreamStatus,
        },
        { status: upstreamStatus },
      );
    }

    return NextResponse.json(
      {
        error: "Lỗi khi gọi external agent API",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}