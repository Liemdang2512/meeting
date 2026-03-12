import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export type ProgressInfo = { current: number; total: number; ratio: number };

async function ensureLoaded(
  onProgress?: (info: ProgressInfo) => void
): Promise<void> {
  if (isLoaded && ffmpeg) return;

  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress({ current: 0, total: 1, ratio: progress });
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  isLoaded = true;
}

export async function getDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video');
    const url = URL.createObjectURL(file);
    el.src = url;
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot determine duration'));
    };
  });
}

export async function splitIntoSegments(params: {
  file: File;
  segments: { start: number; end: number }[];
  onProgress?: (info: ProgressInfo) => void;
  onLoadingFFmpeg?: () => void;
}): Promise<Blob[]> {
  const { file, segments, onProgress, onLoadingFFmpeg } = params;

  if (!isLoaded) {
    onLoadingFFmpeg?.();
  }

  await ensureLoaded();

  if (!ffmpeg) throw new Error('FFmpeg not initialized');

  const ext = file.name.split('.').pop() || 'mp4';
  const inputName = `input.${ext}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const blobs: Blob[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const duration = seg.end - seg.start;
    const outputName = `output_${i}.${ext}`;

    await ffmpeg.exec([
      '-ss', String(seg.start),
      '-t', String(duration),
      '-i', inputName,
      '-c', 'copy',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    blobs.push(new Blob([data], { type: file.type || `audio/${ext}` }));

    await ffmpeg.deleteFile(outputName);

    onProgress?.({ current: i + 1, total: segments.length, ratio: (i + 1) / segments.length });
  }

  await ffmpeg.deleteFile(inputName);

  return blobs;
}

export { ensureLoaded };
