export interface SplitSegment {
  index: number;
  start: number;
  end: number;
  duration: number;
  blob?: Blob;
  name: string;
}

export type SplitStatus = 'idle' | 'loading-ffmpeg' | 'ready' | 'splitting' | 'done' | 'error';
