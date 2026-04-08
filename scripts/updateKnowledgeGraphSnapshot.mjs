import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = path.resolve(process.cwd());
const targetHtmlPath = path.join(repoRoot, 'KNOWLEDGE_GRAPH.html');

const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.css', '.scss', '.html', '.txt',
  '.sql', '.yml', '.yaml', '.toml', '.env.example',
  '.sh', '.tsv', '.csv',
  '.gitignore', '.gitattributes',
]);

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'coverage',
  '.vite',
  '.cache',
  '.DS_Store',
]);

const EXCLUDE_PATH_PREFIXES = [
  '.claude/worktrees/', // worktrees copies
];

const EXCLUDE_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

const EXCLUDE_BASENAME_PATTERNS = [
  /^\.env(\..*)?$/i, // .env, .env.local, .env.production...
  /^\.?DS_Store$/i,
];

const MAX_FILE_BYTES = 512 * 1024; // cap each file at 512KB

function isExcludedBasename(name) {
  return EXCLUDE_BASENAME_PATTERNS.some((re) => re.test(name));
}

function shouldIncludeFile(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  for (const prefix of EXCLUDE_PATH_PREFIXES) {
    if (normalized.startsWith(prefix)) return false;
  }

  const base = path.posix.basename(normalized);
  // Explicit allow-list for special filenames (must come before exclude rules)
  if (base === '.env.example') return true;

  if (isExcludedBasename(base)) return false;
  if (EXCLUDE_FILES.has(base)) return false;

  const ext = path.posix.extname(base);
  if (TEXT_EXTS.has(ext)) return true;

  // Handle extension-less "text" files (README, etc.)
  if (!ext && (base === 'README' || base === 'LICENSE' || base === 'AGENTS.md')) return true;
  if (base.endsWith('.d.ts')) return true;

  return false;
}

function walk(dirAbs, relBase = '') {
  const out = [];
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(dirAbs, ent.name);
    const rel = path.join(relBase, ent.name);

    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      out.push(...walk(abs, rel));
      continue;
    }

    if (!ent.isFile()) continue;
    if (!shouldIncludeFile(rel)) continue;
    out.push(rel);
  }
  return out;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readUtf8Capped(absPath) {
  const st = fs.statSync(absPath);
  if (st.size > MAX_FILE_BYTES) {
    const buf = fs.readFileSync(absPath);
    const head = buf.subarray(0, MAX_FILE_BYTES);
    const tail = buf.subarray(Math.max(0, buf.length - 16 * 1024));
    const content =
      head.toString('utf8') +
      `\n\n/* --- TRUNCATED: original ${st.size} bytes, showing first ${MAX_FILE_BYTES} bytes + last ${tail.length} bytes --- */\n\n` +
      tail.toString('utf8');
    return { content, bytes: st.size, truncated: true };
  }
  return { content: fs.readFileSync(absPath, 'utf8'), bytes: st.size, truncated: false };
}

function buildSnapshot() {
  const fileList = walk(repoRoot).sort((a, b) => a.localeCompare(b));
  const files = {};

  for (const rel of fileList) {
    const abs = path.join(repoRoot, rel);
    const normalized = rel.split(path.sep).join('/');
    const { content, bytes } = readUtf8Capped(abs);
    files[normalized] = { content, sha256: sha256(content), bytes };
  }

  return {
    generatedAt: new Date().toISOString(),
    root: path.basename(repoRoot),
    fileCount: Object.keys(files).length,
    files,
  };
}

function injectSnapshotIntoHtml(html, snapshotJson) {
  // Replace the whole snapshot payload region up to the closing `</script>` that sits
  // immediately before `</body>`. This avoids leaving any leftover junk behind when
  // the previous snapshot content contained a literal `</script>` sequence.
  const re = /(<script\s+id="sourceSnapshot"\s+type="application\/json">)[\s\S]*?(<\/script>\s*<\/body>)/m;
  if (!re.test(html)) {
    throw new Error('Could not find snapshot <script id="sourceSnapshot"...> region in KNOWLEDGE_GRAPH.html');
  }
  return html.replace(re, `$1${snapshotJson}$2`);
}

function main() {
  if (!fs.existsSync(targetHtmlPath)) {
    throw new Error(`Missing ${targetHtmlPath}`);
  }

  const snapshot = buildSnapshot();
  const snapshotJson = JSON.stringify(snapshot);
  // Encode snapshot JSON as base64 to guarantee it can't contain a literal `</script>`
  // sequence from any source file content (which would break HTML parsing).
  const b64 = Buffer.from(snapshotJson, 'utf8').toString('base64');
  const payload = {
    encoding: 'utf8-base64',
    generatedAt: snapshot.generatedAt,
    root: snapshot.root,
    fileCount: snapshot.fileCount,
    base64: b64,
  };
  const payloadJson = JSON.stringify(payload);

  const html = fs.readFileSync(targetHtmlPath, 'utf8');
  const nextHtml = injectSnapshotIntoHtml(html, payloadJson);
  fs.writeFileSync(targetHtmlPath, nextHtml, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Updated KNOWLEDGE_GRAPH.html sourceSnapshot with ${snapshot.fileCount} files (base64 payload).`);
}

main();
