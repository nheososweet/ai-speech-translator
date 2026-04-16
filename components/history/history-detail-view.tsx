"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  Clock3Icon,
  LoaderCircleIcon,
  MailIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  UserRoundIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { EmailStatus, MeetingEmailLog, MeetingRecord } from "@/lib/types/meeting";

const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes} phút ${String(remainSeconds).padStart(2, "0")} giây`;
}

function resolveEmailStatusLabel(status: EmailStatus): string {
  if (status === "sent") {
    return "Đã gửi";
  }

  if (status === "failed") {
    return "Lỗi gửi";
  }

  return "Chưa gửi";
}

export function HistoryDetailView({ meeting }: { meeting: MeetingRecord }) {
  const [minutesText, setMinutesText] = useState(meeting.minutes);
  const [recipient, setRecipient] = useState(
    meeting.emailLogs[0]?.recipient ?? "team-core@company.vn",
  );
  const [emailLogs, setEmailLogs] = useState<MeetingEmailLog[]>(meeting.emailLogs);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(meeting.emailStatus);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "failed">(
    "idle",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSecond, setPlaybackSecond] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    meeting.segments[0]?.id ?? null,
  );

  const durationSecond = Math.max(meeting.durationSecond, 1);
  const playbackPercent = Math.min((playbackSecond / durationSecond) * 100, 100);

  const selectedSegment = useMemo(
    () =>
      selectedSegmentId
        ? meeting.segments.find((segment) => segment.id === selectedSegmentId)
        : undefined,
    [meeting.segments, selectedSegmentId],
  );

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = setInterval(() => {
      setPlaybackSecond((prev) => {
        if (prev >= durationSecond) {
          setIsPlaying(false);
          return durationSecond;
        }

        return prev + 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [durationSecond, isPlaying]);

  function handleResetPlayback() {
    setIsPlaying(false);
    setPlaybackSecond(0);
  }

  function handleJumpToSegment(segmentId: string, startSecond: number) {
    setSelectedSegmentId(segmentId);
    setPlaybackSecond(startSecond);
  }

  function handleSendMinutes() {
    if (sendStatus === "sending") {
      return;
    }

    if (!recipient.includes("@")) {
      setSendStatus("failed");
      setEmailStatus("failed");
      return;
    }

    setSendStatus("sending");

    setTimeout(() => {
      const log: MeetingEmailLog = {
        id: `email-${Date.now()}`,
        recipient,
        sentAt: new Date().toISOString(),
        status: "sent",
      };

      setEmailLogs((prev) => [log, ...prev]);
      setEmailStatus("sent");
      setSendStatus("sent");
    }, 1100);
  }

  function handleRefreshMinutes() {
    setMinutesText(
      `${meeting.minutes}\n4) Tổng hợp rủi ro mở và cập nhật người chịu trách nhiệm chính.`,
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{meeting.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{meeting.fileName}</p>
          </div>
          <div className="space-y-2">
            <p className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground">
              Email trạng thái: {resolveEmailStatusLabel(emailStatus)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleSendMinutes}
              disabled={sendStatus === "sending"}
            >
              {sendStatus === "sending" ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <MailIcon className="size-4" />
              )}
              Gửi lại biên bản
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-medium text-foreground">Mã phiên:</span> {meeting.id}
          </p>
          <p>
            <span className="font-medium text-foreground">Thời gian:</span>{" "}
            {formatter.format(new Date(meeting.createdAt))}
          </p>
          <p>
            <span className="font-medium text-foreground">Số speaker:</span> {meeting.speakerCount}
          </p>
          <p>
            <span className="font-medium text-foreground">Thời lượng:</span>{" "}
            {formatDuration(meeting.durationSecond)}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-medium text-foreground">Mô phỏng playback audio</p>
            <p className="text-muted-foreground">
              {formatDuration(playbackSecond)} / {formatDuration(meeting.durationSecond)}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${playbackPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsPlaying((prev) => !prev)}
            >
              {isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
              {isPlaying ? "Tạm dừng" : "Phát"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleResetPlayback}>
              <RotateCcwIcon className="size-4" />
              Reset
            </Button>
            {selectedSegment ? (
              <p className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                Đang focus: {selectedSegment.speaker} ({selectedSegment.startSecond}s - {selectedSegment.endSecond}s)
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <article className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Raw transcript</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{meeting.rawTranscript}</p>

        <Separator className="my-4" />

        <h3 className="text-sm font-semibold text-foreground">Đoạn theo người nói</h3>
        <ul className="mt-3 space-y-2">
          {meeting.segments.length ? (
            meeting.segments.map((segment) => (
              <li key={segment.id} className="rounded-md border border-border/70 p-3 text-sm">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => handleJumpToSegment(segment.id, segment.startSecond)}
                >
                  <p className="font-semibold text-foreground">{segment.speaker}</p>
                  <p className="text-xs text-muted-foreground">
                    {segment.startSecond}s - {segment.endSecond}s
                  </p>
                  <p className="mt-1 text-muted-foreground">{segment.text}</p>
                </button>
              </li>
            ))
          ) : (
            <li className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              Chưa có đoạn transcript theo speaker.
            </li>
          )}
        </ul>
      </article>

      <article className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Biên bản điều hành</h2>
          <Button size="sm" variant="outline" onClick={handleRefreshMinutes}>
            Làm mới biên bản
          </Button>
        </div>

        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{minutesText}</p>

        <Separator className="my-4" />

        <h3 className="text-sm font-semibold text-foreground">Tóm tắt theo speaker</h3>
        <ul className="mt-3 space-y-3">
          {meeting.speakerSummaries.length ? (
            meeting.speakerSummaries.map((summary) => (
              <li key={summary.speaker} className="rounded-md border border-border/70 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <UserRoundIcon className="size-4" />
                  {summary.speaker}
                </p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {summary.keyPoints.map((point) => (
                    <li key={point}>- {point}</li>
                  ))}
                </ul>
              </li>
            ))
          ) : (
            <li className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              Chưa có tóm tắt theo speaker.
            </li>
          )}
        </ul>
      </article>

      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm xl:col-span-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Clock3Icon className="size-4" />
          Nhật ký gửi email
        </h2>

        <div className="mt-3 grid gap-2 md:grid-cols-[1.3fr_1fr]">
          <Input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="Nhập email người nhận..."
          />
          <Button onClick={handleSendMinutes} disabled={sendStatus === "sending"}>
            {sendStatus === "sending" ? "Đang gửi..." : "Gửi email ngay"}
          </Button>
        </div>

        {sendStatus === "sent" ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            Gửi biên bản thành công.
          </p>
        ) : null}

        {sendStatus === "failed" ? (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
            Email không hợp lệ, vui lòng kiểm tra lại người nhận.
          </p>
        ) : null}

        <ul className="mt-3 space-y-2 text-sm">
          {emailLogs.length ? (
            emailLogs.map((email) => (
              <li key={email.id} className="rounded-md border border-border/70 p-3">
                <p className="font-medium text-foreground">{email.recipient}</p>
                <p className="text-muted-foreground">
                  {formatter.format(new Date(email.sentAt))}
                </p>
                <p className="text-muted-foreground">
                  Trạng thái: {email.status === "sent" ? "Đã gửi" : "Thất bại"}
                </p>
              </li>
            ))
          ) : (
            <li className="rounded-md border border-dashed border-border p-3 text-muted-foreground">
              Chưa có lịch sử gửi email cho phiên này.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
