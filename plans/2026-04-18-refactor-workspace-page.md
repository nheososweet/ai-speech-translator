# Plan: Refactor `/app/(main)/workspace/page.tsx`

> **Ngày tạo**: 2026-04-18
> **Trạng thái**: 🟡 Chờ duyệt
> **File gốc**: `app/(main)/workspace/page.tsx` (~2583 dòng, ~99KB)
> **Mục tiêu**: Giảm file chính còn ~200-250 dòng, chia logic & UI ra module rõ ràng, **giữ nguyên 100% hành vi pipeline hiện tại**.

---

## 1. Phân tích hiện trạng

### 1.1 Hiện file `page.tsx` đang chứa gì?

| Vùng code          | Dòng (ước lượng) | Mô tả                                                                 |
| ------------------- | ----------------- | ---------------------------------------------------------------------- |
| Constants & Utils   | 1 → 376           | Hằng số (`MAX_UPLOAD_SIZE_BYTES`, `FAKE_RAW_TRANSCRIPT`, palette CSS), validation schema Zod, pure functions parse/format transcript, pipeline blueprint |
| Component State     | 387 → 447         | ~30 `useState` + ~13 `useRef` quản lý upload, recording, pipeline, dialog, toast |
| State Helpers       | 449 → 461         | `updatePipelineStep`, `resetPipelineSteps`, `markPipelineAsError`      |
| Effects             | 483 → 598         | 5 `useEffect` (cleanup timers, revoke URL, recording timer, audio metadata, refined segments) |
| Derived State       | 539 → 599         | `busyProcessing`, `stageProgress`, `shouldShowX`, `canSendEmail`, etc. |
| Upload Handlers     | 601 → 902         | Drag & Drop, file validation, clear upload state, apply file, switch mode |
| Pipeline Logic      | 952 → 1360        | `startProcessing` – core pipeline: step simulation + real API calls     |
| Recording Handlers  | 1380 → 1549       | `handleToggleRecording`, `handleProcessRecording`, `handleClearRecording` |
| Minutes & Email     | 1551 → 1700       | Save minutes (call `/api/agent/save-minutes`), send email (call agent)  |
| JSX Render          | 1702 → 2583       | Toàn bộ markup: left panel (input + pipeline + session info) + right panel (results + dialogs + transcript + diarization + speaker summary) |

### 1.2 Luồng Pipeline (Flow) cần bảo toàn

```
User chọn file/thu âm
        │
        ▼
  handleProcessSelectedFile() / handleProcessRecording()
        │
        ▼
  startProcessing(source, fileName, duration)
        │
        ├─► upload progress simulation (setInterval)
        │
        ▼
  (Bước 1) API: diarizeAndTranscribe(file)
        │   → raw_transcript step: running → completed
        │   → set rawTranscript + refinedTranscript + segments
        │
        ▼
  (Bước 2) runDiarizationStep (UI simulation)
        │   → diarization step: running → completed
        │   → set segments + speakerCount
        │
        ▼
  (Bước 3) API: generateSpeakerSummariesFromTranscriptLines()
        │   → speaker_summary step: running → completed
        │   → set speakerSummaries
        │
        ▼
  (Bước 4) API: generateMinutesFromTranscript()
        │   → minutes step: running → completed
        │   → set minutes + processingStatus="completed"
        │
        ▼
  Pipeline hoàn tất → User có thể Xem/Sửa biên bản → Lưu → Gửi Email
```

**Lưu ý quan trọng**: Mỗi bước dùng `setInterval` mô phỏng progress UI song song với API call thật. Khi API trả về → clear interval → set 100%. Biến `processingRunIdRef` dùng để cancel pipeline cũ khi user trigger một lần mới.

---

## 2. Kế hoạch chia file

### 2.1 Tổng quan cấu trúc sau refactor

```
app/(main)/workspace/
  page.tsx                          ← ~200 dòng (orchestrator)
  _lib/
    constants.ts                    ← Hằng số, schema, cấu hình pipeline
    transcript-utils.ts             ← Pure functions parse/format transcript
    workspace-types.ts              ← Types riêng workspace (PipelineStep, etc.)

hooks/workspace/
    use-audio-uploader.ts           ← State & handlers upload file
    use-audio-recorder.ts           ← State & handlers thu âm
    use-pipeline-processor.ts       ← Core pipeline state & execution
    use-workspace-actions.ts        ← Minutes save, email send, toast, copy

components/workspace/
    upload-panel.tsx                ← (đã có, giữ nguyên)
    recording-panel.tsx             ← (đã có, giữ nguyên)
    pipeline-progress.tsx           ← NEW: progress bar + step list
    session-info-card.tsx           ← NEW: thông tin phiên hiện tại
    minutes-section.tsx             ← NEW: hiển thị biên bản + dialog Edit
    transcript-section.tsx          ← NEW: raw/refined transcript + fullscreen dialog
    diarization-section.tsx         ← NEW: transcript theo người nói + fullscreen dialog
    speaker-summary-section.tsx     ← NEW: tóm tắt theo người nói
    action-toast.tsx                ← NEW: toast notification component
```

---

## 3. Chi tiết từng Task

### Task 1: Tạo utility files (`_lib/`)
> **Mức độ rủi ro**: Thấp – chỉ move code, không thay đổi logic

- [ ] **1.1** Tạo `app/(main)/workspace/_lib/workspace-types.ts`
  - Move: `PipelineStepStatus`, `PipelineStep`, `PIPELINE_STEP_BLUEPRINT`, `PIPELINE_STEP_WEIGHT`
  - Export all

- [ ] **1.2** Tạo `app/(main)/workspace/_lib/constants.ts`
  - Move: `MAX_UPLOAD_SIZE_BYTES`, `ACCEPTED_AUDIO_MIME_TYPES`, `ACCEPTED_AUDIO_EXTENSIONS`
  - Move: `FAKE_RAW_TRANSCRIPT`, `initialMeeting` (giữ import `meetingRecords` mock)
  - Move: `recipientEmailsSchema`, `minutesDraftSchema` (Zod schemas)
  - Move: `DIARIZATION_LINE_PATTERN`, `SPEAKER_TAG_PATTERN`

- [ ] **1.3** Tạo `app/(main)/workspace/_lib/transcript-utils.ts`
  - Move: `cleanTranscriptLine`, `formatTimelineSecond`, `parseTranscriptSegments`
  - Move: `deriveSpeakerCount`, `buildSpeakerSummariesFromSegments`
  - Move: `speakerToneClass`, `formatDuration`, `formatFileSize`
  - Move: `isSupportedAudioFile`, `statusConfig`, `clearTimer`
  - Move: `createInitialPipelineSteps`

- [ ] **1.4** Verify: Tạo xong 3 file, kiểm tra tất cả exports, chưa sửa page.tsx

---

### Task 2: Tạo custom hooks (`hooks/workspace/`)
> **Mức độ rủi ro**: Trung bình – cần cẩn thận scope của useRef và closure

- [ ] **2.1** Tạo `hooks/workspace/use-audio-uploader.ts`
  - State: `selectedFile`, `selectedFileName`, `selectedFileSizeBytes`, `selectedFileDurationSecond`, `filePreviewUrl`, `uploadWarning`, `isDraggingUpload`, `uploadProgress`
  - Refs: `fileInputRef`, `uploadDragCountRef`
  - Effects: revoke file preview URL, load audio metadata duration
  - Handlers: `applySelectedFile`, `handleFileChange`, `handleUploadDragEnter/Over/Leave/Drop`, `handleClearSelectedFile`
  - Derived: `selectedFileSizeLabel`, `selectedFileDurationLabel`
  - Export: `clearUploadState()` để pipeline hook có thể gọi reset

- [ ] **2.2** Tạo `hooks/workspace/use-audio-recorder.ts`
  - State: `isRecording`, `recordingElapsedMs`, `recordingSecond`, `recordingPreviewUrl`, `recordingFile`
  - Refs: `recordingTimerRef`, `recordingStartedAtRef`, `mediaRecorderRef`, `mediaStreamRef`, `recordedChunksRef`, `discardRecordingPreviewOnStopRef`
  - Effects: recording timer interval, revoke recording preview URL, cleanup on unmount
  - Handlers: `handleToggleRecording`, `handleClearRecording`
  - Derived: `recordingDurationLabel`
  - Export: `clearRecordingState()` để pipeline hook gọi reset

- [ ] **2.3** Tạo `hooks/workspace/use-pipeline-processor.ts`
  - State: `pipelineSteps`, `failedStepId`, `processingProgress`
  - Refs: `processingTimerRef`, `uploadTimerRef`, `processingRunIdRef`
  - Core method: `startProcessing(source, fileName, duration, audioFile)`
    - Nhận `audioFile: File` trực tiếp thay vì đọc từ closure
    - Nội bộ chạy chuỗi: diarize API → diarization sim → speaker summary API → minutes API
    - Mỗi bước dùng setInterval mô phỏng + API thật, giữ nguyên logic `processingRunIdRef`
  - Helper: `updatePipelineStep`, `resetPipelineSteps`, `markPipelineAsError`
  - Derived: `stageProgress`, `shouldShowPipeline`, `canRetryPipeline`, `busyProcessing`
  - Return: Toàn bộ state + `startProcessing` + `handleRetryPipeline`
  - **Quan trọng**: Hook này cần nhận `activeMeeting` setter từ bên ngoài vì pipeline cập nhật `MeetingRecord`

- [ ] **2.4** Tạo `hooks/workspace/use-workspace-actions.ts`
  - State: `isEmailDialogOpen`, `emailRecipientsInput`, `emailValidationError`, `isSendingEmail`
  - State: `isMinutesDialogOpen`, `minutesDraft`, `minutesValidationError`, `isSavingMinutes`
  - State: `actionToast`, `notice`
  - Refs: `toastTimerRef`
  - Handlers: `handleOpenMinutesEditor`, `handleSaveMinutesDraft`, `handleSubmitSendEmail`, `handleSendEmail`
  - Handlers: `handleCopyRawTranscript`, `handleCopyRefinedTranscript`
  - Helper: `showActionToast`

- [ ] **2.5** Verify: Tạo xong 4 hooks, kiểm tra tất cả type imports chính xác

---

### Task 3: Tạo UI Components (`components/workspace/`)
> **Mức độ rủi ro**: Thấp – chỉ tách JSX ra file riêng, truyền props

- [ ] **3.1** Tạo `components/workspace/pipeline-progress.tsx`
  - Props: `pipelineSteps`, `stageProgress`, `failedStepId`, `canRetryPipeline`, `onRetry`
  - JSX: progress bar tổng + danh sách 4 step (icon theo status, title, description, progress bar từng step)
  - Bao gồm nút "Thử lại bước lỗi"

- [ ] **3.2** Tạo `components/workspace/session-info-card.tsx`
  - Props: `title`, `inputSource`, `speakerCount`, `durationSecond`, `isRecording`, `recordingElapsedMs`
  - JSX: card hiển thị 4 trường thông tin phiên

- [ ] **3.3** Tạo `components/workspace/minutes-section.tsx`
  - Props: `minutes`, `reportUrl`, `isDialogOpen`, `onOpenChange`, `minutesDraft`, `onDraftChange`, `minutesValidationError`, `isSaving`, `onSave`, `onOpenEditor`
  - JSX: card biên bản + Markdown render + Dialog toàn màn hình chỉnh sửa

- [ ] **3.4** Tạo `components/workspace/transcript-section.tsx`
  - Props: `rawTranscript`, `refinedTranscript`, `shouldShowRefined`, `onCopyRaw`, `onCopyRefined`
  - JSX: card đối chiếu transcript (raw vs refined) ở cả dạng thu gọn và fullscreen dialog

- [ ] **3.5** Tạo `components/workspace/diarization-section.tsx`
  - Props: `segments`, `refinedSegments`, `speakerCount`, `shouldShowRefinedDiarization`
  - JSX: danh sách segments theo người nói (dạng thu gọn + dialog toàn màn hình)
  - Import `speakerToneClass`, `formatTimelineSecond` từ `_lib/transcript-utils`

- [ ] **3.6** Tạo `components/workspace/speaker-summary-section.tsx`
  - Props: `speakerSummaries`
  - JSX: danh sách tóm tắt theo speaker

- [ ] **3.7** Tạo `components/workspace/email-dialog.tsx`
  - Props: `isOpen`, `onOpenChange`, `canSendEmail`, `reportUrl`, `recipientsInput`, `onRecipientsChange`, `validationError`, `isSending`, `onSubmit`
  - JSX: Dialog gửi email (textarea recipients + validation + submit)

- [ ] **3.8** Tạo `components/workspace/action-toast.tsx`
  - Props: `message: string | null`
  - JSX: fixed position toast ở góc phải dưới

- [ ] **3.9** Verify: Tất cả components render đúng, props type-safe

---

### Task 4: Rewrite `page.tsx` (Orchestrator)
> **Mức độ rủi ro**: Cao – cần kết nối lại tất cả hooks & components

- [ ] **4.1** Import tất cả hooks và components mới
- [ ] **4.2** Giữ state `activeMeeting` và `inputMode` ở page level (vì cần chia sẻ giữa hooks)
- [ ] **4.3** Khởi tạo 4 custom hooks, truyền `activeMeeting` / `setActiveMeeting` / `notice` setter vào
- [ ] **4.4** Wire up `handleSwitchMode` (cần gọi `clearUploadState` + `clearRecordingState` cross-hook)
- [ ] **4.5** Wire up `handleProcessSelectedFile` / `handleProcessRecording` → gọi `startProcessing` từ pipeline hook
- [ ] **4.6** Compose JSX: đặt các components vào đúng grid layout hiện tại
  - Left section: title + status badge + mode switch + UploadPanel/RecordingPanel + PipelineProgress + SessionInfoCard
  - Right section: header + EmailDialog + notice bar + MinutesSection + TranscriptSection + DiarizationSection + SpeakerSummarySection
  - ActionToast (fixed)
- [ ] **4.7** Verify: Page render đúng layout, không lỗi TypeScript

---

### Task 5: Integration Test
> **Mức độ rủi ro**: N/A – đây là bước kiểm tra

- [ ] **5.1** Chạy `pnpm dev`, mở trang `/workspace`, kiểm tra UI render đúng
- [ ] **5.2** Test chế độ Upload:
  - [ ] Kéo thả file audio → hiển thị thông tin file
  - [ ] Chọn file không hợp lệ → hiện warning
  - [ ] Nhấn xử lý → pipeline chạy 4 bước → hiển thị results
- [ ] **5.3** Test chế độ Thu âm:
  - [ ] Bắt đầu thu → hiển thị timer
  - [ ] Dừng thu → hiển thị preview + nút xử lý
  - [ ] Nhấn xử lý → pipeline chạy
- [ ] **5.4** Test kết quả:
  - [ ] Biên bản hiển thị markdown đúng
  - [ ] Mở dialog sửa biên bản → sửa → lưu → toast thành công
  - [ ] Copy raw/refined transcript → toast
  - [ ] Transcript đối chiếu fullscreen hoạt động
  - [ ] Diarization fullscreen hoạt động
  - [ ] Speaker summary hiển thị đúng
- [ ] **5.5** Test gửi Email:
  - [ ] Trước khi lưu biên bản → nút disabled + tooltip
  - [ ] Sau khi lưu → mở dialog → nhập email → gửi → toast
- [ ] **5.6** Test retry pipeline khi gặp lỗi
- [ ] **5.7** Test chuyển mode upload ↔ recording khi pipeline chưa chạy + đang chạy
- [ ] **5.8** Build check: `pnpm build` pass không lỗi

---

## 4. Thứ tự thực hiện

```
Task 1 (Utils)
    │
    ▼
Task 2 (Hooks) ──► cần Task 1 xong để import constants/utils
    │
    ▼
Task 3 (Components) ──► cần Task 1 xong để import utils
    │
    ▼
Task 4 (Rewrite page.tsx) ──► cần Task 2 + 3 xong
    │
    ▼
Task 5 (Test)
```

**Ước lượng**: 5 tasks, tổng ~15-20 subtasks.

---

## 5. Nguyên tắc an toàn

1. **Không thay đổi bất kỳ behavior nào** – chỉ đổi vị trí code (move) và giao tiếp qua props/return values.
2. **`UploadPanel` và `RecordingPanel` giữ nguyên** – đã được tách trước đó, chỉ cần đảm bảo props không thay đổi.
3. **`processingRunIdRef` pattern giữ nguyên** – đây là cơ chế cancel pipeline cũ, rất quan trọng.
4. **Mock data (`meetingRecords[0]`) giữ nguyên** – chỉ move import sang constants.
5. **Không thêm dependency mới** – chỉ dùng React built-in.

---

## 6. Checklist tổng quan

- [ ] Task 1: Utility files
- [ ] Task 2: Custom hooks
- [ ] Task 3: UI Components
- [ ] Task 4: Rewrite page.tsx
- [ ] Task 5: Integration test
