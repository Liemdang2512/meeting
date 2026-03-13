# Audio Split Research: Browser-Based M4A/MP3/WAV Splitting

**Researched:** 2026-03-12
**Domain:** Browser audio processing, WebAssembly, Web Audio API
**Confidence:** HIGH (root cause), HIGH (recommended solution), MEDIUM (alternatives)

---

## Root Cause Analysis (ffmpeg.wasm hanging)

### Diagnosis of the Current Setup

The project currently has these files in `public/ffmpeg/`:
- `ffmpeg-core.js` (112 KB) — contains pthread worker spawning code
- `ffmpeg-core.wasm` (32.2 MB)
- `ffmpeg-core.worker.js` (2.2 KB) — pthread thread handler

The `ffmpeg-core.worker.js` content reveals this is the **MT (multi-thread) build**, not ST. The worker file contains `ENVIRONMENT_IS_PTHREAD`, `__emscripten_thread_init`, `handleMessage` with `cmd: "run"` / `cmd: "load"` patterns — all signatures of Emscripten pthread multithreading.

`ffmpegClient.ts` calls `ffmpeg.load()` providing only `coreURL` and `wasmURL`, omitting `workerURL`. Without the worker URL, the MT core cannot spawn its pthread worker pool, so `ffmpeg.load()` awaits a "loaded" message that never arrives — **the promise hangs forever.**

### Root Cause Chain

```
MT core needs workerURL to spawn pthread workers
  → workerURL not provided to ffmpeg.load()
  → Core posts to worker, worker never responds with "loaded"
  → ffmpeg.load() promise never resolves
  → Whole app hangs at "loading-ffmpeg" status
```

### Why COEP=credentialless Adds Complexity

`SharedArrayBuffer` (SAB) is required for MT. SAB requires cross-origin isolation. The project correctly sets:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`

**The critical constraint:** `COEP: credentialless` is supported in Chrome 96+ and Firefox 119+, but **has NO support in Safari**. Safari requires `COEP: require-corp` instead. Any Safari user will have `SharedArrayBuffer === undefined`, so MT mode is impossible.

Additionally, `COEP: credentialless` vs `require-corp` matters for CDN resources: Tailwind CDN (`cdn.tailwindcss.com`) does not send `Cross-Origin-Resource-Policy` headers. With `require-corp`, Tailwind would be blocked. With `credentialless`, it loads without credentials — which is why `credentialless` was chosen. This is correct, but it creates the Safari incompatibility.

### Why the MT Version Fails on Chromium Too

Even when `workerURL` is correctly provided (Issue #597, #530, #772 on ffmpegwasm/ffmpeg.wasm):
- Chrome/Edge multithreaded ffmpeg.wasm hangs on exec with audio codecs
- The issue is confirmed: MT version is broken on Chromium-based browsers for audio operations
- Only Firefox handles the MT version reliably
- This is a known upstream bug, not a configuration problem

**Source:** [Issue #597](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/597), [Issue #772](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/772)

### Why the ST Version Also Hangs in Vite

When `@ffmpeg/core` (single-thread) is used with Vite:
1. Vite pre-bundles the dependency into its `.vite/deps` cache
2. Vite does NOT apply CORS headers to `.vite/deps/@fs/...` URLs
3. The worker module is served from a different effective origin context
4. Chrome rejects the worker script due to MIME type or CORS policy

**Fix required:** Add `optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] }` to `vite.config.ts`

Without this exclusion, Vite transforms the ES module in a way that breaks how ffmpeg.wasm dynamically imports its worker.

**Source:** [Issue #532](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/532), [Issue #815](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/815)

### Summary of All Issues

| Issue | Cause | Affects |
|-------|-------|---------|
| MT load hangs forever | `workerURL` not provided to `ffmpeg.load()` | Current code |
| MT hangs on Chrome/Edge | Known Chromium bug with pthread audio | All Chromium users |
| ST hangs in Vite dev | Vite optimizeDeps transforms worker incorrectly | Dev environment |
| SAB unavailable on Safari | `COEP: credentialless` not supported | All Safari users |
| Static files are MT build | Wrong core files in `public/ffmpeg/` | Current deployment |

---

## Recommended Solution

### Option A: Fix ffmpeg.wasm (Possible but fragile)

**Use ST core (`@ffmpeg/core`) with correct Vite config + toBlobURL**

This requires:
1. Replace `public/ffmpeg/` files with the ST build of `@ffmpeg/core` (no worker file)
2. Add `optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] }` to `vite.config.ts`
3. Update `ffmpeg.load()` to use `toBlobURL` for both `coreURL` and `wasmURL`
4. Accept: blocks main thread (no threading), no Safari MT, ~32MB WASM download

**Confidence this will work:** MEDIUM. Community reports are contradictory. Some Vite+React setups work, others don't. The `public/ffmpeg/` approach (serving from static URL) should bypass the Vite optimization issue.

**The hang may still occur** if the `@ffmpeg/core` package's JS glue code uses any worker internally — the ST "single thread" label means no Emscripten pthreads, but `@ffmpeg/ffmpeg` still uses its own `worker.js` wrapper that proxies commands to a Web Worker. That outer worker also requires same-origin and correct MIME type.

### Option B: Web Audio API + WAV Export (RECOMMENDED)

**Use `decodeAudioData` + `AudioBuffer` slicing + WAV encoding**

**Why this is the right choice for this project:**

1. Zero dependency on WASM loading — no COEP/SAB/worker issues
2. Works on all browsers including Safari
3. No Vite configuration changes needed
4. The task is audio *splitting* at fixed time boundaries — no re-encoding needed to WAV
5. Meeting audio recordings are typically mono or low-bitrate stereo at 16kHz–44.1kHz

**The memory constraint is the only real concern.** See analysis below.

#### Memory Analysis for This Project's Files

| Duration | Channels | Sample Rate | Decoded PCM Size |
|----------|----------|-------------|-----------------|
| 28 min | stereo 44.1kHz | — | ~565 MB |
| 28 min | mono 16kHz | — | ~103 MB |
| 60 min | stereo 44.1kHz | — | ~1,211 MB |
| 60 min | mono 16kHz | — | ~221 MB |
| 80 min | stereo 44.1kHz | — | ~1,615 MB |
| 80 min | mono 16kHz | — | ~295 MB |

Meeting recordings from smartphones or meeting apps (Zoom, Teams, Google Meet) are typically **mono at 16–22kHz**, which means decoded sizes are much smaller (103–295 MB for this project's range). Desktop Chrome tab memory limit is typically 2–4 GB. So for typical meeting audio, full-file decode is feasible.

**Risk:** If someone uploads a high-quality stereo recording at 44.1kHz and 80 minutes, decoded size may reach 1.6 GB — potentially hitting browser limits on lower-RAM devices.

**Mitigation strategy:** Decode the full file once, extract each segment as a `Float32Array` slice (cheap — no copy needed if using `subarray`), then encode to WAV one segment at a time and immediately release the WAV blob. Total peak memory: decoded PCM + one WAV segment at a time.

#### Why WAV output is acceptable

- The goal is to split for Gemini API / Whisper ingestion, not for playback distribution
- WAV is universally accepted by transcription APIs
- WAV segments can be downloaded and re-compressed by users if needed
- Converting to MP3 would require lamejs which adds encoding time and quality loss

---

## Alternative Options (ranked)

### Rank 1 (Recommended): Web Audio API + audiobuffer-to-wav

**Approach:**
```
File → file.arrayBuffer() → AudioContext.decodeAudioData() → AudioBuffer
→ for each segment:
    copy Float32Array.slice(startSample, endSample)
    → build minimal AudioBuffer-like object
    → audiobuffer-to-wav → Blob → download
```

**Libraries needed:**
- `audiobuffer-to-wav` (npm: `audiobuffer-to-wav`) — 300-line WAV encoder, well-maintained
- No other dependencies

**Pros:**
- Works on all browsers, no WASM loading
- No COEP/SAB headers needed
- `AudioContext.decodeAudioData` is native browser — handles M4A/AAC, MP3, WAV natively
- Output is WAV: lossless representation of the exact segment

**Cons:**
- Full file decoded into memory upfront (see memory analysis above)
- Output format is WAV (larger files than input)
- Main thread may freeze briefly during WAV encoding of large segments (mitigate with setTimeout batching)

**Confidence:** HIGH — this is the standard approach used by tools like ChunkAudio

### Rank 2 (Fallback): Fix ffmpeg.wasm ST with correct config

**Approach:** Use `@ffmpeg/core` (ST) with `public/ffmpeg/` static files + `optimizeDeps` exclusion.

```typescript
// vite.config.ts addition:
optimizeDeps: {
  exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
}

// ffmpegClient.ts:
await ffmpeg.load({
  coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
  wasmURL: '/ffmpeg/ffmpeg-core.wasm',
  // No workerURL for ST build
});
```

**Requires:** Replace `public/ffmpeg/` files with ST build (NOT the current MT/pthread build)

**How to get ST files:**
```bash
node -e "
const path = require('path');
const src = path.dirname(require.resolve('@ffmpeg/core'));
console.log(src);
"
# Then copy ffmpeg-core.js and ffmpeg-core.wasm (NOT worker.js) to public/ffmpeg/
```

**Pros:**
- Preserves original format (input M4A → output M4A, uses `-c copy`)
- No re-encoding = fast and lossless
- Familiar ffmpeg command syntax

**Cons:**
- ST core blocks the main thread (UI freezes during processing)
- Need to run in a Web Worker to avoid UI freeze
- 32MB WASM download on first use
- Community reports of Vite compatibility are inconsistent — may still hang
- Does not work on Safari when SAB is unavailable

**Confidence:** MEDIUM — the missing `workerURL` for ST is confirmed fixable; whether Vite+static URL loading works consistently needs testing.

### Rank 3 (Not recommended): MediaRecorder playback-and-capture

**Approach:**
1. Create `AudioContext`, load file, connect to `MediaStreamDestinationNode`
2. For each segment: `start()` MediaRecorder, `audioSource.start(0, segStart, segDuration)`, wait, `stop()`
3. Collect `dataavailable` blobs

**Pros:** Avoids WAV encoding; output format matches browser's preferred codec (webm/opus)

**Cons:**
- Processes at real-time speed (80-minute file takes 80 minutes to split)
- `dataavailable` blob metadata issues when splitting mid-stream
- Output is webm/opus, not M4A — incompatible with original format
- **Not feasible for this use case** — real-time processing is a dealbreaker

**Confidence for use:** LOW

### Rank 4 (Not recommended for this project): WebCodecs API

**Approach:** Use `AudioDecoder` to decode AAC chunks, accumulate `AudioData` frames, encode output segments.

**Pros:** Lower memory than full `decodeAudioData` (stream processing), supports AAC

**Cons:**
- Requires parsing MP4/M4A container format to extract NAL units (no browser API for this)
- Needs a separate demuxer library (e.g. `mp4box.js`)
- No Safari support (Safari does not support `AudioDecoder` as of 2025)
- Complex implementation; significantly more code than Web Audio API approach
- Still needs WAV or another encoder for output

**Confidence for use:** LOW (complexity/browser support not justified for this use case)

---

## Implementation Approach

### Recommended: Web Audio API + audiobuffer-to-wav

#### Step 1: Install dependency

```bash
npm install audiobuffer-to-wav
```

#### Step 2: Core splitting function

```typescript
// features/file-split/lib/webAudioSplitter.ts

import audioBufferToWav from 'audiobuffer-to-wav';

export type ProgressInfo = { current: number; total: number; ratio: number };

export async function splitIntoSegments(params: {
  file: File;
  segments: { start: number; end: number }[];
  onProgress?: (info: ProgressInfo) => void;
  onStatus?: (msg: string) => void;
}): Promise<Blob[]> {
  const { file, segments, onProgress, onStatus } = params;

  onStatus?.('decoding');

  // 1. Decode entire file to PCM once
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  const fullBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const sampleRate = fullBuffer.sampleRate;
  const numberOfChannels = fullBuffer.numberOfChannels;
  const blobs: Blob[] = [];

  onStatus?.('splitting');

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startSample = Math.floor(seg.start * sampleRate);
    const endSample = Math.min(
      Math.floor(seg.end * sampleRate),
      fullBuffer.length
    );
    const segLength = endSample - startSample;

    // 2. Create a new AudioBuffer for this segment
    const segBuffer = new AudioBuffer({
      numberOfChannels,
      length: segLength,
      sampleRate,
    });

    // 3. Copy each channel's samples for this time slice
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const channelData = fullBuffer.getChannelData(ch);
      // subarray is zero-copy view; copyToChannel writes it into segBuffer
      segBuffer.copyToChannel(channelData.subarray(startSample, endSample), ch);
    }

    // 4. Encode to WAV and create Blob
    const wavArrayBuffer = audioBufferToWav(segBuffer);
    blobs.push(new Blob([wavArrayBuffer], { type: 'audio/wav' }));

    onProgress?.({ current: i + 1, total: segments.length, ratio: (i + 1) / segments.length });
  }

  return blobs;
}
```

#### Step 3: Update useFileSplitter.ts

Change the import in the `splitFile` callback from:
```typescript
const { splitIntoSegments } = await import('../lib/ffmpegClient');
```
to:
```typescript
const { splitIntoSegments } = await import('../lib/webAudioSplitter');
```

The function signature is identical — `file`, `segments`, `onProgress`, `onStatus` — so no other changes are needed in the hook.

#### Step 4: Update segment file naming

WAV output should use `.wav` extension. In `useFileSplitter.ts`:
```typescript
// Change:
name: `${baseName}_part_${i + 1}.${ext}`,
// To:
name: `${baseName}_part_${i + 1}.wav`,
```

#### Step 5: Remove ffmpeg dependencies (optional cleanup)

```bash
npm uninstall @ffmpeg/ffmpeg @ffmpeg/core @ffmpeg/core-mt @ffmpeg/util
```
Remove `public/ffmpeg/` directory.

#### Step 6: Remove `optimizeDeps` if you added it

No Vite config changes needed for the Web Audio approach.

### Alternative Implementation: Fix ffmpeg.wasm (if WAV output is unacceptable)

If output must preserve original format (M4A → M4A, MP3 → MP3):

#### Step 1: Replace public/ffmpeg/ with ST build

```bash
# Find ST core location
node -e "const p=require.resolve('@ffmpeg/core'); console.log(require('path').dirname(p))"
# Copy ffmpeg-core.js and ffmpeg-core.wasm ONLY (not worker.js — ST has no worker)
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js public/ffmpeg/
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm public/ffmpeg/
rm public/ffmpeg/ffmpeg-core.worker.js  # ST has no pthread worker
```

#### Step 2: Update vite.config.ts

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    optimizeDeps: {
      // REQUIRED: prevents Vite from transforming ffmpeg's dynamic worker import
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    plugins: [react()],
    // ... rest of config
  };
});
```

#### Step 3: Update ffmpegClient.ts load call

```typescript
// ST build: coreURL only, NO workerURL
await ffmpeg.load({
  coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
  wasmURL: '/ffmpeg/ffmpeg-core.wasm',
  // Do NOT include workerURL — ST build has no pthread worker
});
```

**Warning:** ST runs on main thread and blocks UI. Wrap in a Web Worker or accept UI freeze. For 38MB files, ffmpeg.exec with `-c copy` takes ~2-10 seconds — acceptable but UI shows as unresponsive.

---

## Pitfalls to Avoid

### Pitfall 1: MT Core Files Without workerURL

**What goes wrong:** `ffmpeg.load()` hangs forever, no error thrown.

**Why it happens:** MT core sends a "load" message to a pthread worker thread that was never spawned because `workerURL` was not provided.

**How to avoid:** For MT: provide all three URLs (`coreURL`, `wasmURL`, `workerURL`). For ST: use `@ffmpeg/core` (not `@ffmpeg/core-mt`) and provide only `coreURL` + `wasmURL`.

**Warning sign:** 504 Outdated Optimize Dep error in Network tab for worker.js, or `SharedArrayBuffer` undefined in console.

### Pitfall 2: Vite optimizeDeps Transformation

**What goes wrong:** ST ffmpeg.wasm loads but then hangs or errors with "blocked because of a disallowed MIME type" for worker.js.

**Why it happens:** Vite pre-bundles `@ffmpeg/ffmpeg` and rewrites the dynamic `new Worker(...)` URL inside it, pointing to a `.vite/deps/` path that doesn't have the correct CORS headers.

**How to avoid:** Always add to vite.config.ts:
```typescript
optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] }
```

**Warning sign:** Worker URL in Network tab starts with `/@fs/` or `/.vite/deps/`.

### Pitfall 3: Web Audio API Memory Exhaustion

**What goes wrong:** `decodeAudioData` succeeds, but browser crashes or throws OOM error partway through WAV export.

**Why it happens:** Stereo 44.1kHz audio at 80 minutes decodes to ~1.6 GB PCM. Each WAV segment is also held in memory until `URL.createObjectURL` is called and the `Blob` is created.

**How to avoid:**
- Process segments one at a time (done in the recommended code above)
- Immediately call `URL.createObjectURL(blob)` and release the `wavArrayBuffer` reference after each segment
- Consider warning users if `file.size > 50MB` that processing may be slow
- Use `FileReader` + progress indicator before decode so user knows it's working

**Warning sign:** Tab crashes with no error message, or OOM error in Chrome Task Manager.

### Pitfall 4: AudioBuffer Segment Boundary Precision

**What goes wrong:** Segments have tiny gaps or overlaps at boundaries due to floating-point sample rounding.

**Why it happens:** `Math.floor(seg.start * sampleRate)` and `Math.floor(seg.end * sampleRate)` — adjacent segments should use the same boundary value.

**How to avoid:** Ensure that `segment[i].end === segment[i+1].start` (they already do in the existing `computeSegments` utility). Use `Math.round` for both start and end, and verify `startSample` for segment N equals `endSample` for segment N-1.

### Pitfall 5: AudioContext User Gesture Requirement

**What goes wrong:** `new AudioContext()` fails silently or is "suspended" in Chrome because it was created outside a user gesture.

**Why it happens:** Chrome's autoplay policy requires AudioContext creation to be triggered by user interaction (click event).

**How to avoid:** The `splitFile` function is already called from a button click in `useFileSplitter.ts` — this satisfies the user gesture requirement. Do NOT move `new AudioContext()` outside the click handler (e.g., to module init or useEffect).

### Pitfall 6: M4A Decode Compatibility

**What goes wrong:** `decodeAudioData` throws or returns empty buffer for M4A files.

**Why it happens:** M4A (AAC in MPEG-4 container) is supported by `decodeAudioData` in Chrome, Firefox, Safari — but not in some older Firefox versions. Additionally, some M4A files use ALAC (Apple Lossless) which may not be supported in Firefox.

**How to avoid:** Test with actual M4A files from the target use case (meeting recordings). If ALAC M4A becomes an issue, catch the error and show a message asking user to convert to MP3/WAV first. ALAC is rare in meeting recordings.

---

## Memory + Performance Reference

| Approach | Memory Peak | Processing Speed | Output Format | Browser Support |
|----------|-------------|-----------------|---------------|-----------------|
| Web Audio API + WAV export | Decoded PCM + 1 segment WAV | Fast (non-real-time) | WAV | All modern browsers |
| ffmpeg.wasm ST + -c copy | 32MB WASM + input file (double) | Fast | Original format | Chrome, Firefox (not Safari MT) |
| ffmpeg.wasm MT | Same as ST | Fast (multi-core) | Original format | Firefox only (Chrome/Edge broken) |
| MediaRecorder playback | Low | Real-time (1:1 duration) | webm/opus | All modern |

For the project's file range (13–38 MB, 28–80 min, meeting audio):
- Assuming mono 16kHz (typical meeting recordings): decoded size is 103–295 MB — well within limits
- Assuming stereo 44.1kHz (music quality): 565 MB–1.6 GB — risk of OOM on low-RAM devices

---

## Sources

### Primary (HIGH confidence)
- [ffmpegwasm/ffmpeg.wasm Issue #532](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/532) — Vite optimizeDeps root cause
- [ffmpegwasm/ffmpeg.wasm Issue #815](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/815) — load() not resolving, solutions
- [ffmpegwasm/ffmpeg.wasm Issue #597](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/597) — MT broken on Chromium
- [ffmpegwasm/ffmpeg.wasm Issue #772](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/772) — MT hangs on Chrome/Safari
- [Chrome Developers: COEP credentialless](https://developer.chrome.com/blog/coep-credentialless-origin-trial) — credentialless vs require-corp
- [MDN: OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) — memory constraints
- [audiobuffer-to-wav npm](https://www.npmjs.com/package/audiobuffer-to-wav) — WAV encoding library

### Secondary (MEDIUM confidence)
- [ffmpegwasm Discussion #856](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/856) — multi-domain loading workarounds
- [danielbarta.com: Export Audio on the Web](https://danielbarta.com/export-audio-on-the-web/) — memory analysis (1212MB/60min)
- [WebAudio Issue #2445](https://github.com/WebAudio/web-audio-api/issues/2445) — OfflineAudioContext memory constraints
- [chunk-audio GitHub](https://github.com/briansunter/chunk-audio) — production example using ffmpeg.wasm

### Tertiary (LOW confidence — single source)
- [ffmpegwasm Issue #530](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/530) — Chrome/Edge MT specifically broken
- [Scribbler: lamejs](https://scribbler.live/2024/12/05/Coverting-Wav-to-Mp3-in-JavaScript-Using-Lame-js.html) — MP3 encoding approach

---

## Decision Matrix

| Question | Answer |
|----------|--------|
| Can ffmpeg.wasm MT work on Chrome? | No — confirmed upstream bug (#597, #772) |
| Can ffmpeg.wasm ST work in Vite? | Possibly — requires optimizeDeps exclude + correct public/ files |
| Is current public/ffmpeg/ ST or MT? | MT (confirmed by pthread code in worker.js) |
| Is COEP credentialless correct for Tailwind CDN? | Yes — correct choice, but means no SAB on Safari |
| Can Web Audio API decode M4A? | Yes — Chrome, Firefox, Safari all support AAC via decodeAudioData |
| Is memory a dealbreaker for 38MB files? | No for mono meeting recordings; risk only for stereo 44.1kHz 80min |
| Recommended solution? | Web Audio API + audiobuffer-to-wav |
