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

