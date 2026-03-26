import type { MeetingInfo } from '../../../features/minutes/types';
import { buildMinutesCustomPrompt } from '../../../features/minutes/prompt';

export function buildSpecialistPrompt(args: {
  info: MeetingInfo;
  templatePrompt: string;
}): string {
  return buildMinutesCustomPrompt({ meetingInfo: args.info, templatePrompt: args.templatePrompt });
}
