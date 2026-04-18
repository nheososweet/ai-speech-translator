import { useState, useRef, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AudioInputSource, MeetingRecord, SpeakerSummary, TranscriptSegment } from "@/lib/types/meeting";
import {
  buildSpeakerSummariesFromSegments,
  cleanTranscriptLine,
  clearTimer,
  createInitialPipelineSteps,
  deriveSpeakerCount,
  parseTranscriptSegments
} from "@/app/(main)/workspace/_lib/transcript-utils";
import type { PipelineStep } from "@/app/(main)/workspace/_lib/workspace-types";
import { FAKE_RAW_TRANSCRIPT, PIPELINE_STEP_WEIGHT, sourceMeeting } from "@/app/(main)/workspace/_lib/constants";
import { diarizeAndTranscribe } from "@/lib/diarize-client";
import { generateSpeakerSummariesFromTranscriptLines, generateMinutesFromTranscript } from "@/lib/agent-client";

export function usePipelineProcessor({
  activeMeeting,
  setActiveMeeting,
  setNotice,
  setUploadProgress,
}: {
  activeMeeting: MeetingRecord;
  setActiveMeeting: Dispatch<SetStateAction<MeetingRecord>>;
  setNotice: (notice: string) => void;
  setUploadProgress: (progress: number) => void;
}) {
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(createInitialPipelineSteps());
  const [failedStepId, setFailedStepId] = useState<PipelineStep["id"] | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRunIdRef = useRef(0);

  useEffect(() => {
    return () => {
      processingRunIdRef.current += 1;
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
    };
  }, []);

  const updatePipelineStep = useCallback((stepId: PipelineStep["id"], updater: (step: PipelineStep) => PipelineStep) => {
    setPipelineSteps((prev) => prev.map((step) => (step.id === stepId ? updater(step) : step)));
  }, []);

  const resetPipelineSteps = useCallback(() => {
    setPipelineSteps(createInitialPipelineSteps());
  }, []);

  const markPipelineAsError = useCallback((message: string, stepId?: PipelineStep["id"]) => {
    if (stepId) {
      setFailedStepId(stepId);
      updatePipelineStep(stepId, (step) => ({ ...step, status: "error" }));
    } else {
      setFailedStepId(null);
    }
    setActiveMeeting((prev) => ({ ...prev, processingStatus: "error" }));
    setNotice(message);
  }, [setActiveMeeting, setNotice, updatePipelineStep]);

  function startProcessing(
    source: AudioInputSource,
    fileName: string,
    durationSecond: number,
    sourceAudioFile: File | null
  ) {
    if (!fileName) {
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
      markPipelineAsError("Không tìm thấy đầu vào hợp lệ cho pipeline.", "raw_transcript");
      return;
    }

    if (!sourceAudioFile) {
      clearTimer(uploadTimerRef);
      clearTimer(processingTimerRef);
      markPipelineAsError(
        source === "upload"
          ? "Không tìm thấy file upload để gọi API bóc băng."
          : "Không tìm thấy bản thu để gọi API bóc băng.",
        "raw_transcript"
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
    setFailedStepId(null);

    setActiveMeeting((prev) => ({
      ...prev,
      title: source === "upload" ? `Phiên xử lý ${fileName}` : "Phiên xử lý bản thu trực tiếp",
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

    let uploadLocalProgress = 100; // Actually set it directly to 100 or start at 0 and go up? It was 100 in the original code, wait, uploadLocalProgress = Math.min(...)

    uploadTimerRef.current = setInterval(() => {
      if (processingRunIdRef.current !== runId) {
        clearTimer(uploadTimerRef);
        return;
      }

      uploadLocalProgress = Math.min(uploadLocalProgress + 14, 100);
      setUploadProgress(uploadLocalProgress);

      if (uploadLocalProgress < 100) return;

      clearTimer(uploadTimerRef);

      if (processingRunIdRef.current !== runId) return;

      setActiveMeeting((current) => ({ ...current, processingStatus: "processing" }));
      setNotice("Đang xử lý nội dung audio...");

      const runPipelineStep = (
        stepId: PipelineStep["id"],
        increment: number,
        intervalMs: number,
        onDone: () => void
      ) => {
        let localProgress = 0;
        updatePipelineStep(stepId, (step) => ({ ...step, status: "running", progress: 0 }));

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

          if (localProgress < 100) return;

          clearTimer(processingTimerRef);
          onDone();
        }, intervalMs);
      };

      const runSpeakerSummaryAndMinutes = (segments: TranscriptSegment[], rawTranscriptText: string) => {
        updatePipelineStep("speaker_summary", (step) => ({ ...step, status: "running", progress: 0 }));

        let summaryProgress = 0;
        const speakerSummaryTimer = setInterval(() => {
          if (processingRunIdRef.current !== runId) {
            clearInterval(speakerSummaryTimer);
            return;
          }
          summaryProgress = Math.min(summaryProgress + 8, 92);
          updatePipelineStep("speaker_summary", (step) => ({ ...step, status: "running", progress: summaryProgress }));
          setProcessingProgress((value) => Math.min(value + 4, 96));
        }, 240);

        void (async () => {
          let summaries: SpeakerSummary[] = buildSpeakerSummariesFromSegments(segments);
          setNotice("Đang tạo tóm tắt ý chính theo từng người...");

          try {
            summaries = await generateSpeakerSummariesFromTranscriptLines({
              transcriptLines: segments.map((segment) => `${segment.speaker} (${segment.startSecond}s - ${segment.endSecond}s): ${segment.text}`),
              sessionId: process.env.NEXT_PUBLIC_AGENT_SPEAKER_SUMMARY_SESSION_ID,
            });
          } catch (error) {
            clearInterval(speakerSummaryTimer);
            markPipelineAsError(`Lỗi tạo tóm tắt theo người nói: ${error instanceof Error ? error.message : String(error)}`, "speaker_summary");
            return;
          }

          if (processingRunIdRef.current !== runId) {
            clearInterval(speakerSummaryTimer);
            return;
          }

          clearInterval(speakerSummaryTimer);
          updatePipelineStep("speaker_summary", (step) => ({ ...step, status: "completed", progress: 100 }));
          setActiveMeeting((current) => ({ ...current, speakerSummaries: summaries }));
          setNotice("Đã có tóm tắt theo từng người, đang tạo biên bản...");

          updatePipelineStep("minutes", (step) => ({ ...step, status: "running", progress: 15 }));
          let minutesProgress = 15;
          const minutesTimer = setInterval(() => {
            if (processingRunIdRef.current !== runId) {
              clearInterval(minutesTimer);
              return;
            }
            minutesProgress = Math.min(minutesProgress + 10, 92);
            updatePipelineStep("minutes", (step) => ({ ...step, status: "running", progress: minutesProgress }));
            setProcessingProgress((value) => Math.min(value + 2, 98));
          }, 240);

          void (async () => {
            try {
              const minutesMarkdown = await generateMinutesFromTranscript({
                rawTranscript: rawTranscriptText,
                sessionId: process.env.NEXT_PUBLIC_AGENT_MINUTES_SESSION_ID,
              });

              if (processingRunIdRef.current !== runId) {
                clearInterval(minutesTimer);
                return;
              }

              clearInterval(minutesTimer);
              updatePipelineStep("minutes", (step) => ({ ...step, status: "completed", progress: 100 }));
              setProcessingProgress(100);

              const nextMinutes = minutesMarkdown.trim() || "Không có biên bản từ API cho phiên hiện tại.";
              setActiveMeeting((current) => ({
                ...current,
                processingStatus: "completed",
                durationSecond: Math.max(durationSecond, 30),
                minutes: nextMinutes,
              }));
              setNotice("Xử lý hoàn tất. Biên bản đã được tạo từ API.");
            } catch (error) {
              clearInterval(minutesTimer);
              if (processingRunIdRef.current !== runId) return;
              markPipelineAsError(`Lỗi tạo biên bản: ${error instanceof Error ? error.message : "Không thể gọi API tạo biên bản."}`, "minutes");
            }
          })();
        })();
      };

      const runDiarizationStep = (segments: TranscriptSegment[], speakerCount: number, rawTranscriptText: string) => {
        runPipelineStep("diarization", 20, 250, () => {
          if (processingRunIdRef.current !== runId) return;

          const safeSegments = segments.length ? segments : sourceMeeting.segments;
          const safeSpeakerCount = speakerCount > 0 ? speakerCount : new Set(safeSegments.map((segment) => segment.speaker)).size;

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
        updatePipelineStep("raw_transcript", (step) => ({ ...step, status: "running", progress: 8 }));

        let rawStepProgress = 8;
        const rawStepTimer = setInterval(() => {
          if (processingRunIdRef.current !== runId) {
            clearInterval(rawStepTimer);
            return;
          }
          rawStepProgress = Math.min(rawStepProgress + 9, 92);
          updatePipelineStep("raw_transcript", (step) => ({ ...step, status: "running", progress: rawStepProgress }));
        }, 240);

        void (async () => {
          try {
            const apiResult = await diarizeAndTranscribe(sourceAudioFile);

            const transcriptLines = apiResult.rawTranscription.map(cleanTranscriptLine).filter((line) => line.length > 0);
            const refinedTranscriptLines = apiResult.refinedTranscription.map(cleanTranscriptLine).filter((line) => line.length > 0);
            const parsedSegments = parseTranscriptSegments(transcriptLines);
            const speakerCount = deriveSpeakerCount(transcriptLines, parsedSegments);
            const mergedTranscript = transcriptLines.join("\n");
            const mergedRefinedTranscript = refinedTranscriptLines.join("\n");

            clearInterval(rawStepTimer);
            updatePipelineStep("raw_transcript", (step) => ({ ...step, status: "completed", progress: 100 }));
            setProcessingProgress((value) => Math.min(value + 20, 100));

            setActiveMeeting((current) => ({
              ...current,
              rawTranscript: mergedTranscript || "Không có transcript text từ API cho phiên hiện tại.",
              refinedTranscript: mergedRefinedTranscript || mergedTranscript || "Không có bản refined từ API cho phiên hiện tại.",
              speakerCount,
              durationSecond: Math.max(durationSecond, current.durationSecond),
              audioUrl: apiResult.audio_url,
              apiRecordId: apiResult.id,
            }));

            setNotice("Đã có nội dung chữ, đang tách hội thoại theo từng người...");
            runDiarizationStep(parsedSegments, speakerCount, mergedTranscript);
          } catch (error) {
            clearInterval(rawStepTimer);
            if (processingRunIdRef.current !== runId) return;
            markPipelineAsError(`Lỗi tạo transcript thô: ${error instanceof Error ? error.message : "Không thể gọi API diarize/transcribe."}`, "raw_transcript");
          }
        })();
        return;
      }

      // fallback
      runPipelineStep("raw_transcript", 18, 260, () => {
        if (processingRunIdRef.current !== runId) return;
        const generatedRawTranscript = FAKE_RAW_TRANSCRIPT;
        setActiveMeeting((current) => ({
          ...current,
          rawTranscript: generatedRawTranscript,
          refinedTranscript: generatedRawTranscript,
        }));
        setNotice("Đã xong phần chuyển văn bản, đang tách theo người nói...");
        runDiarizationStep(sourceMeeting.segments, sourceMeeting.speakerCount, generatedRawTranscript);
      });
    }, 1);
  }

  const stageProgress = (() => {
    if (activeMeeting.processingStatus === "completed") return 100;
    if (activeMeeting.processingStatus === "idle") return 0;
    const weightedProgress = pipelineSteps.reduce((acc, step) => acc + (step.progress * (PIPELINE_STEP_WEIGHT[step.id] ?? 0)) / 100, 0);
    return Math.max(0, Math.min(100, Math.round(weightedProgress)));
  })();

  const shouldShowPipeline = activeMeeting.processingStatus !== "idle";
  const canRetryPipeline = Boolean(failedStepId) && (activeMeeting.processingStatus !== "uploading" && activeMeeting.processingStatus !== "processing");
  const busyProcessing = activeMeeting.processingStatus === "uploading" || activeMeeting.processingStatus === "processing";

  return {
    pipelineSteps,
    failedStepId,
    processingProgress,
    stageProgress,
    shouldShowPipeline,
    canRetryPipeline,
    busyProcessing,
    startProcessing,
    resetPipelineSteps,
  };
}
