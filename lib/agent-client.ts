import axios from "axios";

import type { SpeakerSummary } from "@/lib/types/meeting";

const DEFAULT_AGENT_EXTERNAL_API_URL = "https://agent.svisor.vn/api/external/chat";
const DIRECT_SPEAKER_SUMMARY_MODE =
  process.env.NEXT_PUBLIC_SPEAKER_SUMMARY_DIRECT_MODE === "true";
const DIRECT_AGENT_EXTERNAL_API_URL =
  process.env.NEXT_PUBLIC_AGENT_EXTERNAL_API_URL ?? DEFAULT_AGENT_EXTERNAL_API_URL;
const DIRECT_AGENT_SPEAKER_SUMMARY_API_KEY =
  process.env.NEXT_PUBLIC_AGENT_SPEAKER_SUMMARY_API_KEY;

const appApiClient = axios.create({
  baseURL: "/api",
  timeout: 1_200_000,
  headers: {
    "Content-Type": "application/json",
  },
});

function extractTextFromSseStream(raw: string): string {
  if (!raw.includes("data:")) {
    return "";
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"));

  const chunks: string[] = [];

  for (const line of lines) {
    const dataPart = line.slice(5).trim();
    if (!dataPart) {
      continue;
    }

    try {
      const parsed = JSON.parse(dataPart) as { text?: unknown };

      if (typeof parsed.text === "string") {
        chunks.push(parsed.text);
      }
    } catch {
      // Ignore malformed stream chunks and continue best-effort parsing.
    }
  }

  return chunks.join("").trim();
}

function extractAgentResponseText(payload: unknown): string {
  if (typeof payload === "string") {
    const streamed = extractTextFromSseStream(payload);
    return streamed || payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const data = payload as {
    message?: unknown;
    output?: unknown;
    content?: unknown;
    response?: unknown;
    data?: unknown;
  };

  const direct = [data.output, data.content, data.response, data.message].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  if (typeof direct === "string") {
    return direct.trim();
  }

  if (typeof data.data === "string") {
    const streamed = extractTextFromSseStream(data.data);
    return streamed || data.data.trim();
  }

  return "";
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

        const summary = item as { speaker?: unknown; keyPoints?: unknown };

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

export async function generateMinutesFromTranscript(input: {
  rawTranscript: string;
  sessionId?: string;
}): Promise<string> {
  const response = await appApiClient.post("/agent/minutes", {
    rawTranscript: input.rawTranscript,
    sessionId: input.sessionId,
  });

  const minutesMarkdown = response.data?.minutesMarkdown;
  if (typeof minutesMarkdown !== "string" || !minutesMarkdown.trim()) {
    throw new Error("Không lấy được biên bản từ proxy API.");
  }

  return minutesMarkdown.trim();
}

export async function generateSpeakerSummariesFromTranscriptLines(input: {
  transcriptLines: string[];
  sessionId?: string;
}): Promise<SpeakerSummary[]> {
  if (DIRECT_SPEAKER_SUMMARY_MODE) {
    if (!DIRECT_AGENT_SPEAKER_SUMMARY_API_KEY?.trim()) {
      throw new Error(
        "Thiếu NEXT_PUBLIC_AGENT_SPEAKER_SUMMARY_API_KEY cho chế độ gọi trực tiếp external API.",
      );
    }

    const transcriptLines = Array.isArray(input.transcriptLines)
      ? input.transcriptLines
          .map((line) => String(line ?? "").trim())
          .filter((line) => line.length > 0)
      : [];

    if (!transcriptLines.length) {
      throw new Error("Thiếu transcriptLines để tạo tóm tắt theo người nói.");
    }

    const sessionId =
      input.sessionId?.trim() ||
      process.env.NEXT_PUBLIC_AGENT_SPEAKER_SUMMARY_SESSION_ID ||
      "my-speaker-summary-session-001";

    const promptMessage = [
      "Bạn là trợ lý tóm tắt hội thoại.",
      "Nhiệm vụ: tóm tắt ý chính theo từng người nói từ transcript bên dưới.",
      "Trả về DUY NHẤT JSON array, không thêm markdown hoặc giải thích.",
      'Schema bắt buộc: [{"speaker":"Người 0","keyPoints":["...","..."]}]',
      "Mỗi người nói có 2-4 ý chính ngắn gọn, rõ ràng.",
      "Transcript:",
      transcriptLines.join("\n"),
    ].join("\n\n");

    let response;

    try {
      response = await axios.post(
        DIRECT_AGENT_EXTERNAL_API_URL,
        {
          session_id: sessionId,
          message: promptMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${DIRECT_AGENT_SPEAKER_SUMMARY_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 1_200_000,
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail =
          typeof error.response?.data === "string"
            ? error.response.data
            : error.message;

        throw new Error(
          status
            ? `Gọi external API trực tiếp thất bại (status ${status}): ${detail}`
            : `Gọi external API trực tiếp thất bại (network/CORS): ${detail}`,
        );
      }

      throw error;
    }

    const agentText = extractAgentResponseText(response.data);
    const speakerSummaries = normalizeSpeakerSummaries(agentText);

    if (!speakerSummaries.length) {
      throw new Error("External API trả dữ liệu tóm tắt không hợp lệ.");
    }

    return speakerSummaries;
  }

  const response = await appApiClient.post("/agent/speaker-summary", {
    transcriptLines: input.transcriptLines,
    sessionId: input.sessionId,
  });

  const speakerSummaries = response.data?.speakerSummaries;
  if (!Array.isArray(speakerSummaries) || speakerSummaries.length === 0) {
    throw new Error("Không lấy được tóm tắt theo người nói từ proxy API.");
  }

  return speakerSummaries as SpeakerSummary[];
}

export async function sendMeetingEmailViaAgent(input: {
  recipients: string[];
  meetingTitle: string;
  minutes: string;
  rawTranscript: string;
  reportUrl?: string;
  sessionId?: string;
}): Promise<string> {
  const response = await appApiClient.post("/agent/send-email", {
    recipients: input.recipients,
    meetingTitle: input.meetingTitle,
    minutes: input.minutes,
    rawTranscript: input.rawTranscript,
    reportUrl: input.reportUrl,
    sessionId: input.sessionId,
  });

  const resultText = response.data?.resultText;
  if (typeof resultText !== "string" || !resultText.trim()) {
    throw new Error("Không lấy được kết quả gửi mail từ proxy API.");
  }

  return resultText.trim();
}
