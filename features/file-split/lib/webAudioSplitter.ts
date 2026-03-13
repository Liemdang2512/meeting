export type ProgressInfo = { current: number; total: number; ratio: number };

function encodeWAV(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channels.length;
  const length = channels[0].length;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

export async function splitAudio(params: {
  file: File;
  segments: { start: number; end: number }[];
  onProgress?: (info: ProgressInfo) => void;
  onStatus?: (msg: string) => void;
}): Promise<Blob[]> {
  const { file, segments, onProgress, onStatus } = params;

  onStatus?.('splitting');

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close();

  const { sampleRate, numberOfChannels } = audioBuffer;
  const blobs: Blob[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startSample = Math.floor(seg.start * sampleRate);
    const endSample = Math.min(Math.ceil(seg.end * sampleRate), audioBuffer.length);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numberOfChannels; c++) {
      channels.push(audioBuffer.getChannelData(c).slice(startSample, endSample));
    }

    const wav = encodeWAV(channels, sampleRate);
    blobs.push(new Blob([wav], { type: 'audio/wav' }));

    onProgress?.({ current: i + 1, total: segments.length, ratio: (i + 1) / segments.length });
  }

  return blobs;
}
