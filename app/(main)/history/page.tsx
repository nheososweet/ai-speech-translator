"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  AudioLinesIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  SearchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { meetingRecords } from "@/lib/mock/meetings";
import type { MeetingRecord, ProcessingStatus } from "@/lib/types/meeting";

const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function resolveStatus(status: ProcessingStatus): {
  label: string;
  Icon: LucideIcon;
  spin?: boolean;
  className: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Hoàn tất",
        Icon: CircleCheckIcon,
        className: "text-emerald-600 dark:text-emerald-400",
      };
    case "processing":
      return {
        label: "Đang xử lý",
        Icon: LoaderCircleIcon,
        spin: true,
        className: "text-amber-600 dark:text-amber-400",
      };
    case "error":
      return {
        label: "Lỗi",
        Icon: CircleAlertIcon,
        className: "text-rose-600 dark:text-rose-400",
      };
    case "uploading":
      return {
        label: "Đang tải lên",
        Icon: LoaderCircleIcon,
        spin: true,
        className: "text-sky-600 dark:text-sky-400",
      };
    default:
      return {
        label: "Chờ xử lý",
        Icon: AudioLinesIcon,
        className: "text-muted-foreground",
      };
  }
}

function resolveEmailLabel(record: MeetingRecord): {
  label: string;
  className: string;
} {
  switch (record.emailStatus) {
    case "sent":
      return {
        label: "Đã gửi email",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      };
    case "failed":
      return {
        label: "Gửi email lỗi",
        className:
          "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      };
    default:
      return {
        label: "Chưa gửi email",
        className: "bg-muted text-muted-foreground",
      };
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${String(remainSeconds).padStart(2, "0")}s`;
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProcessingStatus>(
    "all",
  );
  const [sourceFilter, setSourceFilter] = useState<
    "all" | MeetingRecord["inputSource"]
  >("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "duration_desc" | "duration_asc"
  >("newest");

  const metrics = useMemo(() => {
    return {
      total: meetingRecords.length,
      completed: meetingRecords.filter(
        (meeting) => meeting.processingStatus === "completed",
      ).length,
      processing: meetingRecords.filter(
        (meeting) =>
          meeting.processingStatus === "processing" ||
          meeting.processingStatus === "uploading",
      ).length,
      error: meetingRecords.filter(
        (meeting) => meeting.processingStatus === "error",
      ).length,
    };
  }, []);

  const filteredMeetings = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const nextRecords = meetingRecords.filter((meeting) => {
      const queryMatched =
        !normalizedQuery ||
        meeting.title.toLowerCase().includes(normalizedQuery) ||
        meeting.fileName.toLowerCase().includes(normalizedQuery) ||
        meeting.id.toLowerCase().includes(normalizedQuery);

      const statusMatched =
        statusFilter === "all" || meeting.processingStatus === statusFilter;

      const sourceMatched =
        sourceFilter === "all" || meeting.inputSource === sourceFilter;

      return queryMatched && statusMatched && sourceMatched;
    });

    return nextRecords.sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      if (sortBy === "duration_desc") {
        return b.durationSecond - a.durationSecond;
      }

      return a.durationSecond - b.durationSecond;
    });
  }, [searchQuery, sortBy, sourceFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Lịch sử cuộc họp
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi toàn bộ phiên xử lý audio và truy cập nhanh màn hình chi
              tiết.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tiêu đề hoặc tên file..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Trạng thái xử lý
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | ProcessingStatus)
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              <option value="all">Tất cả</option>
              <option value="completed">Hoàn tất</option>
              <option value="processing">Đang xử lý</option>
              <option value="uploading">Đang tải lên</option>
              <option value="error">Lỗi</option>
              <option value="idle">Chờ thao tác</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Nguồn vào
            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(
                  event.target.value as "all" | MeetingRecord["inputSource"],
                )
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              <option value="all">Tất cả</option>
              <option value="upload">Tải tệp</option>
              <option value="recording">Thu âm</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Sắp xếp
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as
                    | "newest"
                    | "oldest"
                    | "duration_desc"
                    | "duration_asc",
                )
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="duration_desc">Thời lượng dài nhất</option>
              <option value="duration_asc">Thời lượng ngắn nhất</option>
            </select>
          </label>

          <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <p>
              Hiển thị <span className="font-semibold text-foreground">{filteredMeetings.length}</span> / {metrics.total} phiên
            </p>
            <p className="text-xs">Lọc động theo query, trạng thái, nguồn và thời lượng.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
            <p className="text-muted-foreground">Hoàn tất</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {metrics.completed}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
            <p className="text-muted-foreground">Đang chạy</p>
            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {metrics.processing}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
            <p className="text-muted-foreground">Lỗi xử lý</p>
            <p className="text-lg font-semibold text-rose-600 dark:text-rose-400">
              {metrics.error}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
            <p className="text-muted-foreground">Tổng phiên</p>
            <p className="text-lg font-semibold text-foreground">{metrics.total}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {filteredMeetings.map((meeting) => {
          const status = resolveStatus(meeting.processingStatus);
          const email = resolveEmailLabel(meeting);

          return (
            <article
              key={meeting.id}
              className="rounded-lg border border-border/80 bg-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {meeting.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {meeting.fileName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm ${status.className}`}
                  >
                    <status.Icon
                      className={`size-4 ${status.spin ? "animate-spin" : ""}`}
                    />
                    {status.label}
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${email.className}`}
                  >
                    {email.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="font-medium text-foreground">
                    Thời gian:
                  </span>{" "}
                  {formatter.format(new Date(meeting.createdAt))}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Nguồn vào:
                  </span>{" "}
                  {meeting.inputSource === "upload" ? "Tải tệp" : "Thu âm"}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Số speaker:
                  </span>{" "}
                  {meeting.speakerCount}
                </p>
                <p>
                  <span className="font-medium text-foreground">Mã phiên:</span>{" "}
                  {meeting.id}
                </p>
                <p>
                  <span className="font-medium text-foreground">Thời lượng:</span>{" "}
                  {formatDuration(meeting.durationSecond)}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  href={`/history/${meeting.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Xem chi tiết
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            </article>
          );
        })}

        {!filteredMeetings.length ? (
          <article className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Không có cuộc họp phù hợp với điều kiện lọc hiện tại.
          </article>
        ) : null}
      </section>
    </div>
  );
}
