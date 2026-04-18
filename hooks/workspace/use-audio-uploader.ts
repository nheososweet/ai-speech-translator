import { useRef, useState, useEffect } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { formatFileSize, isSupportedAudioFile } from "@/app/(main)/workspace/_lib/transcript-utils";
import { MAX_UPLOAD_SIZE_BYTES } from "@/app/(main)/workspace/_lib/constants";

export function useAudioUploader(onNotice: (notice: string) => void) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSizeBytes, setSelectedFileSizeBytes] = useState<number | null>(null);
  const [selectedFileDurationSecond, setSelectedFileDurationSecond] = useState<number | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDragCountRef = useRef(0);

  const selectedFileSizeLabel = selectedFileSizeBytes ? formatFileSize(selectedFileSizeBytes) : "--";

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

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
    uploadDragCountRef.current = 0;
    setIsDraggingUpload(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function applySelectedFile(file: File, onSuccessCallback?: (file: File) => void) {
    if (!isSupportedAudioFile(file)) {
      clearUploadState();
      setUploadWarning("Định dạng không hỗ trợ. Chỉ nhận WAV, MP3, WebM hoặc OGG.");
      onNotice("File không hợp lệ, vui lòng chọn tệp audio đúng định dạng.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      clearUploadState();
      setUploadWarning(`File quá lớn. Giới hạn hiện tại là ${formatFileSize(MAX_UPLOAD_SIZE_BYTES)}.`);
      onNotice("File vượt ngưỡng tải lên, vui lòng chọn file nhỏ hơn.");
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
    
    if (onSuccessCallback) {
        onSuccessCallback(file);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>, onSuccessCallback?: (file: File) => void) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    applySelectedFile(file, onSuccessCallback);
  }

  function handleUploadDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    uploadDragCountRef.current += 1;
    setIsDraggingUpload(true);
  }

  function handleUploadDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingUpload(true);
  }

  function handleUploadDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    uploadDragCountRef.current = Math.max(0, uploadDragCountRef.current - 1);

    if (uploadDragCountRef.current === 0) {
      setIsDraggingUpload(false);
    }
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>, onSuccessCallback?: (file: File) => void) {
    event.preventDefault();
    event.stopPropagation();
    uploadDragCountRef.current = 0;
    setIsDraggingUpload(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    applySelectedFile(file, onSuccessCallback);
  }

  return {
    selectedFile,
    selectedFileName,
    selectedFileSizeBytes,
    selectedFileDurationSecond,
    filePreviewUrl,
    uploadWarning,
    isDraggingUpload,
    uploadProgress,
    setUploadProgress,
    fileInputRef,
    selectedFileSizeLabel,
    clearUploadState,
    handleFileChange,
    handleUploadDragEnter,
    handleUploadDragOver,
    handleUploadDragLeave,
    handleUploadDrop,
  };
}
