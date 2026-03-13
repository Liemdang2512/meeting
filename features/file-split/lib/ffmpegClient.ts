import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export type ProgressInfo = { current: number; total: number; ratio: number };

async function doLoad(): Promise<void> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message));
  }

  const hasSAB = typeof SharedArrayBuffer !== 'undefined';
  console.log('[ffmpegClient] SharedArrayBuffer:', hasSAB);
  console.log('[ffmpegClient] Loading ffmpeg core from local files...');

  // Single-threaded core — không cần workerURL, đơn giản và ổn định
  await ffmpeg.load({
    coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
    wasmURL: '/ffmpeg/ffmpeg-core.wasm',
  });

  console.log('[ffmpegClient] ffmpeg loaded OK');
  isLoaded = true;
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded && ffmpeg) return;

  // Tránh load song song nhiều lần
  if (!loadPromise) {
    loadPromise = doLoad().catch((err) => {
      loadPromise = null; // reset để có thể retry
      throw err;
    });
  }
  await loadPromise;
}

export async function splitIntoSegments(params: {
  file: File;
  segments: { start: number; end: number }[];
  onProgress?: (info: ProgressInfo) => void;
  onStatus?: (msg: string) => void;
}): Promise<Blob[]> {
  const { file, segments, onProgress, onStatus } = params;

  onStatus?.('loading-ffmpeg');
  console.log('[ffmpegClient] ensureLoaded...');
  await ensureLoaded();
  console.log('[ffmpegClient] ensureLoaded done');

  if (!ffmpeg) throw new Error('FFmpeg không khởi tạo được');

  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const inputName = `input.${ext}`;

  onStatus?.('splitting');
  console.log('[ffmpegClient] Writing file to virtual FS...');
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  console.log('[ffmpegClient] File written, starting segments...');

  const blobs: Blob[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const duration = seg.end - seg.start;
    const outputName = `out_${i}.${ext}`;

    console.log(`[ffmpegClient] Segment ${i + 1}/${segments.length}: ${seg.start.toFixed(1)}s → ${seg.end.toFixed(1)}s`);

    const ret = await ffmpeg.exec([
      '-ss', String(seg.start),
      '-t', String(duration),
      '-i', inputName,
      '-c', 'copy',
      outputName,
    ]);

    console.log(`[ffmpegClient] Segment ${i + 1} exec returned:`, ret);

    const data = await ffmpeg.readFile(outputName);
    blobs.push(new Blob([data as Uint8Array], { type: file.type || `audio/${ext}` }));
    await ffmpeg.deleteFile(outputName);

    onProgress?.({ current: i + 1, total: segments.length, ratio: (i + 1) / segments.length });
  }

  await ffmpeg.deleteFile(inputName);
  console.log('[ffmpegClient] Done:', blobs.length, 'segments');
  return blobs;
}

export function preload(): void {
  ensureLoaded().catch((err) => console.warn('[ffmpegClient] Preload failed:', err));
}
