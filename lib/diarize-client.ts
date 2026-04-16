import axios from "axios";

const appApiClient = axios.create({
  baseURL: "/api",
  timeout: 120_000,
});

export interface DiarizeTranscribeApiResponse {
  id?: number;
  filename: string;
  status: string;
  rawTranscription: string[];
  refinedTranscription: string[];
  audio_url?: string;
  transcribe_url?: string;
}

export async function diarizeAndTranscribe(
  file: File,
): Promise<DiarizeTranscribeApiResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await appApiClient.post("/records/diarize-transcribe", formData, {
    headers: {
      accept: "application/json",
    },
  });

  const payload = response.data as {
    id?: unknown;
    filename?: unknown;
    status?: unknown;
    transcription?: unknown;
    raw_transcription?: unknown;
    refined_transcription?: unknown;
    audio_url?: unknown;
    transcribe_url?: unknown;
  };

  const rawTranscriptionCandidate = Array.isArray(payload?.raw_transcription)
    ? payload.raw_transcription
    : payload?.transcription;

  const refinedTranscriptionCandidate = Array.isArray(payload?.refined_transcription)
    ? payload.refined_transcription
    : rawTranscriptionCandidate;

  if (!Array.isArray(rawTranscriptionCandidate)) {
    throw new Error("API diarize/transcribe trả về dữ liệu không hợp lệ.");
  }

  return {
    id:
      typeof payload.id === "number" && payload.id > 0
        ? payload.id
        : undefined,
    filename:
      typeof payload.filename === "string" && payload.filename.trim()
        ? payload.filename
        : file.name,
    status:
      typeof payload.status === "string" && payload.status.trim()
        ? payload.status
        : "success",
    rawTranscription: rawTranscriptionCandidate.map((line) =>
      String(line ?? ""),
    ),
    refinedTranscription: Array.isArray(refinedTranscriptionCandidate)
      ? refinedTranscriptionCandidate.map((line) => String(line ?? ""))
      : rawTranscriptionCandidate.map((line) => String(line ?? "")),
    audio_url:
      typeof payload.audio_url === "string" && payload.audio_url.trim()
        ? payload.audio_url
        : undefined,
    transcribe_url:
      typeof payload.transcribe_url === "string" && payload.transcribe_url.trim()
        ? payload.transcribe_url
        : undefined,
  };
}
