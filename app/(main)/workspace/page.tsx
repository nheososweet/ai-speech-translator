"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  CopyIcon,
  InfoIcon,
  LoaderCircleIcon,
  Maximize2Icon,
  XCircleIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RecordingPanel } from "@/components/workspace/recording-panel";
import { UploadPanel } from "@/components/workspace/upload-panel";
import { useDiarizeTranscribeMutation } from "@/hooks/services/use-diarize-transcribe-mutation";
import { useSummaryMinutesMutation } from "@/hooks/services/use-summary-minutes-mutation";
import { useUpdateReportMutation } from "@/hooks/services/use-update-report-mutation";
import { sendMeetingEmailViaAgent } from "@/lib/agent-client";
import { meetingRecords } from "@/lib/mock/meetings";
import type {
  AudioInputSource,
  MeetingRecord,
  ProcessingStatus,
  SpeakerSummary,
  TranscriptSegment,
} from "@/lib/types/meeting";

const sourceMeeting = meetingRecords[0];
const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
const ACCEPTED_AUDIO_MIME_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
]);
const ACCEPTED_AUDIO_EXTENSIONS = new Set([
  "wav",
  "mp3",
  "mpeg",
  "webm",
  "ogg",
]);

const FAKE_RAW_TRANSCRIPT = `Đây là một đoạn bóc băng (transcript) giả lập một cuộc họp Daily/Sync-up team phát triển sản phẩm. Tôi đã cố tình thiết kế đoạn hội thoại này có đầy đủ các yếu tố: báo cáo tiến độ, thảo luận kỹ thuật, quyết định, và các Action Items được chốt vào cuối buổi để bạn test khả năng trích xuất của LLM.

Bạn có thể copy đoạn này để test chức năng gen Biên bản (MoM) và Tóm tắt theo người nhé:

[00:00:00] Long: Chào mọi người. Hôm nay mình họp nhanh tiến độ cái svisor.ai nhé, đặc biệt là module hệ thống phiên dịch âm thanh mà đợt này team mình đang tập trung. Mình cần chốt nhanh để cuối tuần có bản demo. Tân với Thành update tình hình đi. Tân, FE bên em sao rồi?

[00:00:25] Tân: Vâng anh. Em đang dựng lại cái Frontend theo hướng tinh gọn anh bảo hôm trước. Thay vì làm luồng multi-step lằng nhằng thì em gom hết vào một cái màn Workspace chính rồi. Thu âm realtime hoặc upload file MP3, WAV là nó nằm chung một chỗ luôn cho tiện. Em dùng Next.js App Router với Shadcn UI. Giao diện đang set mặc định Light mode, typography khá rõ ràng. Hiện tại em đang xử lý cái hiệu ứng sóng âm lúc thu âm cho nó nhìn thật một chút.

[00:01:05] Long: Ừ, cái sóng âm đấy cực kỳ quan trọng về mặt UX, người dùng thu âm mà không thấy màn hình nhấp nháy là họ tưởng hỏng mic liền. Thế còn phần render cái text bóc băng ra thì em định làm thế nào?

[00:01:20] Tân: Em định cho nó hiển thị kiểu streaming luôn anh ạ. Tức là BE nhả chữ nào ra thì FE hiện chữ đó. Nhưng mà hiện tại em chưa có API nên đang phải tự viết data giả để test UI.

[00:01:38] Thành: Về phần API thì pipeline ASR cơ bản anh dựng xong và chạy ổn rồi Tân nhé. Tốc độ nhận diện khá tốt. Còn phần Speaker Diarization để phân biệt người nói thì anh test thử thấy hệ thống nhận diện giọng anh Long với Tân tách bạch rõ ràng. Nhưng mà đang bị một cái issue nhỏ là lúc hai người nói chèn vào nhau thì thỉnh thoảng nó bị gán nhầm tên.

[00:02:05] Long: Tỷ lệ lỗi khoảng bao nhiêu phần trăm hả Thành? Có ảnh hưởng nhiều đến cái kết quả tóm tắt sau cùng không?

[00:02:15] Thành: Chắc cỡ khoảng 5 đến 10% cho những đoạn overlap thôi anh. Em nghĩ là hoàn toàn chấp nhận được cho version 1. Ngay sau bước bóc băng thì em sẽ đẩy thẳng cục raw text đó qua LLM để nó gen biên bản. Mình đang dùng cái template prompt anh em mình chốt hôm qua rồi. Tiện thể em cũng đang nghiên cứu thêm việc nhúng LightRAG vào để sau này user có thể chat và hỏi đáp chéo nội dung giữa các cuộc họp cũ với nhau, anh thấy sao?

[00:03:00] Long: Khoan đã, mấy cái RAG hay hỏi đáp phức tạp thì để phase sau đi. Bây giờ MVP ưu tiên số 1 là chạy mượt cái luồng bóc băng ra text, sinh được cái biên bản chuẩn và tóm tắt đúng ý chính theo từng người đã. Tránh làm lan man lại trễ deadline. Thành chốt lại là bao giờ xong cục API này để đưa cho Tân ghép?

[00:03:30] Thành: Dạ vâng anh. Vậy chiều mai tầm 4 giờ em sẽ đẩy API lên môi trường dev. Sẽ có 2 endpoint chính: một cái REST API để upload file audio tĩnh, và một cái Websocket để streaming text cho phần thu âm realtime.

[00:03:45] Tân: Ôkê anh, thế thì mai em nhận API ghép luôn. Anh nhớ ném em cái link Swagger để em check trước mấy cái field payload nhé. Tiện thể phần xuất file biên bản, em đang dùng Tailwind prose để render cái bảng Action Items từ Markdown của LLM trả về, nhìn bảng khá đẹp và chuyên nghiệp.

[00:04:10] Long: Ngon đấy. Tân nhớ để ý test kỹ cái responsive trên Mobile và Tablet nhé, khách hàng họ hay dùng iPad để xem lại biên bản lắm. Chốt lại Action Item hôm nay thế này: Chiều mai Thành release API lên dev. Tân tiến hành ghép nối và test luồng Workspace màn hình chính. Sang thứ tư thì Tân làm tiếp hai màn còn lại là History List với History Detail.

[00:04:45] Tân: Vâng em clear rồi ạ. À em hỏi nốt cái action Gửi Email báo cáo cuộc họp ấy, flow là FE gọi qua service thứ 3 hay gọi qua BE của anh Thành ạ?

[00:04:55] Thành: Em cứ truyền cục payload gồm danh sách email người nhận và ID cuộc họp qua BE đi, anh xử lý logic gửi mail bằng luồng nội bộ luôn cho nó an toàn.

[00:05:05] Long: Nhất trí. Mọi người còn câu hỏi hay vướng mắc gì cần hỗ trợ nữa không?

[00:05:12] Thành: Em không anh ạ.

[00:05:15] Tân: Em cũng clear rồi. Để em quay lại code nốt cái giao diện Workspace.

[00:05:20] Long: OK, vậy anh em mình kết thúc họp nhé. Cảm ơn mọi người.`;

const DIARIZATION_LINE_PATTERN =
  /^Người\s*(\d+)\s*\(([\d.]+)s\s*-\s*([\d.]+)s\):\s*(.+)$/i;
const SPEAKER_TAG_PATTERN = /Người\s*\d+/i;

function cleanTranscriptLine(line: string): string {
  return line.trim().replace(/^"+|"+$/g, "");
}

function formatTimelineSecond(second: number): string {
  if (!Number.isFinite(second) || second < 0) {
    return "00:00";
  }

  const wholeSecond = Math.floor(second);
  const minute = Math.floor(wholeSecond / 60);
  const remainSecond = wholeSecond % 60;
  const millis = Math.round((second - wholeSecond) * 100);

  return `${String(minute).padStart(2, "0")}:${String(remainSecond).padStart(2, "0")}.${String(
    Math.max(0, Math.min(99, millis)),
  ).padStart(2, "0")}`;
}

function parseTranscriptSegments(lines: string[]): TranscriptSegment[] {
  return lines
    .map((line, index) => {
      const normalizedLine = cleanTranscriptLine(line);
      const parsed = normalizedLine.match(DIARIZATION_LINE_PATTERN);

      if (!parsed) {
        return null;
      }

      const speakerIndex = parsed[1];
      const startSecond = Number.parseFloat(parsed[2]);
      const endSecond = Number.parseFloat(parsed[3]);
      const text = parsed[4]?.trim();

      if (
        !Number.isFinite(startSecond) ||
        !Number.isFinite(endSecond) ||
        !text
      ) {
        return null;
      }

      return {
        id: `seg-api-${index + 1}`,
        speaker: `Người ${speakerIndex}`,
        startSecond,
        endSecond,
        text,
      };
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function deriveSpeakerCount(
  lines: string[],
  segments: TranscriptSegment[],
): number {
  if (segments.length) {
    return new Set(segments.map((segment) => segment.speaker)).size;
  }

  const speakers = lines
    .map((line) =>
      cleanTranscriptLine(line).match(SPEAKER_TAG_PATTERN)?.[0]?.trim(),
    )
    .filter((speaker): speaker is string => Boolean(speaker));

  return new Set(speakers).size;
}

function buildSpeakerSummariesFromSegments(
  segments: TranscriptSegment[],
): SpeakerSummary[] {
  if (!segments.length) {
    return sourceMeeting.speakerSummaries;
  }

  const groupedSegments = segments.reduce<Record<string, TranscriptSegment[]>>(
    (acc, segment) => {
      const key = segment.speaker;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(segment);
      return acc;
    },
    {},
  );

  return Object.entries(groupedSegments).map(([speaker, speakerSegments]) => ({
    speaker,
    keyPoints: [
      `Tham gia ${speakerSegments.length} lượt phát biểu trong phiên hiện tại.`,
      `Khung trao đổi chính: ${formatTimelineSecond(speakerSegments[0].startSecond)} - ${formatTimelineSecond(
        speakerSegments[speakerSegments.length - 1].endSecond,
      )}.`,
      "Đây là tóm tắt giả lập, sẽ thay bằng output agent ở bước sau.",
    ],
  }));
}

function speakerToneClass(speaker: string): string {
  const palette = [
    "border-l-sky-500 bg-sky-50/80 dark:border-l-sky-300 dark:bg-sky-950/40",
    "border-l-emerald-500 bg-emerald-50/80 dark:border-l-emerald-300 dark:bg-emerald-950/40",
    "border-l-amber-500 bg-amber-50/80 dark:border-l-amber-300 dark:bg-amber-950/40",
    "border-l-teal-500 bg-teal-50/80 dark:border-l-teal-300 dark:bg-teal-950/40",
  ];
  const hash = speaker
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? palette[0];
}

const initialMeeting: MeetingRecord = {
  ...sourceMeeting,
  title: "Phiên mới chưa xử lý",
  fileName: "Chưa có tệp nguồn",
  inputSource: "upload",
  processingStatus: "idle",
  emailStatus: "not_sent",
  rawTranscript:
    "Transcript sẽ hiển thị sau khi bạn tải tệp hoặc hoàn tất bản thu trực tiếp.",
  refinedTranscript:
    "Bản làm sạch sẽ hiển thị sau khi hệ thống xử lý xong transcript gốc.",
  segments: [],
  minutes: "Biên bản điều hành sẽ được sinh sau khi xử lý hoàn tất.",
  speakerSummaries: [],
  emailLogs: [],
  durationSecond: 0,
  speakerCount: 0,
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${String(remainSeconds).padStart(2, "0")}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedAudioFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    ACCEPTED_AUDIO_MIME_TYPES.has(file.type) ||
    ACCEPTED_AUDIO_EXTENSIONS.has(extension)
  );
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

type PipelineStepStatus = "pending" | "running" | "completed" | "error";

type PipelineStep = {
  id: "raw_transcript" | "diarization" | "speaker_summary" | "minutes";
  title: string;
  description: string;
  status: PipelineStepStatus;
  progress: number;
};

const PIPELINE_STEP_BLUEPRINT: Array<
  Omit<PipelineStep, "status" | "progress">
> = [
  {
    id: "raw_transcript",
    title: "1) Chuyển giọng nói thành văn bản",
    description: "Hệ thống nghe toàn bộ bản ghi và chuyển thành nội dung chữ.",
  },
  {
    id: "diarization",
    title: "2) Phân chia theo từng người",
    description: "Nhận diện ai đang nói và tách thành từng đoạn hội thoại.",
  },
  {
    id: "speaker_summary",
    title: "3) Tóm tắt theo từng người",
    description: "Rút gọn các ý chính mà mỗi người đã trao đổi.",
  },
  {
    id: "minutes",
    title: "4) Tạo biên bản cuộc họp",
    description: "Tổng hợp nội dung thành biên bản dễ theo dõi.",
  },
];

const PIPELINE_STEP_WEIGHT: Record<PipelineStep["id"], number> = {
  raw_transcript: 35,
  diarization: 20,
  speaker_summary: 25,
  minutes: 20,
};

const recipientEmailsSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập ít nhất 1 email người nhận.")
  .transform((input) =>
    input
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )
  .pipe(
    z
      .array(z.string().email("Danh sách email có địa chỉ không hợp lệ."))
      .min(1, "Vui lòng nhập ít nhất 1 email người nhận."),
  );

const minutesDraftSchema = z
  .string()
  .trim()
  .min(1, "Biên bản không được để trống.");

function createInitialPipelineSteps(): PipelineStep[] {
  return PIPELINE_STEP_BLUEPRINT.map((step) => ({
    ...step,
    status: "pending",
    progress: 0,
  }));
}

function clearTimer(
  timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

export default function WorkspacePage() {
  const diarizeTranscribeMutation = useDiarizeTranscribeMutation();
  const summaryMinutesMutation = useSummaryMinutesMutation();
  const updateReportMutation = useUpdateReportMutation();
  const [inputMode, setInputMode] = useState<AudioInputSource>("upload");
  const [activeMeeting, setActiveMeeting] =
    useState<MeetingRecord>(initialMeeting);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSizeBytes, setSelectedFileSizeBytes] = useState<
    number | null
  >(null);
  const [selectedFileDurationSecond, setSelectedFileDurationSecond] = useState<
    number | null
  >(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [, setUploadProgress] = useState(0);
  const [, setProcessingProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [recordingSecond, setRecordingSecond] = useState(0);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(
    null,
  );
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [notice, setNotice] = useState(
    "Sẵn sàng nhận tệp hoặc bắt đầu thu âm trực tiếp.",
  );
  const [emailRecipientsInput, setEmailRecipientsInput] = useState("");
  const [emailValidationError, setEmailValidationError] = useState<
    string | null
  >(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isMinutesDialogOpen, setIsMinutesDialogOpen] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState(initialMeeting.minutes);
  const [minutesValidationError, setMinutesValidationError] = useState<
    string | null
  >(null);
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);
  const [failedStepId, setFailedStepId] = useState<PipelineStep["id"] | null>(
    null,
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(
    createInitialPipelineSteps,
  );

  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const discardRecordingPreviewOnStopRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDragCountRef = useRef(0);
  const processingRunIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePipelineStep = (
    stepId: PipelineStep["id"],
    updater: (step: PipelineStep) => PipelineStep,
  ) => {
    setPipelineSteps((prev) =>
      prev.map((step) => (step.id === stepId ? updater(step) : step)),
    );
  };

  const resetPipelineSteps = () => {
    setPipelineSteps(createInitialPipelineSteps());
  };

  const markPipelineAsError = (
    message: string,
    failedStepId?: PipelineStep["id"],
  ) => {
    if (failedStepId) {
      setFailedStepId(failedStepId);
      updatePipelineStep(failedStepId, (step) => ({
        ...step,
        status: "error",
      }));
    } else {
      setFailedStepId(null);
    }

    setActiveMeeting((prev) => ({
      ...prev,
      processingStatus: "error",
    }));
    setNotice(message);
  };

  useEffect(() => {
    return () => {
      processingRunIdRef.current += 1;
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
      clearTimer(recordingTimerRef);

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  useEffect(() => {
    return () => {
      if (recordingPreviewUrl) {
        URL.revokeObjectURL(recordingPreviewUrl);
      }
    };
  }, [recordingPreviewUrl]);

  useEffect(() => {
    if (!isRecording) {
      clearTimer(recordingTimerRef);
      return;
    }

    recordingTimerRef.current = setInterval(() => {
      if (recordingStartedAtRef.current) {
        const elapsedMs = Date.now() - recordingStartedAtRef.current;
        setRecordingElapsedMs(elapsedMs);
        setRecordingSecond(Math.max(1, Math.round(elapsedMs / 1000)));
      }
    }, 100);

    return () => {
      clearTimer(recordingTimerRef);
    };
  }, [isRecording]);

  const status = statusConfig(activeMeeting.processingStatus);
  const busyProcessing =
    activeMeeting.processingStatus === "uploading" ||
    activeMeeting.processingStatus === "processing";

  const stageProgress = useMemo(() => {
    if (activeMeeting.processingStatus === "completed") {
      return 100;
    }

    if (activeMeeting.processingStatus === "idle") {
      return 0;
    }

    const weightedProgress = pipelineSteps.reduce((acc, step) => {
      const weight = PIPELINE_STEP_WEIGHT[step.id] ?? 0;
      return acc + (step.progress * weight) / 100;
    }, 0);

    return Math.max(0, Math.min(100, Math.round(weightedProgress)));
  }, [activeMeeting.processingStatus, pipelineSteps]);

  const selectedFileSizeLabel = selectedFileSizeBytes
    ? formatFileSize(selectedFileSizeBytes)
    : "--";
  const selectedFileDurationLabel = selectedFileDurationSecond
    ? formatDuration(selectedFileDurationSecond)
    : "Đang đọc thời lượng...";
  const recordingDurationLabel = formatDuration(
    isRecording
      ? Math.max(1, Math.round(recordingElapsedMs / 1000))
      : recordingSecond,
  );
  const shouldShowPipeline = activeMeeting.processingStatus !== "idle";
  const shouldShowMinutes = activeMeeting.minutes !== initialMeeting.minutes;
  const shouldShowRawTranscript =
    activeMeeting.rawTranscript !== initialMeeting.rawTranscript;
  const shouldShowRefinedTranscript =
    Boolean(activeMeeting.refinedTranscript?.trim()) &&
    activeMeeting.refinedTranscript !== initialMeeting.refinedTranscript;
  const canSendEmail =
    activeMeeting.processingStatus === "completed" &&
    Boolean(activeMeeting.reportUrl?.trim());
  const shouldShowDiarization = activeMeeting.segments.length > 0;
  const shouldShowSpeakerSummary = activeMeeting.speakerSummaries.length > 0;
  const canRetryPipeline = Boolean(failedStepId) && !busyProcessing;
  const refinedSegments = useMemo(() => {
    const refinedText = (activeMeeting.refinedTranscript ?? "").trim();

    if (!refinedText) {
      return [] as TranscriptSegment[];
    }

    const refinedLines = refinedText
      .split("\n")
      .map((line) => cleanTranscriptLine(line))
      .filter((line) => line.length > 0);

    return parseTranscriptSegments(refinedLines);
  }, [activeMeeting.refinedTranscript]);
  const shouldShowRefinedDiarization = refinedSegments.length > 0;

  function showActionToast(message: string) {
    setActionToast(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setActionToast(null);
    }, 2200);
  }

  function handleRetryPipeline() {
    if (!failedStepId || busyProcessing) {
      return;
    }

    const source = activeMeeting.inputSource;

    if (source === "upload") {
      if (!selectedFile) {
        setNotice("Không tìm thấy tệp upload hiện tại để thử lại pipeline.");
        return;
      }

      const retryFileName = selectedFileName ?? selectedFile.name;
      const retryDuration =
        selectedFileDurationSecond ?? Math.max(activeMeeting.durationSecond, 1);

      setNotice("Đang thử lại pipeline từ đầu...");
      startProcessing("upload", retryFileName, retryDuration);
      return;
    }

    if (!recordingFile) {
      setNotice("Không tìm thấy bản thu hiện tại để thử lại pipeline.");
      return;
    }

    const retryDuration = Math.max(
      recordingSecond || activeMeeting.durationSecond,
      1,
    );

    setNotice("Đang thử lại pipeline từ đầu...");
    startProcessing("recording", recordingFile.name, retryDuration);
  }

  async function handleCopyRawTranscript() {
    const transcript = activeMeeting.rawTranscript.trim();

    if (!transcript) {
      showActionToast("Chưa có transcript để copy.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(transcript);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = transcript;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      showActionToast("Đã copy raw transcript.");
    } catch {
      showActionToast("Copy thất bại, vui lòng thử lại.");
    }
  }

  async function handleCopyRefinedTranscript() {
    const transcript = (activeMeeting.refinedTranscript ?? "").trim();

    if (!transcript) {
      showActionToast("Chưa có bản đã làm sạch để copy.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(transcript);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = transcript;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      showActionToast("Đã copy bản đã làm sạch.");
    } catch {
      showActionToast("Copy thất bại, vui lòng thử lại.");
    }
  }

  function clearUploadState() {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(null);
    setSelectedFileName(null);
    setSelectedFileSizeBytes(null);
    setSelectedFileDurationSecond(null);
    setFilePreviewUrl(null);
    setUploadWarning(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    resetPipelineSteps();
    setFailedStepId(null);
    uploadDragCountRef.current = 0;
    setIsDraggingUpload(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function clearRecordingState() {
    clearTimer(recordingTimerRef);
    recordingStartedAtRef.current = null;

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
    setRecordingElapsedMs(0);
    setRecordingSecond(0);
    recordedChunksRef.current = [];

    if (recordingPreviewUrl) {
      URL.revokeObjectURL(recordingPreviewUrl);
    }

    setRecordingPreviewUrl(null);
    setRecordingFile(null);
    discardRecordingPreviewOnStopRef.current = true;
    resetPipelineSteps();
  }

  useEffect(() => {
    if (!filePreviewUrl) {
      return;
    }

    const audio = new Audio(filePreviewUrl);

    const handleLoadedMetadata = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        return;
      }

      setSelectedFileDurationSecond(Math.max(1, Math.round(audio.duration)));
    };

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [filePreviewUrl]);

  function applySelectedFile(file: File) {
    if (!isSupportedAudioFile(file)) {
      clearUploadState();
      setUploadWarning(
        "Định dạng không hỗ trợ. Chỉ nhận WAV, MP3, WebM hoặc OGG.",
      );
      setNotice("File không hợp lệ, vui lòng chọn tệp audio đúng định dạng.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      clearUploadState();
      setUploadWarning(
        `File quá lớn. Giới hạn hiện tại là ${formatFileSize(MAX_UPLOAD_SIZE_BYTES)}.`,
      );
      setNotice("File vượt ngưỡng tải lên, vui lòng chọn file nhỏ hơn.");
      return;
    }

    setUploadWarning(null);

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedFileSizeBytes(file.size);
    setSelectedFileDurationSecond(null);
    setFilePreviewUrl(nextPreviewUrl);
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
      rawTranscript: initialMeeting.rawTranscript,
      refinedTranscript: initialMeeting.refinedTranscript,
      segments: [],
      speakerSummaries: [],
      minutes: initialMeeting.minutes,
      speakerCount: 0,
    }));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    applySelectedFile(file);
  }

  function handleUploadDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    uploadDragCountRef.current += 1;
    setIsDraggingUpload(true);
  }

  function handleUploadDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingUpload(true);
  }

  function handleUploadDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    uploadDragCountRef.current = Math.max(0, uploadDragCountRef.current - 1);

    if (uploadDragCountRef.current === 0) {
      setIsDraggingUpload(false);
    }
  }

  function handleUploadDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    uploadDragCountRef.current = 0;
    setIsDraggingUpload(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    applySelectedFile(file);
  }

  function handleClearSelectedFile() {
    if (busyProcessing) {
      return;
    }

    clearUploadState();
    setNotice("Đã xóa tệp đã chọn. Bạn có thể tải tệp mới.");

    setActiveMeeting((prev) => ({
      ...prev,
      title: "Phiên mới chưa xử lý",
      fileName: "Chưa có tệp nguồn",
      inputSource: "upload",
      processingStatus: "idle",
      rawTranscript: initialMeeting.rawTranscript,
      refinedTranscript: initialMeeting.refinedTranscript,
      segments: [],
      speakerSummaries: [],
      minutes: initialMeeting.minutes,
      speakerCount: 0,
      durationSecond: 0,
    }));
  }

  function handleSwitchMode(mode: AudioInputSource) {
    if (mode === inputMode) {
      return;
    }

    if (busyProcessing) {
      setNotice("Không thể đổi chế độ khi pipeline đang xử lý.");
      return;
    }

    if (mode === "upload") {
      clearRecordingState();
      setActiveMeeting((prev) => ({
        ...prev,
        title: "Phiên mới chưa xử lý",
        fileName: "Chưa có tệp nguồn",
        inputSource: "upload",
        processingStatus: "idle",
        rawTranscript: initialMeeting.rawTranscript,
        refinedTranscript: initialMeeting.refinedTranscript,
        segments: [],
        speakerSummaries: [],
        minutes: initialMeeting.minutes,
        speakerCount: 0,
        durationSecond: 0,
      }));
      setInputMode("upload");
      return;
    }

    clearUploadState();
    setActiveMeeting((prev) => ({
      ...prev,
      title: "Bản thu sẵn sàng",
      fileName: "Chưa có bản ghi",
      inputSource: "recording",
      processingStatus: "idle",
      rawTranscript: initialMeeting.rawTranscript,
      refinedTranscript: initialMeeting.refinedTranscript,
      segments: [],
      speakerSummaries: [],
      minutes: initialMeeting.minutes,
      speakerCount: 0,
      durationSecond: 0,
    }));
    setInputMode("recording");
  }

  function startProcessing(
    source: AudioInputSource,
    fileName: string,
    durationSecond: number,
  ) {
    if (!fileName) {
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
      markPipelineAsError(
        "Không tìm thấy đầu vào hợp lệ cho pipeline.",
        "raw_transcript",
      );
      return;
    }

    const sourceAudioFile =
      source === "upload"
        ? selectedFile
        : source === "recording"
          ? recordingFile
          : null;

    if (!sourceAudioFile) {
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
      markPipelineAsError(
        source === "upload"
          ? "Không tìm thấy file upload để gọi API bóc băng."
          : "Không tìm thấy bản thu để gọi API bóc băng.",
        "raw_transcript",
      );
      return;
    }

    const runId = processingRunIdRef.current + 1;
    processingRunIdRef.current = runId;

    clearTimer(uploadTimerRef);
    clearTimer(processingTimerRef);

    setUploadProgress(0);
    setProcessingProgress(0);
    resetPipelineSteps();

    setActiveMeeting((prev) => ({
      ...prev,
      title:
        source === "upload"
          ? `Phiên xử lý ${fileName}`
          : "Phiên xử lý bản thu trực tiếp",
      fileName,
      inputSource: source,
      processingStatus: "processing",
      emailStatus: "not_sent",
      segments: [],
      speakerSummaries: [],
      minutes: "Biên bản điều hành đang được tạo...",
      rawTranscript: "Transcript thô đang được tạo từ audio...",
      refinedTranscript: "Bản làm sạch đang được chuẩn bị...",
      speakerCount: 0,
    }));
    setNotice("Bắt đầu chạy từng bước xử lý...");

    let uploadLocalProgress = 100;

    uploadTimerRef.current = setInterval(() => {
      if (processingRunIdRef.current !== runId) {
        clearTimer(uploadTimerRef);
        return;
      }

      uploadLocalProgress = Math.min(uploadLocalProgress + 14, 100);
      setUploadProgress(uploadLocalProgress);

      if (uploadLocalProgress < 100) {
        return;
      }

      clearTimer(uploadTimerRef);

      if (processingRunIdRef.current !== runId) {
        return;
      }

      setActiveMeeting((current) => ({
        ...current,
        processingStatus: "processing",
      }));
      setNotice("Đang xử lý nội dung audio...");

      const runPipelineStep = (
        stepId: PipelineStep["id"],
        increment: number,
        intervalMs: number,
        onDone: () => void,
      ) => {
        let localProgress = 0;

        updatePipelineStep(stepId, (step) => ({
          ...step,
          status: "running",
          progress: 0,
        }));

        processingTimerRef.current = setInterval(() => {
          if (processingRunIdRef.current !== runId) {
            clearTimer(processingTimerRef);
            return;
          }

          localProgress = Math.min(localProgress + increment, 100);

          updatePipelineStep(stepId, (step) => ({
            ...step,
            status: localProgress >= 100 ? "completed" : "running",
            progress: localProgress,
          }));

          setProcessingProgress((value) => Math.min(value + 6, 100));

          if (localProgress < 100) {
            return;
          }

          clearTimer(processingTimerRef);
          onDone();
        }, intervalMs);
      };

      const runSpeakerSummaryAndMinutes = (
        segments: TranscriptSegment[],
        rawTranscriptText: string,
      ) => {
        updatePipelineStep("speaker_summary", (step) => ({
          ...step,
          status: "running",
          progress: 0,
        }));

        let summaryProgress = 0;
        const speakerSummaryTimer = setInterval(() => {
          if (processingRunIdRef.current !== runId) {
            clearInterval(speakerSummaryTimer);
            return;
          }

          summaryProgress = Math.min(summaryProgress + 8, 92);
          updatePipelineStep("speaker_summary", (step) => ({
            ...step,
            status: "running",
            progress: summaryProgress,
          }));
          setProcessingProgress((value) => Math.min(value + 4, 96));
        }, 240);

        void (async () => {
          let summaries: SpeakerSummary[] =
            buildSpeakerSummariesFromSegments(segments);
          let nextMinutes = "Không có biên bản từ API cho phiên hiện tại.";

          setNotice("Đang tạo tóm tắt ý chính theo từng người...");

          try {
            const transcriptLinesForChat = segments.length
              ? segments.map(
                  (segment) =>
                    `${segment.speaker} (${segment.startSecond}s - ${segment.endSecond}s): ${segment.text}`,
                )
              : rawTranscriptText
                  .split("\n")
                  .map((line) => cleanTranscriptLine(line))
                  .filter((line) => line.length > 0);

            const combinedResult = await summaryMinutesMutation.mutateAsync({
              transcriptLines: transcriptLinesForChat,
              model: "qwen3.5-flash-2026-02-23",
            });

            summaries =
              combinedResult.speakerSummaries.length > 0
                ? combinedResult.speakerSummaries
                : summaries;
            nextMinutes =
              combinedResult.minutesMarkdown.trim() ||
              "Không có biên bản từ API cho phiên hiện tại.";
          } catch (error) {
            clearInterval(speakerSummaryTimer);
            markPipelineAsError(
              `Lỗi tạo tóm tắt theo người nói: ${error instanceof Error ? error.message : String(error)}`,
              "speaker_summary",
            );
            return;
          }

          if (processingRunIdRef.current !== runId) {
            clearInterval(speakerSummaryTimer);
            return;
          }

          clearInterval(speakerSummaryTimer);
          updatePipelineStep("speaker_summary", (step) => ({
            ...step,
            status: "completed",
            progress: 100,
          }));

          setActiveMeeting((current) => ({
            ...current,
            speakerSummaries: summaries,
          }));
          setNotice("Đã có tóm tắt theo từng người, đang tạo biên bản...");

          updatePipelineStep("minutes", (step) => ({
            ...step,
            status: "running",
            progress: 15,
          }));

          let minutesProgress = 15;
          const minutesTimer = setInterval(() => {
            if (processingRunIdRef.current !== runId) {
              clearInterval(minutesTimer);
              return;
            }

            minutesProgress = Math.min(minutesProgress + 17, 100);
            updatePipelineStep("minutes", (step) => ({
              ...step,
              status: minutesProgress >= 100 ? "completed" : "running",
              progress: minutesProgress,
            }));
            setProcessingProgress((value) =>
              Math.min(value + (minutesProgress >= 100 ? 4 : 2), 100),
            );

            if (minutesProgress < 100) {
              return;
            }

            clearInterval(minutesTimer);
            setProcessingProgress(100);

            setActiveMeeting((current) => ({
              ...current,
              processingStatus: "completed",
              durationSecond: Math.max(durationSecond, 30),
              minutes: nextMinutes,
            }));
            setMinutesDraft(nextMinutes);
            setNotice("Xử lý hoàn tất. Biên bản đã được tạo từ API.");
          }, 120);
        })();
      };

      const runDiarizationStep = (
        segments: TranscriptSegment[],
        speakerCount: number,
        rawTranscriptText: string,
      ) => {
        runPipelineStep("diarization", 20, 250, () => {
          if (processingRunIdRef.current !== runId) {
            return;
          }

          const safeSegments = segments.length
            ? segments
            : sourceMeeting.segments;
          const safeSpeakerCount =
            speakerCount > 0
              ? speakerCount
              : new Set(safeSegments.map((segment) => segment.speaker)).size;

          setActiveMeeting((current) => ({
            ...current,
            segments: safeSegments,
            speakerCount: safeSpeakerCount,
          }));
          setNotice("Đã tách theo người nói, đang tạo biên bản...");
          runSpeakerSummaryAndMinutes(safeSegments, rawTranscriptText);
        });
      };

      if (sourceAudioFile) {
        setNotice("Đang chuyển file ghi âm thành văn bản...");
        updatePipelineStep("raw_transcript", (step) => ({
          ...step,
          status: "running",
          progress: 8,
        }));

        let rawStepProgress = 8;
        const rawStepTimer = setInterval(() => {
          if (processingRunIdRef.current !== runId) {
            clearInterval(rawStepTimer);
            return;
          }

          rawStepProgress = Math.min(rawStepProgress + 9, 92);
          updatePipelineStep("raw_transcript", (step) => ({
            ...step,
            status: "running",
            progress: rawStepProgress,
          }));
        }, 240);

        void (async () => {
          try {
            const apiResult = await diarizeTranscribeMutation.mutateAsync({
              file: sourceAudioFile,
              language: "Vietnamese",
            });

            const transcriptLines = apiResult.rawTranscription
              .map((line) => cleanTranscriptLine(line))
              .filter((line) => line.length > 0);
            const refinedTranscriptLines = apiResult.refinedTranscription
              .map((line) => cleanTranscriptLine(line))
              .filter((line) => line.length > 0);
            const parsedSegments = parseTranscriptSegments(transcriptLines);
            const speakerCount = deriveSpeakerCount(
              transcriptLines,
              parsedSegments,
            );
            const mergedTranscript = transcriptLines.join("\n");
            const mergedRefinedTranscript = refinedTranscriptLines.join("\n");

            clearInterval(rawStepTimer);

            updatePipelineStep("raw_transcript", (step) => ({
              ...step,
              status: "completed",
              progress: 100,
            }));
            setProcessingProgress((value) => Math.min(value + 20, 100));

            setActiveMeeting((current) => ({
              ...current,
              rawTranscript:
                mergedTranscript ||
                "Không có transcript text từ API cho phiên hiện tại.",
              refinedTranscript:
                mergedRefinedTranscript ||
                mergedTranscript ||
                "Không có bản refined từ API cho phiên hiện tại.",
              speakerCount,
              durationSecond: Math.max(durationSecond, current.durationSecond),
              audioUrl: apiResult.audioUrl,
              apiRecordId: apiResult.id,
            }));

            setNotice(
              "Đã có nội dung chữ, đang tách hội thoại theo từng người...",
            );
            runDiarizationStep(parsedSegments, speakerCount, mergedTranscript);
          } catch (error) {
            clearInterval(rawStepTimer);

            if (processingRunIdRef.current !== runId) {
              return;
            }

            const message =
              error instanceof Error
                ? error.message
                : "Không thể gọi API diarize/transcribe.";

            markPipelineAsError(
              `Lỗi tạo transcript thô: ${message}`,
              "raw_transcript",
            );
          }
        })();

        return;
      }

      runPipelineStep("raw_transcript", 18, 260, () => {
        if (processingRunIdRef.current !== runId) {
          return;
        }

        const generatedRawTranscript = FAKE_RAW_TRANSCRIPT;

        setActiveMeeting((current) => ({
          ...current,
          rawTranscript: generatedRawTranscript,
          refinedTranscript: generatedRawTranscript,
        }));
        setNotice("Đã xong phần chuyển văn bản, đang tách theo người nói...");

        runDiarizationStep(
          sourceMeeting.segments,
          sourceMeeting.speakerCount,
          generatedRawTranscript,
        );
      });
    }, 1);
  }

  function handleProcessSelectedFile() {
    if (!selectedFile || !selectedFileName) {
      setNotice("Vui lòng chọn tệp audio trước khi xử lý.");
      return;
    }

    if (isRecording) {
      setNotice("Hãy dừng thu âm trước khi xử lý tệp tải lên.");
      return;
    }

    startProcessing(
      "upload",
      selectedFileName,
      selectedFileDurationSecond ?? (activeMeeting.durationSecond || 240),
    );
  }

  async function handleToggleRecording() {
    if (busyProcessing) {
      return;
    }

    if (isRecording) {
      discardRecordingPreviewOnStopRef.current = false;
      const recorder = mediaRecorderRef.current;
      const elapsedMs = recordingStartedAtRef.current
        ? Date.now() - recordingStartedAtRef.current
        : recordingElapsedMs;
      const elapsedSecond = Math.max(1, Math.round(elapsedMs / 1000));

      setRecordingElapsedMs(elapsedMs);
      setRecordingSecond(elapsedSecond);
      recordingStartedAtRef.current = null;

      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;

      setIsRecording(false);
      setActiveMeeting((prev) => ({
        ...prev,
        inputSource: "recording",
        fileName: `recording-${Date.now()}.webm`,
        durationSecond: elapsedSecond,
        processingStatus: "idle",
        speakerCount: 0,
        segments: [],
        speakerSummaries: [],
        rawTranscript: initialMeeting.rawTranscript,
        refinedTranscript: initialMeeting.refinedTranscript,
      }));
      setNotice(
        "Đã dừng thu âm. Bạn có thể nghe lại hoặc xử lý bản thu vừa tạo.",
      );
      return;
    }

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setNotice("Trình duyệt hiện tại không hỗ trợ ghi âm trực tiếp.");
      return;
    }

    clearUploadState();
    clearRecordingState();
    discardRecordingPreviewOnStopRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (discardRecordingPreviewOnStopRef.current) {
          recordedChunksRef.current = [];
          discardRecordingPreviewOnStopRef.current = false;
          setRecordingFile(null);
          return;
        }

        if (!recordedChunksRef.current.length) {
          return;
        }

        const blobType = recorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: blobType,
        });
        const extension = blobType.includes("ogg")
          ? "ogg"
          : blobType.includes("mpeg") || blobType.includes("mp3")
            ? "mp3"
            : "webm";
        const nextRecordingFile = new File(
          [recordedBlob],
          `recording-${Date.now()}.${extension}`,
          {
            type: blobType,
          },
        );
        const previewUrl = URL.createObjectURL(recordedBlob);
        setRecordingFile(nextRecordingFile);
        setRecordingPreviewUrl(previewUrl);
      };

      recorder.start(300);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();
    } catch {
      setNotice(
        "Không thể truy cập micro. Vui lòng kiểm tra quyền trình duyệt.",
      );
      return;
    }

    setRecordingSecond(0);
    setIsRecording(true);
    setInputMode("recording");
    discardRecordingPreviewOnStopRef.current = false;
    setActiveMeeting((prev) => ({
      ...prev,
      inputSource: "recording",
      processingStatus: "idle",
      fileName: "Bản thu đang ghi...",
      speakerCount: 0,
      segments: [],
      speakerSummaries: [],
      rawTranscript: initialMeeting.rawTranscript,
      refinedTranscript: initialMeeting.refinedTranscript,
    }));
    setNotice("Đang thu âm trực tiếp, nhấn dừng để xử lý bản thu.");
  }

  function handleProcessRecording() {
    if (recordingSecond === 0 || !recordingPreviewUrl || !recordingFile) {
      setNotice("Bản thu quá ngắn. Vui lòng thu âm lại ít nhất vài giây.");
      return;
    }

    startProcessing("recording", activeMeeting.fileName, recordingSecond);
  }

  function handleClearRecording() {
    if (busyProcessing || isRecording) {
      return;
    }

    discardRecordingPreviewOnStopRef.current = true;
    clearRecordingState();
    setNotice("Đã xóa bản ghi. Bạn có thể thu âm lại từ đầu.");

    setActiveMeeting((prev) => ({
      ...prev,
      inputSource: "recording",
      fileName: "Chưa có bản ghi",
      durationSecond: 0,
      processingStatus: "idle",
      speakerCount: 0,
      segments: [],
      speakerSummaries: [],
      rawTranscript: initialMeeting.rawTranscript,
      refinedTranscript: initialMeeting.refinedTranscript,
      minutes: initialMeeting.minutes,
    }));
  }

  function handleOpenMinutesEditor() {
    setMinutesDraft(activeMeeting.minutes);
    setMinutesValidationError(null);
    setIsMinutesDialogOpen(true);
  }

  function handleSaveMinutesDraft() {
    if (isSavingMinutes) {
      return;
    }

    const parsed = minutesDraftSchema.safeParse(minutesDraft);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      setMinutesValidationError(message ?? "Biên bản không hợp lệ.");
      return;
    }

    const apiRecordId = activeMeeting.apiRecordId;

    if (!apiRecordId) {
      setMinutesValidationError("Không có ID phiên họp để lưu biên bản.");
      return;
    }

    setMinutesValidationError(null);
    setNotice("Đang lưu biên bản...");
    setIsSavingMinutes(true);

    void (async () => {
      try {
        const result = await updateReportMutation.mutateAsync({
          id: apiRecordId,
          textContent: parsed.data,
        });

        setActiveMeeting((prev) => ({
          ...prev,
          minutes: parsed.data,
          reportUrl: result.reportUrl,
        }));
        setMinutesDraft(parsed.data);
        setIsMinutesDialogOpen(false);
        setNotice("Đã lưu biên bản thành công. Vui lòng gửi email để chia sẻ.");
        showActionToast("Đã lưu biên bản thành công.");
        setIsEmailDialogOpen(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Lỗi không xác định";
        setMinutesValidationError(`Lỗi khi lưu biên bản: ${message}`);
        setNotice(`Lỗi lưu biên bản: ${message}`);
      } finally {
        setIsSavingMinutes(false);
      }
    })();
  }

  function handleSendEmail(recipients: string[]) {
    if (!canSendEmail || isSendingEmail) {
      if (!activeMeeting.reportUrl?.trim()) {
        setNotice("Vui lòng xem, chỉnh sửa và lưu biên bản để gửi email.");
      }
      return;
    }

    setIsSendingEmail(true);
    setNotice("Đang gọi agent để gửi email...");

    void (async () => {
      try {
        await sendMeetingEmailViaAgent({
          recipients,
          meetingTitle: activeMeeting.title,
          minutes: activeMeeting.minutes,
          rawTranscript: activeMeeting.rawTranscript,
          reportUrl: activeMeeting.reportUrl,
          sessionId: process.env.NEXT_PUBLIC_AGENT_MOM_EMAIL_SESSION_ID,
        });

        setActiveMeeting((prev) => ({
          ...prev,
          emailStatus: "sent",
          emailLogs: [
            ...recipients.map((recipient) => ({
              id: `email-${recipient}-${Date.now()}`,
              recipient,
              sentAt: new Date().toISOString(),
              status: "sent" as const,
            })),
            ...prev.emailLogs,
          ],
        }));
        setIsEmailDialogOpen(false);
        setNotice("Agent đã xử lý gửi email thành công.");
        showActionToast("Đã gửi email thành công.");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        setActiveMeeting((prev) => ({
          ...prev,
          emailStatus: "failed",
          emailLogs: [
            ...recipients.map((recipient) => ({
              id: `email-failed-${recipient}-${Date.now()}`,
              recipient,
              sentAt: new Date().toISOString(),
              status: "failed" as const,
            })),
            ...prev.emailLogs,
          ],
        }));
        setNotice(`Gửi email thất bại: ${errorMessage}`);
        showActionToast(`Gửi email thất bại: ${errorMessage}`);
      } finally {
        setIsSendingEmail(false);
      }
    })();
  }

  function handleSubmitSendEmail() {
    const parsed = recipientEmailsSchema.safeParse(emailRecipientsInput);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      setEmailValidationError(message ?? "Danh sách email không hợp lệ.");
      return;
    }

    setEmailValidationError(null);
    handleSendEmail(parsed.data);
  }

  return (
    <div className="grid flex-1 gap-4 lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[1fr_1.8fr] lg:items-start">
      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            Hệ thống phiên dịch âm thanh thông minh
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

        <div className="mt-4 inline-flex rounded-lg border border-border/70 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => handleSwitchMode("upload")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              inputMode === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            disabled={busyProcessing}
          >
            Tải tệp
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("recording")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              inputMode === "recording"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            disabled={busyProcessing}
          >
            Thu âm trực tiếp
          </button>
        </div>

        {inputMode === "upload" ? (
          <UploadPanel
            busyProcessing={busyProcessing}
            isDraggingUpload={isDraggingUpload}
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            selectedFileName={selectedFileName}
            selectedFileSizeLabel={selectedFileSizeLabel}
            selectedFileDurationLabel={selectedFileDurationLabel}
            filePreviewUrl={filePreviewUrl}
            uploadWarning={uploadWarning}
            onDragEnter={handleUploadDragEnter}
            onDragOver={handleUploadDragOver}
            onDragLeave={handleUploadDragLeave}
            onDrop={handleUploadDrop}
            onFileChange={handleFileChange}
            onProcessSelectedFile={handleProcessSelectedFile}
            onClearSelectedFile={handleClearSelectedFile}
          />
        ) : (
          <RecordingPanel
            busyProcessing={busyProcessing}
            isRecording={isRecording}
            recordingSecond={recordingSecond}
            recordingPreviewUrl={recordingPreviewUrl}
            recordingDurationLabel={recordingDurationLabel}
            onToggleRecording={handleToggleRecording}
            onProcessRecording={handleProcessRecording}
            onClearRecording={handleClearRecording}
          />
        )}

        {shouldShowPipeline ? (
          <>
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

            <div className="mt-3 rounded-lg border border-border/70 bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pipeline chi tiết
                </h3>
                {canRetryPipeline ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={handleRetryPipeline}
                  >
                    Thử lại bước lỗi
                  </Button>
                ) : null}
              </div>
              {failedStepId ? (
                <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">
                  Đã phát hiện lỗi ở bước: {failedStepId}. Bạn có thể thử lại để
                  chạy lại pipeline.
                </p>
              ) : null}
              <ul className="mt-3 space-y-2">
                {pipelineSteps.map((step) => {
                  const statusMeta =
                    step.status === "completed"
                      ? {
                          icon: (
                            <CheckCircle2Icon className="size-4 text-emerald-600" />
                          ),
                          label: "Hoàn tất",
                        }
                      : step.status === "running"
                        ? {
                            icon: (
                              <CircleDashedIcon className="size-4 animate-spin text-amber-600" />
                            ),
                            label: "Đang chạy",
                          }
                        : step.status === "error"
                          ? {
                              icon: (
                                <XCircleIcon className="size-4 text-rose-600" />
                              ),
                              label: "Lỗi",
                            }
                          : {
                              icon: (
                                <CircleIcon className="size-4 text-muted-foreground/60" />
                              ),
                              label: "Chờ",
                            };

                  return (
                    <li
                      key={step.id}
                      className="rounded-md border border-border/60 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {statusMeta.icon}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        {/* <span className="text-[11px] font-medium text-muted-foreground">
                          {statusMeta.label}
                        </span> */}
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : null}

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
                isRecording
                  ? Math.max(1, Math.round(recordingElapsedMs / 1000))
                  : activeMeeting.durationSecond,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm lg:flex lg:max-h-[calc(100dvh-8.5rem)] lg:flex-col lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Kết quả xử lý
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleGenerateMinutes}
              disabled={activeMeeting.processingStatus !== "completed"}
            >
              <SparklesIcon className="size-4" />
              Tinh chỉnh biên bản
            </Button> */}
            {/* <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshSpeakerSummary}
              disabled={activeMeeting.processingStatus !== "completed"}
            >
              Tóm tắt theo người nói
            </Button> */}
            <Dialog
              open={isEmailDialogOpen}
              onOpenChange={(nextOpen) => {
                if (nextOpen && !canSendEmail) {
                  setNotice(
                    "Vui lòng xem, chỉnh sửa và lưu biên bản để gửi email.",
                  );
                  return;
                }

                setIsEmailDialogOpen(nextOpen);
                if (nextOpen) {
                  setEmailValidationError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <div className="inline-flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5"
                    disabled={!canSendEmail}
                  >
                    Gửi email
                    <ArrowUpRightIcon className="size-4" />
                  </Button>
                  {!canSendEmail ? (
                    <div className="group relative">
                      <InfoIcon className="size-4 text-muted-foreground" />
                      <div className="pointer-events-none absolute right-0 top-5 z-10 hidden w-64 rounded-md border border-border/70 bg-popover px-2 py-1.5 text-[11px] leading-4 text-popover-foreground shadow-md group-hover:block">
                        Vui lòng xem, chỉnh sửa và lưu biên bản để gửi email.
                      </div>
                    </div>
                  ) : null}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Gửi email biên bản</DialogTitle>
                  <DialogDescription>
                    Nhập danh sách email, cách nhau bởi dấu phẩy hoặc xuống
                    dòng.
                  </DialogDescription>
                </DialogHeader>

                {activeMeeting.reportUrl ? (
                  <div className="min-w-0 space-y-1 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      URL file biên bản
                    </p>
                    <a
                      href={activeMeeting.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground transition-colors hover:text-primary hover:underline hover:underline-offset-2"
                      title={activeMeeting.reportUrl}
                    >
                      {activeMeeting.reportUrl}
                    </a>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label
                    htmlFor="email-recipients"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Danh sách người nhận
                  </label>
                  <textarea
                    id="email-recipients"
                    value={emailRecipientsInput}
                    onChange={(event) => {
                      setEmailRecipientsInput(event.target.value);
                      if (emailValidationError) {
                        setEmailValidationError(null);
                      }
                    }}
                    placeholder={
                      "a@company.vn, b@company.vn\nleader@company.vn"
                    }
                    rows={5}
                    disabled={isSendingEmail}
                    className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  {emailValidationError ? (
                    <p className="text-xs text-rose-600 dark:text-rose-300">
                      {emailValidationError}
                    </p>
                  ) : null}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSendingEmail}
                    >
                      Hủy
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={handleSubmitSendEmail}
                    disabled={isSendingEmail}
                    className="gap-1.5"
                  >
                    {isSendingEmail ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : null}
                    Xác nhận gửi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <p className="mt-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </p>

        {shouldShowMinutes ? (
          <div className="mt-4 rounded-lg border border-border/70 bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Biên bản cuộc họp
                </h3>
                <p className="text-xs text-muted-foreground">
                  Có thể xem nhanh, chỉnh sửa và lưu lại.
                </p>
              </div>

              <Dialog
                open={isMinutesDialogOpen}
                onOpenChange={(nextOpen) => {
                  if (isSavingMinutes) {
                    return;
                  }

                  setIsMinutesDialogOpen(nextOpen);
                  if (nextOpen) {
                    setMinutesDraft(activeMeeting.minutes);
                    setMinutesValidationError(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenMinutesEditor}
                  >
                    Xem/Sửa biên bản
                  </Button>
                </DialogTrigger>
                <DialogContent
                  showCloseButton={false}
                  className="mb-4 flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col justify-between gap-0 overflow-hidden rounded-xl p-0 sm:max-w-none"
                >
                  <DialogHeader className="space-y-0 text-left">
                    <DialogTitle className="px-6 pt-6 text-base">
                      Biên bản cuộc họp
                    </DialogTitle>
                    <DialogDescription className="px-6 pb-3 text-xs">
                      Chỉnh sửa trực tiếp rồi lưu lại, popup đang mở toàn màn
                      hình.
                    </DialogDescription>
                    {activeMeeting.reportUrl ? (
                      <div className="px-6 pb-3">
                        <div className="flex items-center gap-2 rounded-md border border-emerald-200/50 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <div className="flex flex-col gap-1">
                            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                              Biên bản đã lưu
                            </p>
                            <a
                              href={activeMeeting.reportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 underline transition-colors hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                            >
                              <ArrowUpRightIcon className="size-3" />
                              Xem file biên bản
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </DialogHeader>

                  <div className="min-h-0 flex-1 px-6 pb-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="minutes-draft"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Nội dung biên bản
                      </label>
                      <textarea
                        id="minutes-draft"
                        value={minutesDraft}
                        onChange={(event) => {
                          setMinutesDraft(event.target.value);
                          if (minutesValidationError) {
                            setMinutesValidationError(null);
                          }
                        }}
                        disabled={isSavingMinutes}
                        rows={26}
                        className="min-h-[calc(100dvh-13rem)] w-full resize-none overflow-auto rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                      {minutesValidationError ? (
                        <p className="text-xs text-rose-600 dark:text-rose-300">
                          {minutesValidationError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <DialogFooter className="mx-0 mb-0 rounded-none border-t px-6 pb-6 pt-4 sm:justify-end">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSavingMinutes}
                      >
                        Hủy
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      onClick={handleSaveMinutesDraft}
                      disabled={isSavingMinutes}
                      className="gap-1.5"
                    >
                      {isSavingMinutes ? (
                        <LoaderCircleIcon className="size-4 animate-spin" />
                      ) : null}
                      Lưu biên bản
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="prose prose-sm mt-3 max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-td:text-muted-foreground prose-th:text-foreground dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeMeeting.minutes}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}

        {shouldShowRawTranscript ? (
          <div className="mt-4 rounded-lg border border-border/70 bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Đối chiếu transcript
                </h3>
                {/* <span className="inline-flex rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {activeMeeting.inputSource === "upload"
                    ? "Nguồn: nhận diện tự động"
                    : "Nguồn: dữ liệu mô phỏng"}
                </span> */}
              </div>

              <div className="flex items-center gap-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Mở toàn màn hình raw transcript"
                      title="Mở toàn màn hình"
                    >
                      <Maximize2Icon className="size-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent
                    showCloseButton={false}
                    className="mb-4 flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col justify-between gap-0 rounded-xl p-0 sm:max-w-none"
                  >
                    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                      <DialogHeader className="space-y-0 text-left">
                        <DialogTitle className="px-6 pt-6 text-base">
                          Đối chiếu transcript toàn phiên
                        </DialogTitle>
                        <DialogDescription className="px-6 pb-3 text-xs">
                          So sánh bản gốc và bản đã làm sạch để rà soát nhanh.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label="Copy bản gốc từ nhận diện"
                              title="Copy bản gốc"
                              onClick={handleCopyRawTranscript}
                            >
                              <CopyIcon className="size-4" />
                            </Button>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Bản gốc từ nhận diện
                            </p>
                          </div>
                          <p className="max-h-[55dvh] overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                            {activeMeeting.rawTranscript}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label="Copy bản đã làm sạch"
                              title="Copy bản sạch"
                              onClick={handleCopyRefinedTranscript}
                              disabled={!shouldShowRefinedTranscript}
                            >
                              <CopyIcon className="size-4" />
                            </Button>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Bản đã làm sạch
                            </p>
                          </div>
                          <p className="max-h-[55dvh] overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                            {activeMeeting.refinedTranscript ??
                              "Chưa có bản làm sạch từ hệ thống."}
                          </p>
                        </div>
                      </div>
                    </ScrollArea>

                    <DialogFooter className="mx-0 mb-0 rounded-none border-t px-6 pb-6 pt-4 sm:justify-end">
                      <DialogClose asChild>
                        <Button variant="outline">
                          <ChevronLeftIcon className="size-4" />
                          Quay lại
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Copy bản gốc từ nhận diện"
                    title="Copy bản gốc"
                    onClick={handleCopyRawTranscript}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                  <p className="text-xs font-medium text-muted-foreground">
                    Bản gốc từ nhận diện
                  </p>
                </div>
                <p className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-3 pr-2 text-sm leading-7 text-muted-foreground">
                  {activeMeeting.rawTranscript}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Copy bản đã làm sạch"
                    title="Copy bản sạch"
                    onClick={handleCopyRefinedTranscript}
                    disabled={!shouldShowRefinedTranscript}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                  <p className="text-xs font-medium text-muted-foreground">
                    Bản đã làm sạch
                  </p>
                </div>
                <p className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-3 pr-2 text-sm leading-7 text-muted-foreground">
                  {activeMeeting.refinedTranscript ??
                    "Chưa có bản làm sạch từ hệ thống."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {shouldShowDiarization || shouldShowSpeakerSummary ? (
          <div className="mt-4 space-y-4">
            {shouldShowDiarization ? (
              <article className="rounded-lg border border-border/70 bg-linear-to-b from-background to-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Transcript theo người nói
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {activeMeeting.speakerCount} speaker
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Mở toàn màn hình transcript theo người nói"
                          title="Mở toàn màn hình"
                        >
                          <Maximize2Icon className="size-4" />
                        </Button>
                      </DialogTrigger>

                      <DialogContent
                        showCloseButton={false}
                        className="mb-4 flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col justify-between gap-0 rounded-xl p-0 sm:max-w-none"
                      >
                        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                          <DialogHeader className="space-y-0 text-left">
                            <DialogTitle className="px-6 pt-6 text-base">
                              Transcript theo người nói
                            </DialogTitle>
                            <DialogDescription className="px-6 pb-3 text-xs">
                              Xem đầy đủ để đối sánh nội dung theo từng người
                              nói.
                            </DialogDescription>
                          </DialogHeader>

                          <div
                            className={`grid gap-4 px-6 pb-6 ${
                              shouldShowRefinedDiarization
                                ? "md:grid-cols-2"
                                : "grid-cols-1"
                            }`}
                          >
                            <section className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Bản gốc theo người nói
                              </p>
                              <ul className="space-y-2 overflow-auto pr-1 md:max-h-[55dvh]">
                                {activeMeeting.segments.map((segment) => (
                                  <li
                                    key={`dialog-${segment.id}`}
                                    className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(segment.speaker)}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                                        {segment.speaker}
                                      </span>
                                      <span className="text-[11px] font-medium text-muted-foreground">
                                        {formatTimelineSecond(
                                          segment.startSecond,
                                        )}{" "}
                                        -{" "}
                                        {formatTimelineSecond(
                                          segment.endSecond,
                                        )}
                                      </span>
                                    </div>
                                    <p className="mt-2 leading-6 text-muted-foreground">
                                      {segment.text}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </section>

                            {shouldShowRefinedDiarization ? (
                              <section className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Bản đã làm sạch theo người nói
                                </p>
                                <ul className="space-y-2 overflow-auto pr-1 md:max-h-[55dvh]">
                                  {refinedSegments.map((segment) => (
                                    <li
                                      key={`dialog-refined-${segment.id}`}
                                      className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(segment.speaker)}`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                                          {segment.speaker}
                                        </span>
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                          {formatTimelineSecond(
                                            segment.startSecond,
                                          )}{" "}
                                          -{" "}
                                          {formatTimelineSecond(
                                            segment.endSecond,
                                          )}
                                        </span>
                                      </div>
                                      <p className="mt-2 leading-6 text-muted-foreground">
                                        {segment.text}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            ) : null}
                          </div>
                        </ScrollArea>

                        <DialogFooter className="mx-0 mb-0 rounded-none border-t px-6 pb-6 pt-4 sm:justify-end">
                          <DialogClose asChild>
                            <Button variant="outline">
                              <ChevronLeftIcon className="size-4" />
                              Quay lại
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div
                  className={`mt-3 grid gap-3 ${
                    shouldShowRefinedDiarization
                      ? "md:grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  <section className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Bản gốc theo người nói
                    </p>
                    <ul className="space-y-2 overflow-auto pr-1 xl:max-h-[52dvh]">
                      {activeMeeting.segments.map((segment) => (
                        <li
                          key={segment.id}
                          className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(segment.speaker)}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                              {segment.speaker}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {formatTimelineSecond(segment.startSecond)} -{" "}
                              {formatTimelineSecond(segment.endSecond)}
                            </span>
                          </div>
                          <p className="mt-2 leading-6 text-muted-foreground">
                            {segment.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {shouldShowRefinedDiarization ? (
                    <section className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Bản đã làm sạch theo người nói
                      </p>
                      <ul className="space-y-2 overflow-auto pr-1 xl:max-h-[52dvh]">
                        {refinedSegments.map((segment) => (
                          <li
                            key={`refined-${segment.id}`}
                            className={`rounded-md border border-border/60 border-l-4 p-3 text-sm ${speakerToneClass(segment.speaker)}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                                {segment.speaker}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {formatTimelineSecond(segment.startSecond)} -{" "}
                                {formatTimelineSecond(segment.endSecond)}
                              </span>
                            </div>
                            <p className="mt-2 leading-6 text-muted-foreground">
                              {segment.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </article>
            ) : null}

            {shouldShowSpeakerSummary ? (
              <article className="rounded-lg border border-border/70 bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Tóm tắt theo người nói
                </h3>
                <ul className="mt-3 space-y-3 overflow-auto xl:max-h-[52dvh]">
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
              </article>
            ) : null}
          </div>
        ) : null}
      </section>

      {actionToast ? (
        <div className="pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border border-border/70 bg-background/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
          {actionToast}
        </div>
      ) : null}
    </div>
  );
}
