# Plan triển khai - Hệ thống phiên dịch âm thanh thông minh

## 1. Mình đã hiểu hệ thống như thế nào

Đây là một frontend vận hành theo mô hình một phiên họp trung tâm, không phải flow tạo mới nhiều bước. Người dùng chỉ đi qua 3 màn hình chính:

1. **Workspace**: tải file audio/video hoặc ghi âm trực tiếp, theo dõi transcribe, rồi thực hiện các action tiếp theo như tạo biên bản, tạo tóm tắt, gửi email.
2. **Danh sách lịch sử**: xem tất cả các phiên đã xử lý, lọc/tìm kiếm, và điều hướng sang chi tiết.
3. **Chi tiết lịch sử**: xem lại audio, raw transcript, biên bản, summary theo từng người nói, và lịch sử gửi email.

Điểm cốt lõi là **một record phiên họp trung tâm** phải đi xuyên suốt cả 3 màn hình. Record đó cần giữ được:

- Nguồn đầu vào: file upload hoặc mic recording
- Trạng thái xử lý: idle, uploading, processing, done, error
- Raw transcript
- Speaker segments / diarization
- Biên bản cuộc họp
- Summary theo từng speaker
- Metadata: thời gian tạo, trạng thái email, số người nói, thời lượng, tên file

Nói ngắn gọn: **Workspace sinh dữ liệu, History tra cứu snapshot, Detail đọc sâu và thao tác lại trên cùng dữ liệu**.

## 2. Luồng dữ liệu giữa 3 màn hình

### 2.1 Workspace

Workspace là nơi tạo mới hoặc khởi tạo một phiên xử lý.

- Người dùng chọn upload file hoặc ghi âm.
- Frontend tạo một job/session ở tầng data.
- Trong lúc backend xử lý, UI phản ánh tiến trình theo từng trạng thái.
- Nếu backend trả transcript từng phần, UI cập nhật live transcript và raw text.
- Khi xử lý xong, frontend nhận về một meeting record hoàn chỉnh.
- Từ record này, các action tiếp theo có thể được gọi: tạo biên bản, tóm tắt, gửi email.

### 2.2 History

History chỉ đọc dữ liệu từ kho record đã lưu.

- Hiển thị danh sách phiên họp đã xử lý.
- Mỗi item cần có trạng thái, thời gian, speaker count, và action nhanh.
- Search/filter/sort chỉ là lớp trình bày trên cùng nguồn dữ liệu.
- Click vào item sẽ mở màn hình Detail theo `meetingId`.

### 2.3 Detail

Detail đọc một meeting record cụ thể.

- Load dữ liệu theo `meetingId`.
- Hiển thị audio replay, transcript, biên bản, summary theo speaker.
- Hiển thị lịch sử gửi email và trạng thái các action đã chạy.
- Nếu gửi lại email hoặc tái xử lý, các hành động này vẫn update về cùng record.

### 2.4 Quy tắc state

Mình sẽ tách state thành 3 lớp:

- **Local UI state**: recording, selected file, panel mở/đóng, tab đang xem.
- **Server state**: meeting record, danh sách lịch sử, chi tiết record, progress xử lý.
- **Route state**: điều hướng giữa Workspace, History, Detail.

Cách này giúp tránh trộn logic xử lý file với logic hiển thị lịch sử.

## 3. Đề xuất cấu trúc file theo Next.js App Router

> Mục tiêu: rõ route, rõ feature, dễ mở rộng, không dồn toàn bộ logic vào `app/page.tsx`.

```txt
app/
  layout.tsx
  globals.css
  page.tsx
  (main)/
    layout.tsx
    workspace/
      page.tsx
      loading.tsx
      error.tsx
    history/
      page.tsx
      loading.tsx
      error.tsx
      [id]/
        page.tsx
        loading.tsx
        error.tsx
components/
  layout/
  shared/
  ui/
features/
  workspace/
    components/
    hooks/
    types/
    data/
  history/
    components/
    hooks/
    types/
    data/
  meeting-detail/
    components/
    hooks/
    types/
    data/
lib/
  types/
  helpers/
  mock/
  constants/
plans/
  2026-04-16-plan-he-thong-phien-dich-am-thanh-thong-minh.md
```

### Ghi chú kiến trúc

- `app/(main)` dùng để gom toàn bộ màn hình chính có layout chung.
- `features/*` chứa logic theo domain, tránh để component nghiệp vụ nằm lẫn với UI primitives.
- `components/ui` giữ các component Shadcn UI đã generate.
- `components/shared` chứa component tái sử dụng nhiều lần như audio player, transcript viewer, status badge.
- `lib/types` hoặc `features/*/types` chứa kiểu dữ liệu trung tâm của meeting record.

## 4. Định hướng UI/UX cần bám

### 4.1 Phong cách

- Thực tế, rõ ràng, chỉnh chu.
- Không quá lòe loẹt.
- Không quá tối giản đến mức lạnh lẽo.
- Bo góc vừa phải, không “kẹo hoá” giao diện.
- Dùng màu trung tính làm nền, một màu nhấn chính để dẫn hướng thao tác.
- Light mode là mặc định, dark mode là tùy chọn.

### 4.2 Trải nghiệm

- Workspace phải là màn hình nổi bật nhất, ưu tiên hành động chính.
- History cần dễ quét bằng mắt, ít nhiễu.
- Detail cần chiều sâu thông tin nhưng vẫn tách lớp rõ ràng.
- Responsive phải ổn định ở desktop, tablet, mobile.
- Nút action phải rõ trạng thái: enabled, disabled, loading, success, error.

### 4.3 Nguyên tắc trình bày

- Ưu tiên card, panel, section rõ ràng.
- Không dùng quá nhiều hiệu ứng động.
- Tăng tính “chỉnh chu” bằng spacing hợp lý, typography cân đối, border tinh tế.
- Mọi trạng thái rỗng hoặc lỗi đều phải có xử lý UI riêng.
- Font chính sẽ lấy từ bộ font local đã có trong `public/fonts/`, ưu tiên dùng cho toàn bộ UI để giữ consistency và tránh phụ thuộc font ngoài.

## 5. Implementation Plan chi tiết

### Phase 1 - Nền tảng kiến trúc và data model

**Mục tiêu:** chốt nền móng để các màn hình sau không phải sửa ngược kiến trúc.

#### Task 1.0 - Thiết lập font và design tokens nền tảng

- Khai báo font local từ `public/fonts/Quicksand-*`.
- Chọn 1 font chính cho UI text và 1 font phụ nếu cần cho nhãn/mono.
- Gắn font vào layout gốc để toàn bộ app dùng thống nhất.
- Kiểm tra font hiển thị ổn trên light mode và dark mode.

**Verify:** font render đúng ở layout gốc, không bị fallback sang font mặc định của trình duyệt.

#### Task 1.1 - Định nghĩa data model chung

- Xác định `MeetingRecord`.
- Xác định `SpeakerSegment`.
- Xác định `TranscriptChunk`.
- Xác định `MeetingSummaryItem`.
- Xác định `EmailStatus`.
- Xác định `ProcessingStatus`.
- Xác định các field tối thiểu cho metadata.
- Xác định các field hiển thị trong list view và detail view.
- Tách field bắt buộc với field có thể null/optional.

**Verify:** đọc lại schema, kiểm tra đủ field cho Workspace, History, Detail.

#### Task 1.2 - Chốt route structure

- Tạo route cho Workspace.
- Tạo route cho History.
- Tạo route dynamic cho Detail theo `meetingId`.
- Tạo loading state cho từng route.
- Tạo error state cho từng route.
- Định nghĩa breadcrumb hoặc title page cho từng route.
- Chốt URL pattern để sau này không phải đổi route giữa chừng.

**Verify:** điều hướng route chạy đúng, reload đúng màn hình, back/forward hoạt động.

#### Task 1.3 - Dựng layout chung

- Tạo layout tổng của app.
- Tạo navigation tối thiểu giữa Workspace và History.
- Thiết lập light mode mặc định.
- Thiết lập dark mode toggle.
- Tạo khung header/footer nếu cần.
- Tận dụng dashboard có sẵn nếu khung đó phù hợp với layout chung.
- Xác định vùng content chính, vùng action phụ, và vùng metadata.

**Verify:** layout không vỡ ở desktop và mobile, dark mode không làm mất tương phản.

#### Task 1.4 - Tạo empty/loading/error states dùng chung

- Loading skeleton cho list và detail.
- Empty state cho lịch sử rỗng.
- Empty state cho transcript rỗng.
- Error state cho job fail và data load fail.
- Quy định khi nào dùng skeleton, khi nào dùng empty state, khi nào dùng error state.
- Tạo copy tiếng Việt ngắn gọn cho từng trạng thái.

**Verify:** giả lập record rỗng và lỗi để kiểm tra UI.

---

### Phase 2 - Workspace: upload, recording, transcript, action

**Mục tiêu:** hoàn thiện màn hình vận hành chính của sản phẩm.

#### Task 2.1 - Khối nhập liệu đầu vào

- Upload WAV/MP3.
- Hỗ trợ nhận diện file hợp lệ.
- Thu âm trực tiếp từ mic.
- Hiển thị trạng thái recording rõ ràng.
- Cho phép dừng, hủy, bắt đầu lại.
- Hiển thị hướng dẫn ngắn cho quyền mic và định dạng file hỗ trợ.
- Tách trạng thái upload file và trạng thái record mic thành hai luồng rõ ràng.

**Verify:** test upload file hợp lệ, file không hợp lệ, start/stop recording.

#### Task 2.2 - State machine cho workflow

- Xác định các trạng thái: idle, recording, uploading, processing, done, error.
- Khi chuyển trạng thái, UI phải đổi tương ứng.
- Khóa action không hợp lệ theo trạng thái.
- Tách state xử lý file khỏi state trình bày.
- Quy định state nào được phép retry và state nào phải reset hoàn toàn.
- Ghi rõ transition hợp lệ giữa các state để tránh logic rối.

**Verify:** kiểm tra mọi transition chính, đặc biệt upload xong -> processing -> done.

#### Task 2.3 - Hiển thị transcript live

- Hiển thị raw transcript theo chunk.
- Cho phép xem transcript dạng liên tục.
- Cho phép hiển thị theo speaker nếu backend có dữ liệu.
- Có state cho partial transcript.
- Cho phép user đọc raw text trước khi biên bản hoàn tất.
- Tách section transcript và speaker summary nếu dữ liệu đã sẵn.

**Verify:** transcript update được khi có chunk mới, không mất nội dung cũ.

#### Task 2.4 - Action sau xử lý

- Nút tạo biên bản.
- Nút tạo summary theo speaker.
- Nút gửi email biên bản.
- Nút export nếu cần về sau.
- Quy định điều kiện enable/disable cho từng action.
- Hiển thị progress/loading riêng cho từng action, không khóa toàn bộ màn hình nếu không cần.

**Verify:** action hiển thị trạng thái loading/success/error rõ ràng.

#### Task 2.5 - UX polish cho Workspace

- Tạo layout 2 cột hoặc 3 khối tùy breakpoint.
- Khối chính ưu tiên transcript và action.
- Panel phụ dành cho metadata và trạng thái xử lý.
- Điều chỉnh spacing và hierarchy cho dễ đọc.
- Đảm bảo CTA chính luôn dễ thấy ở desktop nhưng không chiếm quá nhiều diện tích ở mobile.
- Kiểm tra collapse/stack tự nhiên trên màn nhỏ.

**Verify:** test desktop, tablet, mobile.

---

### Phase 3 - History: danh sách lịch sử

**Mục tiêu:** giúp người dùng tra cứu nhanh các phiên đã xử lý.

#### Task 3.1 - Dựng list record

- Hiển thị tên phiên/cuộc họp.
- Hiển thị thời gian tạo.
- Hiển thị trạng thái xử lý.
- Hiển thị số speaker.
- Hiển thị trạng thái email.
- Hiển thị source input và thời lượng nếu có.
- Chuẩn hóa icon, badge, và thứ tự thông tin để scan nhanh.

**Verify:** list hiển thị đúng dữ liệu mẫu, card/item không tràn layout.

#### Task 3.2 - Tìm kiếm và lọc

- Search theo tên file, title, speaker, hoặc content metadata.
- Filter theo trạng thái xử lý.
- Filter theo trạng thái email.
- Sort theo thời gian mới nhất / cũ nhất.
- Quy định search là exact hay fuzzy.
- Quy định filter chip có thể combine hay chỉ chọn một loại.

**Verify:** lọc kết quả đúng, sort không sai thứ tự.

#### Task 3.3 - Điều hướng sang Detail

- Click item mở detail theo `meetingId`.
- Có action xem nhanh.
- Có trạng thái hover/focus rõ ràng.
- Hỗ trợ mở detail bằng keyboard nếu focus vào item.

**Verify:** route param đúng, refresh vẫn vào đúng record.

#### Task 3.4 - Empty state và pagination

- Nếu chưa có lịch sử thì hiển thị hướng dẫn.
- Nếu danh sách nhiều thì có pagination hoặc infinite scroll tùy quyết định.
- Xác định sẵn phương án load more hay pagination ngay từ đầu để không đổi UX giữa chừng.

**Verify:** test list rỗng và list dài.

---

### Phase 4 - Detail lịch sử

**Mục tiêu:** xem lại toàn bộ dữ liệu của một phiên họp đã xử lý.

#### Task 4.1 - Audio replay

- Hiển thị player để nghe lại file.
- Có thông tin duration và nguồn file.
- Nếu cần, cho phép tua cơ bản.
- Hiển thị waveform hoặc progress bar đơn giản nếu backend có hỗ trợ.

**Verify:** audio load đúng, play/pause hoạt động.

#### Task 4.2 - Raw transcript

- Hiển thị transcript đầy đủ.
- Tách đoạn theo speaker nếu dữ liệu cho phép.
- Cho phép cuộn và đọc nhanh.
- Nếu transcript dài, cân nhắc sticky header nhỏ để không mất ngữ cảnh.

**Verify:** transcript không bị cắt, không lệch thứ tự chunk.

#### Task 4.3 - Biên bản cuộc họp

- Hiển thị bản biên bản đã sinh.
- Tách heading/section rõ ràng.
- Có trạng thái nếu biên bản chưa sẵn sàng.
- Hỗ trợ copy nhanh hoặc export nếu product scope cho phép.

**Verify:** layout đọc tốt trên desktop và mobile.

#### Task 4.4 - Summary theo từng speaker

- Mỗi speaker có khối summary riêng.
- Hiển thị tên speaker và ý chính.
- Nếu speaker chưa được nhận diện rõ, có state fallback.
- Nếu một speaker có quá nhiều ý, cho phép collapse/expand nhẹ.

**Verify:** kiểm tra list speaker dài, tên dài, summary nhiều dòng.

#### Task 4.5 - Email log và resend

- Hiển thị lịch sử email đã gửi.
- Hiển thị người nhận, thời điểm, trạng thái.
- Cho phép resend email.
- Nếu gửi lỗi thì phải có message rõ và nút retry.

**Verify:** resend cập nhật lại trạng thái và phản hồi lỗi/success rõ ràng.

---

### Phase 5 - Responsive, accessibility, và polish

**Mục tiêu:** nâng chất lượng giao diện lên mức dùng được thực tế.

#### Task 5.1 - Responsive tuning

- Kiểm tra mobile first.
- Tối ưu stack layout cho màn nhỏ.
- Chuyển từ grid sang stacked sections khi cần.
- Đảm bảo table/list không vỡ trên mobile.
- Chốt breakpoint chính trước khi làm chi tiết để tránh chỉnh lại nhiều lần.

**Verify:** test ở breakpoint mobile, tablet, desktop.

#### Task 5.2 - Typography và màu sắc

- Chọn font đọc tốt, không quá công nghiệp.
- Dùng neutral palette làm nền.
- Dùng accent color tiết chế để nhấn action quan trọng.
- Dark mode phải cân bằng, không quá nặng.
- Ưu tiên dùng font local trong `public/fonts/` thay vì kéo font ngoài.

**Verify:** đọc được tốt cả light và dark mode, không chói, không xỉn.

#### Task 5.3 - Accessibility

- Focus state rõ ràng.
- Button/label/aria đúng chuẩn.
- Audio controls có thể thao tác bằng keyboard ở mức cơ bản.
- Dialog/tab/list có semantics đúng.
- Kiểm tra contrast cho text nhỏ và badge trạng thái.

**Verify:** thử tab navigation và kiểm tra focus ring.

#### Task 5.4 - Error/edge case hardening

- File invalid.
- Recording bị từ chối quyền mic.
- Transcript rỗng.
- Tạo biên bản thất bại.
- Gửi email thất bại.
- Record thiếu speaker info.
- Xác định trước message hiển thị cho từng lỗi để không viết lại nhiều lần.

**Verify:** mô phỏng từng lỗi và kiểm tra UI phản hồi hợp lý.

---

### Phase 6 - Chuẩn hóa kiến trúc để mở rộng

**Mục tiêu:** giữ codebase sạch và sẵn sàng nối backend thật.

#### Task 6.1 - Tách shared components

- Audio player.
- Transcript viewer.
- Status badge.
- Empty state.
- Section header.
- Button group cho action chính nếu lặp lại nhiều nơi.
- Khung card/section dùng chung cho dashboard và detail.

**Verify:** component tái sử dụng được ít nhất 2 màn hình.

#### Task 6.2 - Tách data adapter

- Adapter cho danh sách lịch sử.
- Adapter cho detail.
- Adapter cho workspace action.
- Mock data tách riêng nếu backend chưa sẵn.
- Chuẩn hóa mapper giữa response API và model UI.
- Tách dữ liệu demo khỏi dữ liệu thật để test không lẫn.

**Verify:** UI không phụ thuộc trực tiếp vào shape API thô.

#### Task 6.3 - Dọn naming và import

- Đặt tên file rõ theo domain.
- Không để component nghiệp vụ nằm lẫn vào UI primitive.
- Giữ structure dễ đọc cho người vào sau.
- Rà lại import path để giữ đồng nhất alias và tránh relative path dài.

**Verify:** rà import và cấu trúc folder.

## 6. Checklist xác nhận trước khi code

- [ ] Data model chung đã đủ cho 3 màn hình.
- [ ] Route structure đã rõ.
- [ ] Layout chung đã chốt.
- [ ] Màu sắc và phong cách UI đã có định hướng.
- [ ] Workspace là màn hình ưu tiên.
- [ ] History và Detail dùng cùng nguồn dữ liệu.
- [ ] Verify cho từng phase đã được xác định.
- [ ] Font local trong `public/fonts/` đã được đưa vào plan triển khai.
- [ ] Dashboard có sẵn đã được cân nhắc tái sử dụng trước khi tạo mới.

## 7. Cách mình sẽ bám khi bước vào coding

- Không làm multi-step flow.
- Không nhảy vào chi tiết giao diện trước khi chốt data model.
- Ưu tiên Workspace trước vì đây là nguồn sinh record.
- Giữ UI thực tế, rõ ràng, chỉnh chu, không lòe loẹt.
- Dùng Shadcn UI và Lucide icons làm nền.
- Dùng font local trong `public/fonts/` cho typography chính của app.
- Light mode mặc định, dark mode là tùy chọn.
- Tận dụng dashboard có sẵn trong repo nếu phù hợp với kiến trúc và luồng sản phẩm.
- Khi thiếu component của shadcn/ui, sẽ cài đúng cú pháp chính thức bằng `npx shadcn@latest add <component>`.

---

Nếu bạn muốn, ở bước tiếp theo mình có thể chuyển plan này thành **task list ngắn gọn theo thứ tự code thực thi** để bạn theo dõi tiến độ dễ hơn.
