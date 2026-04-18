import { useRef, useState, useEffect } from "react";
import { clearTimer } from "@/app/(main)/workspace/_lib/transcript-utils";

export function useAudioRecorder(onNotice: (notice: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [recordingSecond, setRecordingSecond] = useState(0);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const discardRecordingPreviewOnStopRef = useRef(false);

  useEffect(() => {
    return () => {
      clearTimer(recordingTimerRef);

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
  }

  async function startRecording(onSuccessCallback?: () => void) {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onNotice("Trình duyệt hiện tại không hỗ trợ ghi âm trực tiếp.");
      return;
    }

    clearRecordingState();
    discardRecordingPreviewOnStopRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
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
        const recordedBlob = new Blob(recordedChunksRef.current, { type: blobType });
        const extension = blobType.includes("ogg")
          ? "ogg"
          : blobType.includes("mpeg") || blobType.includes("mp3")
            ? "mp3"
            : "webm";
        const nextRecordingFile = new File([recordedBlob], `recording-${Date.now()}.${extension}`, {
          type: blobType,
        });
        const previewUrl = URL.createObjectURL(recordedBlob);
        
        setRecordingFile(nextRecordingFile);
        setRecordingPreviewUrl(previewUrl);
        if (onSuccessCallback) {
            onSuccessCallback();
        }
      };

      recorder.start(300);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();
    } catch {
      onNotice("Không thể truy cập micro. Vui lòng kiểm tra quyền trình duyệt.");
      return;
    }

    setRecordingSecond(0);
    setIsRecording(true);
    discardRecordingPreviewOnStopRef.current = false;
  }

  function stopRecording(onSuccessCallback?: (elapsedSecond: number) => void) {
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
    if (onSuccessCallback) {
        onSuccessCallback(elapsedSecond);
    }
  }

  return {
    isRecording,
    recordingElapsedMs,
    recordingSecond,
    recordingPreviewUrl,
    recordingFile,
    discardRecordingPreviewOnStopRef,
    clearRecordingState,
    startRecording,
    stopRecording,
  };
}
