import axios from "axios";

import type { SpeakerSummary } from "@/lib/types/meeting";

const appApiClient = axios.create({
  baseURL: "/api",
  timeout: 60_000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
