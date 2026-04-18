import { pipelineApi } from "@/services/pipeline-api";

interface UpstreamDiarizeTranscribeResponse {
  id?: unknown;
  filename?: unknown;
  status?: unknown;
  transcription?: unknown;
  raw_transcription?: unknown;
  refined_transcription?: unknown;
  audio_url?: unknown;
  transcribe_url?: unknown;
}

interface UpstreamUpdateReportResponse {
  status?: unknown;
  report_url?: unknown;
}

interface UpstreamRecord {
  id?: unknown;
  create_time?: unknown;
  audio_url?: unknown;
  transcribe_url?: unknown;
  report?: unknown;
  filename?: unknown;
}

interface UpstreamChatResponse {
  model?: unknown;
  reply?: unknown;
}

interface ChatReplyPayload {
  summary_by_speaker?: unknown;
  mom_markdown?: unknown;
}

interface ChatSummaryBySpeakerItem {
  speaker?: unknown;
  points?: unknown;
}

export interface DiarizeTranscribeResponse {
  id?: number;
  filename: string;
  status: string;
  rawTranscription: string[];
  refinedTranscription: string[];
  audioUrl?: string;
  transcribeUrl?: string;
}

export interface UpdateReportResponse {
  status: "success";
  reportUrl: string;
}

export interface PipelineRecord {
  id: number;
  createTime: string;
  audioUrl: string;
  transcribeUrl: string;
  reportUrl: string | null;
  filename: string;
}

export interface SpeakerSummaryFromChat {
  speaker: string;
  keyPoints: string[];
}

export interface SummaryAndMinutesResponse {
  speakerSummaries: SpeakerSummaryFromChat[];
  minutesMarkdown: string;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeChatReplyString(reply: string): string {
  const trimmed = reply.trim();

  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return trimmed;
}

function parseChatReplyPayload(reply: string): ChatReplyPayload {
  const normalizedReply = normalizeChatReplyString(reply);

  try {
    return JSON.parse(normalizedReply) as ChatReplyPayload;
  } catch {
    const firstBrace = normalizedReply.indexOf("{");
    const lastBrace = normalizedReply.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Chat API trả về reply không phải JSON hợp lệ.");
    }

    const slicedReply = normalizedReply.slice(firstBrace, lastBrace + 1);
    return JSON.parse(slicedReply) as ChatReplyPayload;
  }
}

export async function diarizeAndTranscribe(input: {
  file: File;
  language?: string;
}): Promise<DiarizeTranscribeResponse> {
  const formData = new FormData();
  formData.append("file", input.file, input.file.name);
  formData.append("language", input.language ?? "Vietnamese");

  const response = await pipelineApi.post<UpstreamDiarizeTranscribeResponse>(
    "/diarize-and-transcribe",
    formData,
  );

  const payload = response.data;

  const rawTranscription = ensureStringArray(
    Array.isArray(payload.raw_transcription)
      ? payload.raw_transcription
      : payload.transcription,
  );

  if (!rawTranscription.length) {
    throw new Error("API diarize/transcribe trả về dữ liệu không hợp lệ.");
  }

  const refinedTranscription = ensureStringArray(
    Array.isArray(payload.refined_transcription)
      ? payload.refined_transcription
      : payload.raw_transcription,
  );

  return {
    id: typeof payload.id === "number" ? payload.id : undefined,
    filename:
      typeof payload.filename === "string" && payload.filename.trim()
        ? payload.filename
        : input.file.name,
    status:
      typeof payload.status === "string" && payload.status.trim()
        ? payload.status
        : "success",
    rawTranscription,
    refinedTranscription: refinedTranscription.length
      ? refinedTranscription
      : rawTranscription,
    audioUrl:
      typeof payload.audio_url === "string" && payload.audio_url.trim()
        ? payload.audio_url
        : undefined,
    transcribeUrl:
      typeof payload.transcribe_url === "string" && payload.transcribe_url.trim()
        ? payload.transcribe_url
        : undefined,
  };
}

export async function updateReport(input: {
  id: number;
  textContent: string;
}): Promise<UpdateReportResponse> {
  const formData = new URLSearchParams();
  formData.append("id", String(input.id));
  formData.append("text_content", input.textContent);

  const response = await pipelineApi.post<UpstreamUpdateReportResponse>(
    "/update-report",
    formData.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const payload = response.data;

  if (payload.status !== "success" || typeof payload.report_url !== "string") {
    throw new Error("Không thể lưu biên bản từ API update-report.");
  }

  return {
    status: "success",
    reportUrl: payload.report_url,
  };
}

export async function generateSummaryAndMinutes(input: {
  transcriptLines: string[];
  model?: string;
}): Promise<SummaryAndMinutesResponse> {
  const mergedTranscript = input.transcriptLines
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join(" ");

  if (!mergedTranscript) {
    throw new Error("Thiếu transcript để gọi API chat.");
  }

  const response = await pipelineApi.post<UpstreamChatResponse>("/chat", {
    messages: [
      {
        role: "user",
        content: mergedTranscript,
      },
    ],
    model: input.model ?? "qwen3.5-flash-2026-02-23",
  });

  const reply = response.data?.reply;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Chat API không trả về nội dung reply hợp lệ.");
  }

  const payload = parseChatReplyPayload(reply);

  const summaryBySpeaker = Array.isArray(payload.summary_by_speaker)
    ? (payload.summary_by_speaker as ChatSummaryBySpeakerItem[])
    : [];

  const speakerSummaries: SpeakerSummaryFromChat[] = summaryBySpeaker
    .map((item) => {
      const speaker =
        typeof item.speaker === "string" && item.speaker.trim()
          ? item.speaker.trim()
          : "Người chưa xác định";
      const keyPoints = ensureStringArray(item.points);

      return {
        speaker,
        keyPoints,
      };
    })
    .filter((summary) => summary.keyPoints.length > 0);

  const minutesMarkdown =
    typeof payload.mom_markdown === "string" ? payload.mom_markdown.trim() : "";

  if (!minutesMarkdown) {
    throw new Error("Chat API không trả về mom_markdown hợp lệ.");
  }

  return {
    speakerSummaries,
    minutesMarkdown,
  };
}

export async function getRecords(): Promise<PipelineRecord[]> {
  const response = await pipelineApi.get<unknown>("/records");

  if (!Array.isArray(response.data)) {
    throw new Error("API records trả về dữ liệu không hợp lệ.");
  }

  return (response.data as UpstreamRecord[])
    .map((record): PipelineRecord | null => {
      if (
        typeof record.id !== "number" ||
        typeof record.create_time !== "string" ||
        typeof record.audio_url !== "string" ||
        typeof record.transcribe_url !== "string" ||
        typeof record.filename !== "string"
      ) {
        return null;
      }

      return {
        id: record.id,
        createTime: record.create_time,
        audioUrl: record.audio_url,
        transcribeUrl: record.transcribe_url,
        reportUrl:
          typeof record.report === "string" && record.report.trim()
            ? record.report
            : null,
        filename: record.filename,
      };
    })
    .filter((record): record is PipelineRecord => Boolean(record));
}
