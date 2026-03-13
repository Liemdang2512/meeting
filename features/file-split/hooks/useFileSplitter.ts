import { useState, useCallback, useEffect } from 'react';
import { SplitSegment, SplitStatus } from '../types';
import { MAX_SPLIT_FILE_SIZE_MB, ERROR_FILE_TOO_LARGE, ERROR_DURATION_FAILED, ERROR_SPLIT_FAILED, DEFAULT_CHUNK_MINUTES } from '../constants';
import { computeSegments } from '../utils/segmentCalculator';

export function useFileSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [fileSizeMB, setFileSizeMB] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [chunkMinutes, setChunkMinutesState] = useState(DEFAULT_CHUNK_MINUTES);
  const [segments, setSegments] = useState<{ start: number; end: number }[]>([]);
  const [status, setStatus] = useState<SplitStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, ratio: 0 });
  const [error, setError] = useState<string | null>(null);
  const [resultSegments, setResultSegments] = useState<SplitSegment[]>([]);

  useEffect(() => {
    if (durationSeconds !== null) {
      setSegments(computeSegments(durationSeconds, chunkMinutes));
    }
  }, [durationSeconds, chunkMinutes]);

  const onSelectFile = useCallback((selectedFile: File) => {
    const sizeMB = selectedFile.size / (1024 * 1024);
    setError(null);
    setResultSegments([]);
    setSegments([]);
    setDurationSeconds(null);

    if (sizeMB > MAX_SPLIT_FILE_SIZE_MB) {
      setError(ERROR_FILE_TOO_LARGE);
      setFile(null);
      setFileSizeMB(null);
      return;
    }

    setFile(selectedFile);
    setFileSizeMB(sizeMB);
    setStatus('idle');

    // Measure duration via HTMLMediaElement
    const url = URL.createObjectURL(selectedFile);
    const el = document.createElement('video');
    el.src = url;
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (isFinite(el.duration) && el.duration > 0) {
        setDurationSeconds(el.duration);
      } else {
        setError(ERROR_DURATION_FAILED);
      }
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      setError(ERROR_DURATION_FAILED);
    };
  }, []);

  const setChunkMinutes = useCallback((value: number) => {
    setChunkMinutesState(value);
  }, []);

  const splitFile = useCallback(async () => {
    if (!file || segments.length === 0) return;

    setError(null);
    setResultSegments([]);

    try {
      const { splitAudio } = await import('../lib/webAudioSplitter');

      const blobs = await splitAudio({
        file,
        segments,
        onProgress: (info) => setProgress(info),
        onStatus: (s) => setStatus(s as any),
      });

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const ext = 'wav'; // Web Audio API output là WAV

      const result: SplitSegment[] = blobs.map((blob, i) => ({
        index: i,
        start: segments[i].start,
        end: segments[i].end,
        duration: segments[i].end - segments[i].start,
        blob,
        name: `${baseName}_part_${i + 1}.${ext}`,
      }));

      setResultSegments(result);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || ERROR_SPLIT_FAILED);
      setStatus('error');
    }
  }, [file, segments]);

  const reset = useCallback(() => {
    setFile(null);
    setFileSizeMB(null);
    setDurationSeconds(null);
    setSegments([]);
    setStatus('idle');
    setProgress({ current: 0, total: 0, ratio: 0 });
    setError(null);
    setResultSegments([]);
  }, []);

  return {
    file,
    fileSizeMB,
    durationSeconds,
    chunkMinutes,
    segments,
    status,
    progress,
    error,
    resultSegments,
    onSelectFile,
    setChunkMinutes,
    splitFile,
    reset,
  };
}
