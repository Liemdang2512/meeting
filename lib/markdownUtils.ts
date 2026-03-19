// Server-safe markdown utilities — no browser dependencies (no window, no document)

export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function inlineMd(text: string): string {
  return escHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  const isTableDiv = (l: string) => /^\s*\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    if (/^# /.test(line))   { out.push(`<h1>${inlineMd(line.slice(2))}</h1>`); i++; continue; }
    if (/^## /.test(line))  { out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); i++; continue; }
    if (/^### /.test(line)) { out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); i++; continue; }
    if (/^---+$/.test(line.trim())) { out.push('<hr>'); i++; continue; }
    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableDiv(lines[i + 1])) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2;
      let t = '<table><thead><tr>' + headers.map(h => `<th>${inlineMd(h)}</th>`).join('') + '</tr></thead><tbody>';
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length) t += '<tr>' + cells.map(c => `<td>${inlineMd(c)}</td>`).join('') + '</tr>';
        i++;
      }
      out.push(t + '</tbody></table>');
      continue;
    }
    out.push(`<p>${inlineMd(line)}</p>`);
    i++;
  }
  return out.join('\n');
}
