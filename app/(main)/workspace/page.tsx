"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRightIcon,
  CircleIcon,
  FileAudioIcon,
  LoaderCircleIcon,
  MicIcon,
  PauseIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { meetingRecords } from "@/lib/mock/meetings";
import type { AudioInputSource, MeetingRecord, ProcessingStatus } from "@/lib/types/meeting";

const sourceMeeting = meetingRecords[0];

const initialMeeting: MeetingRecord = {
  ...sourceMeeting,
  title: "Phiên mới chưa xử lý",
  fileName: "Chưa có tệp nguồn",
  inputSource: "upload",
  processingStatus: "idle",
  emailStatus: "not_sent",
  rawTranscript:
    "Transcript sẽ hiển thị sau khi bạn tải tệp hoặc hoàn tất bản thu trực tiếp.",
  segments: [],
  minutes: "Biên bản điều hành sẽ được sinh sau khi xử lý hoàn tất.",
  speakerSummaries: [],
  emailLogs: [],
  durationSecond: 0,
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${String(remainSeconds).padStart(2, "0")}s`;
}

function statusConfig(status: ProcessingStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Hoàn tất",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      };
    case "processing":
      return {
        label: "Đang xử lý",
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      };
    case "uploading":
      return {
        label: "Đang tải lên",
        className:
          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
      };
    case "error":
      return {
        label: "Lỗi xử lý",
        className:
          "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      };
    default:
      return {
        label: "Chờ thao tác",
        className:
          "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
      };
  }
}

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

export default function WorkspacePage() {
  const [activeMeeting, setActiveMeeting] = useState<MeetingRecord>(initialMeeting);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecond, setRecordingSecond] = useState(0);
  const [notice, setNotice] = useState(
    "Sẵn sàng nhận tệp hoặc bắt đầu thu âm trực tiếp.",
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
      clearTimer(recordingTimerRef);
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      clearTimer(recordingTimerRef);
      return;
    }

    recordingTimerRef.current = setInterval(() => {
      setRecordingSecond((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimer(recordingTimerRef);
    };
  }, [isRecording]);

  const status = statusConfig(activeMeeting.processingStatus);
  const busyProcessing =
    activeMeeting.processingStatus === "uploading" ||
    activeMeeting.processingStatus === "processing";

  const stageProgress = useMemo(() => {
    if (activeMeeting.processingStatus === "uploading") {
      return uploadProgress;
    }

    if (activeMeeting.processingStatus === "processing") {
      return processingProgress;
    }

    if (activeMeeting.processingStatus === "completed") {
      return 100;
    }

    return 0;
  }, [activeMeeting.processingStatus, processingProgress, uploadProgress]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setUploadProgress(0);
    setProcessingProgress(0);
    setNotice(`Đã chọn tệp ${file.name}. Nhấn xử lý để bắt đầu pipeline.`);
    setActiveMeeting((prev) => ({
      ...prev,
      title: `Phiên xử lý ${file.name}`,
      fileName: file.name,
      inputSource: "upload",
      processingStatus: "idle",
      emailStatus: "not_sent",
    }));
  }

  function startProcessing(source: AudioInputSource, fileName: string, durationSecond: number) {
    clearTimer(uploadTimerRef);
    clearTimer(processingTimerRef);

    setUploadProgress(0);
    setProcessingProgress(0);
    setActiveMeeting((prev) => ({
      ...prev,
      title:
        source === "upload"
          ? `Phiên xử lý ${fileName}`
          : "Phiên xử lý bản thu trực tiếp",
      fileName,
      inputSource: source,
      processingStatus: "uploading",
      emailStatus: "not_sent",
    }));
    setNotice("Hệ thống đang tải dữ liệu đầu vào lên pipeline...");

    uploadTimerRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        const next = Math.min(prev + 14, 100);

        if (next < 100) {
          return next;
        }

        clearTimer(uploadTimerRef);

        setActiveMeeting((current) => ({
          ...current,
          processingStatus: "processing",
        }));
        setNotice("Tệp đã tải lên xong, bắt đầu bóc băng và nhận diện speaker...");

        processingTimerRef.current = setInterval(() => {
          setProcessingProgress((value) => {
            const processNext = Math.min(value + 11, 100);

            if (processNext < 100) {
              return processNext;
            }

            clearTimer(processingTimerRef);

            setActiveMeeting((current) => ({
              ...current,
              processingStatus: "completed",
              durationSecond: Math.max(durationSecond, 30),
              rawTranscript:
                source === "upload"
                  ? `Transcript tự động cho tệp ${fileName}. ${sourceMeeting.rawTranscript}`
                  : `Transcript tự động cho bản thu trực tiếp. ${sourceMeeting.rawTranscript}`,
              segments: sourceMeeting.segments,
              speakerSummaries: sourceMeeting.speakerSummaries,
              minutes: sourceMeeting.minutes,
            }));
            setNotice(
              "Xử lý hoàn tất. Bạn có thể tạo biên bản, tóm tắt speaker và gửi email.",
            );

            return processNext;
          });
        }, 330);

        return next;
      });
    }, 280);
  }

  function handleProcessSelectedFile() {
    if (!selectedFileName) {
      setNotice("Vui lòng chọn tệp audio trước khi xử lý.");
      return;
    }

    if (isRecording) {
      setNotice("Hãy dừng thu âm trước khi xử lý tệp tải lên.");
      return;
    }

    startProcessing("upload", selectedFileName, activeMeeting.durationSecond || 240);
  }

  function handleToggleRecording() {
    if (busyProcessing) {
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      setActiveMeeting((prev) => ({
        ...prev,
        inputSource: "recording",
        fileName: `recording-${Date.now()}.wav`,
        durationSecond: recordingSecond,
        processingStatus: "idle",
      }));
      setNotice("Đã dừng thu âm. Bạn có thể xử lý bản thu vừa tạo.");
      return;
    }

    setSelectedFileName(null);
    setRecordingSecond(0);
    setIsRecording(true);
    setActiveMeeting((prev) => ({
      ...prev,
      inputSource: "recording",
      processingStatus: "idle",
      fileName: "Bản thu đang ghi...",
    }));
    setNotice("Đang thu âm trực tiếp, nhấn dừng để xử lý bản thu.");
  }

  function handleProcessRecording() {
    if (recordingSecond === 0) {
      setNotice("Bản thu quá ngắn. Vui lòng thu âm lại ít nhất vài giây.");
      return;
    }

    startProcessing("recording", activeMeeting.fileName, recordingSecond);
  }

  function handleGenerateMinutes() {
    if (activeMeeting.processingStatus !== "completed") {
      setNotice("Chỉ có thể tạo biên bản khi transcript đã hoàn tất.");
      return;
    }

    setActiveMeeting((prev) => ({
      ...prev,
      minutes: `${prev.minutes}\n4) Theo dõi action item sau 24 giờ để đảm bảo triển khai.`,
    }));
    setNotice("Đã cập nhật biên bản điều hành với checklist mở rộng.");
  }

  function handleRefreshSpeakerSummary() {
    if (activeMeeting.processingStatus !== "completed") {
      setNotice("Cần có transcript hoàn chỉnh trước khi tạo tóm tắt speaker.");
      return;
    }

    setActiveMeeting((prev) => ({
      ...prev,
      speakerSummaries: prev.speakerSummaries.map((summary) => ({
        ...summary,
        keyPoints: [...summary.keyPoints, "Theo dõi tiến độ trong daily check-in."],
      })),
    }));
    setNotice("Đã làm mới tóm tắt speaker với điểm nhấn hành động.");
  }

  function handleSendEmail() {
    if (activeMeeting.processingStatus !== "completed" || isSendingEmail) {
      return;
    }

    setIsSendingEmail(true);
    setNotice("Đang gửi email biên bản cho danh sách nhận mặc định...");

    setTimeout(() => {
      setIsSendingEmail(false);
      setActiveMeeting((prev) => ({
        ...prev,
        emailStatus: "sent",
        emailLogs: [
          {
            id: `email-${Date.now()}`,
            recipient: "team-core@company.vn",
            sentAt: new Date().toISOString(),
            status: "sent",
          },
          ...prev.emailLogs,
        ],
      }));
      setNotice("Đã gửi email biên bản thành công.");
    }, 1200);
  }

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_1.6fr]">
      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            Workspace phiên dịch
          </h1>
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Tải file cuộc họp hoặc ghi âm trực tiếp để bắt đầu bóc băng và tổng
          hợp nội dung.
        </p>

        <div className="mt-5 space-y-3">
          <label className="text-sm font-medium text-foreground">
            Tải lên tệp WAV/MP3
          </label>
          <Input
            type="file"
            accept="audio/wav,audio/mp3,audio/mpeg"
            onChange={handleFileChange}
            disabled={busyProcessing || isRecording}
          />
          {selectedFileName ? (
            <p className="rounded-md border border-border/70 bg-muted/50 px-2 py-1 text-xs text-foreground">
              Tệp đã chọn: {selectedFileName}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Hỗ trợ tệp audio, video sẽ được mở rộng ở phase tiếp theo.
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Button
            variant="default"
            className="justify-start gap-2"
            onClick={handleProcessSelectedFile}
            disabled={!selectedFileName || busyProcessing}
          >
            <FileAudioIcon className="size-4" />
            Bắt đầu xử lý tệp
          </Button>
          <Button
            variant={isRecording ? "default" : "outline"}
            className="justify-start gap-2"
            onClick={handleToggleRecording}
            disabled={busyProcessing}
          >
            {isRecording ? <PauseIcon className="size-4" /> : <MicIcon className="size-4" />}
            {isRecording ? "Dừng thu âm" : "Thu âm trực tiếp"}
          </Button>
        </div>

        {recordingSecond > 0 && !isRecording ? (
          <Button
            variant="secondary"
            className="mt-2 w-full justify-start gap-2"
            onClick={handleProcessRecording}
            disabled={busyProcessing}
          >
            <LoaderCircleIcon className="size-4" />
            Xử lý bản thu {formatDuration(recordingSecond)}
          </Button>
        ) : null}

        <div className="mt-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <CircleIcon
              className={`size-2.5 ${isRecording ? "fill-rose-500 text-rose-500" : "fill-slate-400 text-slate-400"}`}
            />
            {isRecording
              ? `Đang thu âm: ${formatDuration(recordingSecond)}`
              : "Thu âm đang tạm dừng"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{notice}</p>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-background p-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Tiến độ pipeline</span>
            <span>{stageProgress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/40 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Thông tin phiên hiện tại
          </h2>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Tiêu đề:</span>{" "}
              {activeMeeting.title}
            </p>
            <p>
              <span className="font-medium text-foreground">Nguồn vào:</span>{" "}
              {activeMeeting.inputSource === "upload" ? "Tải tệp" : "Thu âm"}
            </p>
            <p>
              <span className="font-medium text-foreground">Số người nói:</span>{" "}
              {activeMeeting.speakerCount}
            </p>
            <p>
              <span className="font-medium text-foreground">Thời lượng:</span>{" "}
              {formatDuration(
                isRecording ? recordingSecond : activeMeeting.durationSecond,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Kết quả xử lý
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleGenerateMinutes}
              disabled={activeMeeting.processingStatus !== "completed"}
            >
              <SparklesIcon className="size-4" />
              Tạo biên bản
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshSpeakerSummary}
              disabled={activeMeeting.processingStatus !== "completed"}
            >
              Tóm tắt theo speaker
            </Button>
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={handleSendEmail}
              disabled={
                activeMeeting.processingStatus !== "completed" ||
                isSendingEmail
              }
            >
              {isSendingEmail ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Gửi email
              <ArrowUpRightIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Raw transcript
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {activeMeeting.rawTranscript}
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-lg border border-border/70 bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Transcript theo người nói
            </h3>
            {activeMeeting.segments.length ? (
              <ul className="mt-3 space-y-3">
                {activeMeeting.segments.map((segment) => (
                  <li
                    key={segment.id}
                    className="rounded-md border border-border/60 p-3 text-sm"
                  >
                    <p className="font-semibold text-foreground">
                      {segment.speaker}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {segment.startSecond}s - {segment.endSecond}s
                      </span>
                    </p>
                    <p className="mt-1 text-muted-foreground">{segment.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có phân đoạn speaker. Hãy xử lý tệp hoặc bản thu trước.
              </p>
            )}
          </article>

          <article className="rounded-lg border border-border/70 bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Tóm tắt theo speaker
            </h3>
            {activeMeeting.speakerSummaries.length ? (
              <ul className="mt-3 space-y-3">
                {activeMeeting.speakerSummaries.map((summary) => (
                  <li
                    key={summary.speaker}
                    className="rounded-md border border-border/60 p-3 text-sm"
                  >
                    <p className="font-semibold text-foreground">
                      {summary.speaker}
                    </p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {summary.keyPoints.map((point) => (
                        <li key={point}>- {point}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có tóm tắt speaker. Hệ thống sẽ sinh sau khi transcript hoàn tất.
              </p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
