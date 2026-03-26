export type MeetingParticipantRole = 'Chủ trì' | 'Thư ký' | 'Tham dự' | 'Khách' | 'Khác';

export interface MeetingParticipant {
  id: string;
  name: string;
  title?: string;
  role?: MeetingParticipantRole;
}

export interface MeetingInfo {
  companyName: string;
  companyAddress: string;
  meetingDatetime: string;
  meetingLocation: string;
  participants: MeetingParticipant[];
  recipientEmails: string[];
}

export interface ReporterInfo {
  interviewTitle: string;  // Tiêu đề phỏng vấn
  guestName: string;       // Tên khách mời
  reporter: string;        // Phóng viên
  datetime: string;
  location: string;
}

export interface OfficerInfo {
  title: string;                        // Tiêu đề
  presiding: string;                    // Chủ Toạ
  courtSecretary: string;               // Thư ký toà
  participants: MeetingParticipant[];
  datetime: string;
  location: string;
}

export type SpecialistInfo = MeetingInfo;
