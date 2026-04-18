# Hệ thống phiên dịch âm thanh thông minh

Đây là nền tảng web giúp chuyển đổi nội dung cuộc họp từ âm thanh sang văn bản, tách người nói, tạo biên bản, quản lý lịch sử và hỗ trợ gửi biên bản qua email.

README này được viết theo hướng dễ hiểu cho cả người không chuyên kỹ thuật.

## 1) Dự án này là gì?

Hệ thống này phục vụ nhu cầu ghi nhận nội dung họp một cách nhanh và chính xác.

Bạn có thể hình dung quy trình như sau:

1. Tải file âm thanh cuộc họp lên hoặc ghi âm trực tiếp.
2. Hệ thống bóc băng ra transcript.
3. Hệ thống tách ai nói đoạn nào.
4. Hệ thống tóm tắt ý chính theo từng người.
5. Hệ thống tạo biên bản cuộc họp.
6. Bạn lưu biên bản, xem lại lịch sử, và gửi email cho người nhận.

Nói ngắn gọn: đây là công cụ "từ âm thanh -> transcript -> biên bản -> chia sẻ".

## 2) Ai nên dùng?

1. Trưởng nhóm, quản lý dự án cần chốt việc sau họp nhanh.
2. PM/BA cần lưu lại quyết định và đầu việc.
3. Team vận hành cần theo dõi lịch sử các phiên họp.
4. Người không rành kỹ thuật nhưng muốn có biên bản tự động.

## 3) Giá trị thực tế

1. Giảm thời gian ghi chép thủ công sau mỗi buổi họp.
2. Hạn chế sót ý, sót đầu việc, sót người phụ trách.
3. Dễ rà lại lịch sử cuộc họp cũ.
4. Dễ chia sẻ biên bản qua email cho nhiều người.

## 4) Tính năng chính

### 4.1 Màn hình Phiên dịch (/workspace)

1. Hỗ trợ 2 nguồn vào:
   - Tải tệp audio (WAV, MP3, WebM, OGG).
   - Thu âm trực tiếp từ micro.
2. Kiểm tra định dạng và dung lượng file (giới hạn 100 MB).
3. Hiển thị pipeline xử lý rõ ràng theo từng bước:
   - Chuyển giọng nói thành văn bản.
   - Phân chia theo từng người nói.
   - Tóm tắt theo người nói.
   - Tạo biên bản cuộc họp.
4. Hiển thị transcript gốc và bản làm sạch.
5. Xem toàn màn hình phần transcript để rà nhanh.
6. Copy transcript với thông báo toast.
7. Chỉnh sửa biên bản trong popup toàn màn hình.
8. Lưu biên bản về hệ thống nguồn.
9. Gửi email biên bản cho nhiều người nhận.
10. Hiển thị tiến độ, trạng thái và thông báo thao tác rõ ràng.

### 4.2 Màn hình Lịch sử cuộc họp (/history)

1. Lấy danh sách bản ghi từ API nguồn.
2. Hiển thị số liệu tổng quan:
   - Tổng bản ghi.
   - Bản ghi đã có biên bản.
   - Bản ghi chưa có biên bản.
3. Tải xuống:
   - File âm thanh.
   - File transcript.
   - File biên bản.
4. Nghe thử audio ngay trên danh sách.
5. Xem nhanh transcript bằng popup full-screen.
6. Xem nhanh biên bản bằng popup full-screen.
7. Copy transcript/biên bản trực tiếp trong popup với toast.
8. Gửi email biên bản trực tiếp từ từng bản ghi.

### 4.3 Màn hình Chi tiết cuộc họp (/history/[id])

1. Xem thông tin chi tiết 1 phiên họp.
2. Mô phỏng playback timeline và segment người nói.
3. Xem raw transcript, biên bản và lịch sử gửi email.

Lưu ý quan trọng:

1. Màn hình chi tiết hiện đọc từ dữ liệu mock nội bộ.
2. Màn hình danh sách lịch sử đọc từ API thật.

## 5) Luồng người dùng (phiên bản dễ hiểu)

### 5.1 Tạo biên bản từ audio

1. Vào mục Phiên dịch.
2. Chọn một trong hai cách:
   - Tải tệp âm thanh.
   - Thu âm trực tiếp.
3. Bấm xử lý.
4. Chờ pipeline hoàn tất.
5. Mở popup biên bản để kiểm tra nội dung.
6. Chỉnh sửa nếu cần.
7. Bấm Lưu biên bản.

### 5.2 Gửi biên bản qua email

1. Sau khi lưu biên bản thành công, mở popup gửi email.
2. Nhập danh sách email người nhận.
3. Bấm xác nhận gửi.
4. Theo dõi thông báo thành công/thất bại qua toast và trạng thái.

### 5.3 Rà soát lại bản ghi cũ

1. Vào mục Lịch sử cuộc họp.
2. Chọn bản ghi cần xem.
3. Mở transcript hoặc biên bản dạng popup full-screen.
4. Copy nhanh nội dung cần chia sẻ.

## 6) Cấu trúc màn hình và điều hướng

1. / sẽ tự chuyển sang /workspace.
2. /dashboard cũng chuyển sang /workspace.
3. Sidebar chính có 2 route:
   - Phiên dịch
   - Lịch sử cuộc họp
4. Header breadcrumb đang hiển thị 1 cấp (ngắn gọn, dễ đọc).

## 7) Công nghệ sử dụng

1. Next.js 16 (App Router).
2. React 19 + TypeScript.
3. Tailwind CSS 4 + Radix UI + shadcn UI.
4. TanStack Query cho dữ liệu phía client.
5. Axios để gọi API.
6. Zod để kiểm tra dữ liệu đầu vào (ví dụ danh sách email).
7. React Markdown + remark-gfm để hiển thị biên bản markdown.

## 8) Kiến trúc tích hợp API

Hệ thống hiện dùng mô hình kết hợp:

1. Frontend gọi trực tiếp Pipeline API (records, diarize/transcribe, chat, update-report) qua service Axios phía client.
2. Chỉ giữ API nội bộ Next.js cho nghiệp vụ cần che giấu API key (gửi email qua agent).

Ý nghĩa:

1. Luồng xử lý chính đơn giản hơn, ít lớp proxy trung gian.
2. API key nhạy cảm vẫn được giữ ở server route.
3. Dễ tách biệt service layer và hook layer theo nghiệp vụ.

### 8.1 Luồng Pipeline gọi trực tiếp

1. GET /records
   - Lấy danh sách bản ghi từ API nguồn.
2. POST /diarize-and-transcribe
   - Upload file audio để diarize + transcribe.
3. POST /chat
   - Sinh đồng thời tóm tắt theo người nói + biên bản từ transcript.
4. POST /update-report
   - Lưu biên bản và lấy report URL.

### 8.2 API nội bộ còn sử dụng

1. POST /api/agent/send-email
   - Gọi agent thực hiện gửi email biên bản.

## 9) Biến môi trường cần cấu hình

Tạo file .env.local ở thư mục gốc dự án.

Ví dụ tham khảo:

```env
# Domain chính dùng cho metadata SEO
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# API nguồn bản ghi/audio/transcript (frontend gọi trực tiếp)
NEXT_PUBLIC_PIPELINE_API_BASE_URL=http://220.130.209.122:41432

# API agent (nếu không khai báo sẽ dùng default trong lib/agent-config.ts)
AGENT_EXTERNAL_API_URL=https://agent.svisor.vn/api/external/chat

# Hoặc alias cũ (fallback)
AGENT_API_URL=

# API key cho nghiệp vụ agent gửi email
AGENT_MOM_EMAIL_API_KEY=

# Session id public để phân luồng hội thoại agent
NEXT_PUBLIC_AGENT_MOM_EMAIL_SESSION_ID=my-send-email-agent-session-001
```

Giải thích nhanh cho người không kỹ thuật:

1. API key giống như "chìa khóa" để hệ thống được phép gọi dịch vụ AI bên ngoài.
2. Session ID giúp tách ngữ cảnh từng luồng nghiệp vụ (tạo biên bản, gửi mail...).
3. Nếu thiếu API key, các chức năng AI sẽ báo lỗi ở màn hình.

## 10) Hướng dẫn chạy dự án (dành cho kỹ thuật)

### 10.1 Yêu cầu

1. Node.js 20 trở lên.
2. pnpm (khuyến nghị vì dự án có pnpm-lock.yaml).

### 10.2 Cài đặt

```bash
pnpm install
```

### 10.3 Chạy môi trường dev

```bash
pnpm dev
```

Mở trình duyệt tại:

1. http://localhost:3000

### 10.4 Kiểm tra lint

```bash
pnpm lint
```

## 11) Hướng dẫn sử dụng cho người không chuyên

### 11.1 Nếu bạn chỉ là người dùng vận hành

1. Mở hệ thống bằng link nội bộ mà đội kỹ thuật cung cấp.
2. Vào mục Phiên dịch.
3. Tải file ghi âm cuộc họp lên.
4. Chờ hệ thống xử lý xong.
5. Mở phần biên bản để đọc và chỉnh lại câu chữ nếu cần.
6. Bấm lưu biên bản.
7. Bấm gửi email cho người nhận.
8. Vào mục Lịch sử cuộc họp để xem lại bản ghi cũ.

### 11.2 Mẹo thao tác nhanh

1. Khi cần rà soát nhanh transcript dài, dùng popup full-screen.
2. Dùng nút Copy trong popup để dán sang email/chat nội bộ.
3. Nếu gửi email lỗi, kiểm tra định dạng email người nhận và thử lại.

## 12) Trạng thái hiện tại của sản phẩm

1. Core workflow upload/recording -> transcript -> minutes -> send email đã có.
2. Lịch sử bản ghi lấy từ API nguồn thật.
3. Chi tiết /history/[id] hiện dùng dữ liệu mock nội bộ.
4. Giao diện tối ưu tốt cho desktop và đã cải thiện cho mobile.
5. Thông báo thao tác ưu tiên dùng toast thay vì alert blocking.

## 13) Giới hạn hiện tại

1. Chất lượng kết quả phụ thuộc trực tiếp vào chất lượng audio đầu vào.
2. Nếu dịch vụ AI ngoài bị chậm hoặc lỗi, pipeline sẽ báo lỗi tương ứng.
3. Một số route chi tiết vẫn đang ở chế độ mô phỏng dữ liệu.

## 14) FAQ (câu hỏi thường gặp)

1. Vì sao tôi bấm gửi email nhưng thất bại?
   - Thường do thiếu API key, session ID sai, hoặc danh sách email không hợp lệ.
2. Vì sao transcript không tải được?
   - Có thể URL transcript nguồn bị lỗi hoặc không truy cập được.
3. Vì sao không thấy biên bản?
   - Có thể pipeline chưa hoàn tất hoặc API minutes trả dữ liệu rỗng.
4. Tôi có thể dùng hệ thống này cho file họp dài không?
   - Có, nhưng thời gian xử lý sẽ lâu hơn và phụ thuộc hạ tầng API nguồn.

## 15) Bảo mật và vận hành

1. Không commit file .env.local lên git.
2. Không để lộ API key ở client-side code.
3. Giới hạn quyền truy cập môi trường production.
4. Theo dõi log lỗi API định kỳ để phát hiện sự cố sớm.

## 16) Gợi ý roadmap tiếp theo

1. Đồng bộ route /history/[id] sang dữ liệu API thật.
2. Bổ sung phân quyền người dùng theo vai trò.
3. Thêm dashboard thống kê số phiên, tỉ lệ lỗi, thời gian xử lý trung bình.
4. Thêm xuất biên bản theo mẫu doanh nghiệp (PDF/DOCX).
5. Bổ sung chức năng tìm kiếm toàn văn trong transcript.

## 17) Tóm tắt một câu

Đây là hệ thống giúp biến một buổi họp bằng âm thanh thành biên bản có thể hành động ngay, dễ theo dõi, dễ chia sẻ, và phù hợp cả cho người không rành kỹ thuật.
