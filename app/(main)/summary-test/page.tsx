"use client";

import { useMemo, useState } from "react";
import { LoaderCircleIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateSpeakerSummariesFromTranscriptLines } from "@/lib/agent-client";
import type { SpeakerSummary } from "@/lib/types/meeting";

const SAMPLE_CONTENT = [
  "Người 0 (0.0s - 8.4s): Chúng ta cần chốt timeline release trong tuần này.",
  "Người 1 (8.5s - 19.2s): Em đã xong phần giao diện upload, còn phần ghi âm realtime.",
  "Người 0 (19.3s - 28.0s): Ưu tiên xử lý lỗi timeout ở API trước khi demo.",
  "Người 2 (28.1s - 35.7s): Em sẽ hỗ trợ test tải cao cho route summary.",
].join("\n");

function normalizeTranscriptLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function SummaryTestPage() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [sessionId, setSessionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speakerSummaries, setSpeakerSummaries] = useState<SpeakerSummary[]>([]);

  const transcriptLines = useMemo(
    () => normalizeTranscriptLines(content),
    [content],
  );

  async function handleRunSummary() {
    const lines = normalizeTranscriptLines(content);
    if (!lines.length) {
      setErrorMessage("Vui long nhap noi dung transcript truoc khi test.");
      setSpeakerSummaries([]);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await generateSpeakerSummariesFromTranscriptLines({
        transcriptLines: lines,
        sessionId: sessionId.trim() || undefined,
      });

      setSpeakerSummaries(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Khong goi duoc API summary. Vui long thu lai.";
      setErrorMessage(message);
      setSpeakerSummaries([]);
    } finally {
      setIsSubmitting(false);
    }
  }
  

  return (
    <div className="relative min-h-[calc(100svh-5rem)] overflow-hidden p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 top-4 size-72 rounded-full bg-cyan-200/55 blur-3xl" />
        <div className="absolute bottom-8 right-6 size-80 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(8,145,178,0.08)_0%,transparent_40%),radial-gradient(circle_at_80%_75%,rgba(14,116,144,0.08)_0%,transparent_48%)]" />
      </div>

      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-cyan-200/70 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8 dark:border-cyan-900/60 dark:bg-card/80">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-700 uppercase dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
            <SparklesIcon className="size-3.5" />
            Sandbox Summary API
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            Test nhanh API tom tat theo nguoi noi
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
            Dan content transcript vao o ben duoi, bam chay va xem ket qua
            speaker summary tra ve ngay tai man hinh nay.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Transcript input
              </h2>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {transcriptLines.length} dong hop le
              </span>
            </div>

            <label className="mb-2 block text-sm font-medium" htmlFor="summary-session-id">
              Session ID (tuy chon)
            </label>
            <input
              id="summary-session-id"
              type="text"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="my-speaker-summary-session-001"
              className="mb-4 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-ring/50 transition focus:ring-2"
            />

            <label className="mb-2 block text-sm font-medium" htmlFor="summary-content">
              Content
            </label>
            <textarea
              id="summary-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Nhap transcript moi dong la mot cau phat bieu..."
              className="min-h-80 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 outline-none ring-ring/50 transition focus:ring-2"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleRunSummary} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderCircleIcon className="size-4 animate-spin" />
                    Dang goi API...
                  </>
                ) : (
                  "Chay summary"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setContent(SAMPLE_CONTENT)}
                disabled={isSubmitting}
              >
                Nap du lieu mau
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setContent("");
                  setSpeakerSummaries([]);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting}
              >
                Xoa trang
              </Button>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                {errorMessage}
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm md:p-6">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Ket qua summary
            </h2>

            {!speakerSummaries.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                Chua co ket qua. Nhap content va bam Chay summary de test.
              </div>
            ) : (
              <div className="space-y-3">
                {speakerSummaries.map((summary) => (
                  <article
                    key={summary.speaker}
                    className="rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <h3 className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                      {summary.speaker}
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                      {summary.keyPoints.map((point, index) => (
                        <li key={`${summary.speaker}-${index}`}>{point}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Raw JSON
              </h3>
              <pre className="max-h-80 overflow-auto rounded-2xl border border-border bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                {JSON.stringify(speakerSummaries, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
