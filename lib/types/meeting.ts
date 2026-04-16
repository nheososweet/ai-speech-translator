export type AudioInputSource = "upload" | "recording"

export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "error"

export type EmailStatus = "not_sent" | "sent" | "failed"

export interface TranscriptSegment {
  id: string
  speaker: string
  startSecond: number
  endSecond: number
  text: string
}

export interface SpeakerSummary {
  speaker: string
  keyPoints: string[]
}

export interface MeetingEmailLog {
  id: string
  recipient: string
  sentAt: string
  status: EmailStatus
}

export interface MeetingRecord {
  id: string
  title: string
  fileName: string
  inputSource: AudioInputSource
  createdAt: string
  durationSecond: number
  speakerCount: number
  processingStatus: ProcessingStatus
  emailStatus: EmailStatus
  rawTranscript: string
  refinedTranscript?: string
  segments: TranscriptSegment[]
  minutes: string
  speakerSummaries: SpeakerSummary[]
  emailLogs: MeetingEmailLog[]
  audioUrl?: string
  apiRecordId?: number
  reportUrl?: string
}
