import type { MeetingInfo } from '../../minutes/types';
import { buildMinutesCustomPrompt } from '../../minutes/prompt';

export function buildSpecialistPrompt(args: {
  info: MeetingInfo;
  templatePrompt: string;
}): string {
  return buildMinutesCustomPrompt({ meetingInfo: args.info, templatePrompt: args.templatePrompt });
}
