import axios from "axios";

const appApiClient = axios.create({
  baseURL: "/api",
  timeout: 60_000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
