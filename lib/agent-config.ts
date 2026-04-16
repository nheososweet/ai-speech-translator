const DEFAULT_AGENT_EXTERNAL_API_URL =
  "https://agent.svisor.vn/api/external/chat";

type AgentResponseData = {
  message?: string;
  output?: string;
  content?: string;
  response?: string;
  data?: unknown;
};

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

export function resolveAgentExternalApiUrl(): string {
  return (
    process.env.AGENT_EXTERNAL_API_URL ??
    process.env.AGENT_API_URL ??
    DEFAULT_AGENT_EXTERNAL_API_URL
  );
}

export function extractAgentResponseText(payload: unknown): string {
  if (typeof payload === "string") {
    const streamed = extractTextFromSseStream(payload);
    return streamed || payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const data = payload as AgentResponseData;
  const direct = [data.output, data.content, data.response, data.message].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  if (direct) {
    return direct.trim();
  }

  if (typeof data.data === "string") {
    const streamed = extractTextFromSseStream(data.data);
    return streamed || data.data.trim();
  }

  return "";
}
