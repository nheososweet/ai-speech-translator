import { z } from "zod";
import { meetingRecords } from "@/lib/mock/meetings";
import type { MeetingRecord } from "@/lib/types/meeting";
import type { PipelineStep } from "./workspace-types";

export const sourceMeeting = meetingRecords[0];

export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

export const ACCEPTED_AUDIO_MIME_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
]);

export const ACCEPTED_AUDIO_EXTENSIONS = new Set([
  "wav",
  "mp3",
  "mpeg",
  "webm",
  "ogg",
]);

export const FAKE_RAW_TRANSCRIPT = `Đây là một đoạn bóc băng (transcript) giả lập một cuộc họp Daily/Sync-up team phát triển sản phẩm. Tôi đã cố tình thiết kế đoạn hội thoại này có đầy đủ các yếu tố: báo cáo tiến độ, thảo luận kỹ thuật, quyết định, và các Action Items được chốt vào cuối buổi để bạn test khả năng trích xuất của LLM.

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

export const DIARIZATION_LINE_PATTERN =
  /^Người\s*(\d+)\s*\(([\d.]+)s\s*-\s*([\d.]+)s\):\s*(.+)$/i;
export const SPEAKER_TAG_PATTERN = /Người\s*\d+/i;

export const initialMeeting: MeetingRecord = {
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

export const PIPELINE_STEP_BLUEPRINT: Array<
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

export const PIPELINE_STEP_WEIGHT: Record<PipelineStep["id"], number> = {
  raw_transcript: 35,
  diarization: 20,
  speaker_summary: 25,
  minutes: 20,
};

export const recipientEmailsSchema = z
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

export const minutesDraftSchema = z
  .string()
  .trim()
  .min(1, "Biên bản không được để trống.");
