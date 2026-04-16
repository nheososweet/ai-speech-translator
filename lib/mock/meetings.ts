import type { MeetingRecord } from "@/lib/types/meeting"

export const meetingRecords: MeetingRecord[] = [
  {
    id: "m-2026-001",
    title: "Họp điều hành dự án phiên dịch AI",
    fileName: "hop-dieu-hanh-01.wav",
    inputSource: "upload",
    createdAt: "2026-04-16T08:15:00.000Z",
    durationSecond: 3720,
    speakerCount: 3,
    processingStatus: "completed",
    emailStatus: "sent",
    rawTranscript:
      "Long cập nhật tiến độ tích hợp ASR và đề xuất tối ưu luồng xử lý. Thành nhấn mạnh phần kiểm thử dữ liệu speaker verification. Hà chốt kế hoạch gửi biên bản và timeline triển khai trong tuần.",
    segments: [
      {
        id: "seg-1",
        speaker: "Long",
        startSecond: 16,
        endSecond: 72,
        text: "Tiến độ tích hợp ASR đã đạt mức ổn định cho bộ dữ liệu nội bộ.",
      },
      {
        id: "seg-2",
        speaker: "Thành",
        startSecond: 79,
        endSecond: 145,
        text: "Cần thêm kiểm thử cho tình huống nhiều người nói chồng lấn âm thanh.",
      },
      {
        id: "seg-3",
        speaker: "Hà",
        startSecond: 151,
        endSecond: 210,
        text: "Biên bản sẽ được gửi email cho toàn bộ thành viên vào cuối ngày.",
      },
    ],
    minutes:
      "1) Hoàn tất pipeline bóc băng cho dữ liệu nội bộ. 2) Bổ sung bộ test speaker verification cho audio chồng lấn. 3) Gửi biên bản và checklist hành động trước 18:00.",
    speakerSummaries: [
      {
        speaker: "Long",
        keyPoints: [
          "ASR đã đạt độ ổn định trên tập dữ liệu nội bộ.",
          "Đề xuất ưu tiên tối ưu thời gian xử lý cho file dài.",
        ],
      },
      {
        speaker: "Thành",
        keyPoints: [
          "Cần test thêm cho trường hợp có tiếng ồn nền.",
          "Bổ sung chỉ số đánh giá speaker verification theo từng ngữ cảnh họp.",
        ],
      },
      {
        speaker: "Hà",
        keyPoints: [
          "Chốt lịch gửi biên bản cho thành viên.",
          "Theo dõi tiến độ action item trong tuần.",
        ],
      },
    ],
    emailLogs: [
      {
        id: "email-1",
        recipient: "team-core@company.vn",
        sentAt: "2026-04-16T11:30:00.000Z",
        status: "sent",
      },
    ],
  },
  {
    id: "m-2026-002",
    title: "Rà soát dữ liệu speaker verification",
    fileName: "speaker-review.mp3",
    inputSource: "recording",
    createdAt: "2026-04-15T07:40:00.000Z",
    durationSecond: 2480,
    speakerCount: 2,
    processingStatus: "processing",
    emailStatus: "not_sent",
    rawTranscript:
      "Đang xử lý transcript tự động, nội dung bóc băng sẽ hiển thị theo từng cụm người nói ngay sau khi hoàn tất.",
    segments: [
      {
        id: "seg-4",
        speaker: "Long",
        startSecond: 14,
        endSecond: 44,
        text: "Bắt đầu rà soát lại mẫu giọng đại diện cho nhóm phòng họp.",
      },
    ],
    minutes: "Biên bản đang được tạo tự động từ transcript.",
    speakerSummaries: [
      {
        speaker: "Long",
        keyPoints: ["Chuẩn hóa bộ mẫu giọng đầu vào."],
      },
    ],
    emailLogs: [],
  },
  {
    id: "m-2026-003",
    title: "Họp nhanh vận hành tuần",
    fileName: "ops-weekly.wav",
    inputSource: "upload",
    createdAt: "2026-04-14T02:20:00.000Z",
    durationSecond: 1860,
    speakerCount: 4,
    processingStatus: "error",
    emailStatus: "failed",
    rawTranscript:
      "Phiên xử lý bị gián đoạn do lỗi tệp nguồn, cần tải lại file hoặc ghi âm mới.",
    segments: [],
    minutes: "Không thể tạo biên bản vì transcript chưa hoàn chỉnh.",
    speakerSummaries: [],
    emailLogs: [
      {
        id: "email-2",
        recipient: "ops@company.vn",
        sentAt: "2026-04-14T03:00:00.000Z",
        status: "failed",
      },
    ],
  },
]

export function getMeetingById(id: string): MeetingRecord | undefined {
  return meetingRecords.find((meeting) => meeting.id === id)
}
