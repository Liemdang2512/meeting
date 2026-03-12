export function computeSegments(
  durationSeconds: number,
  chunkMinutes: number
): { start: number; end: number }[] {
  const chunkSeconds = chunkMinutes * 60;
  const segments: { start: number; end: number }[] = [];
  let start = 0;
  while (start < durationSeconds) {
    const end = Math.min(start + chunkSeconds, durationSeconds);
    segments.push({ start, end });
    start = end;
  }
  return segments;
}
