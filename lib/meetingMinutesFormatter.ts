// Xoá phần mở đầu Gemini tự thêm (trước nội dung thực)
function stripPreamble(text: string): string {
  const lines = text.split('\n');
  // Tìm dòng đầu tiên trông như nội dung thật:
  // heading (#), chữ in hoa ≥ 3 ký tự, bullet (-/*/số.), hoặc dòng bảng (|)
  const contentLineRe = /^(#{1,6} |[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẶẲẴẶỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]{3,}|[-*+] |\d+\. |\||Người nói)/u;
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (contentLineRe.test(lines[i].trim())) { start = i; break; }
    // Nếu dòng kết thúc bằng ":" mà không phải tên người nói → đây là preamble
    // Tiếp tục tìm
  }
  return lines.slice(start).join('\n');
}

export function formatMinutesMarkdown(raw: string): string {
  const stripped = stripPreamble(raw);
  const lines = stripped.split('\n');

  // Sửa một số lỗi chính tả cơ bản
  const cleanedLines = lines.map((line) =>
    line.replace(/Trân trong/gi, 'Trân trọng'),
  );

  const buildParticipantsTable = (blockLines: string[]): string => {
    if (blockLines.length === 0) {
      return (
        '| Cột 1 (Bên A / Đơn vị tổ chức) | Cột 2 (Bên B / Khách mời / Người nghe) |\n' +
        '|---|---|\n' +
        '| [Tên/Thành phần] | [Tên/Thành phần] |'
      );
    }

    const merged = blockLines.join(' ').replace(/\s+/g, ' ');
    const rawRows = merged.split('||').map((r) => r.trim()).filter(Boolean);

    const rows: string[] = [];
    for (const rawRow of rawRows) {
      const cells = rawRow
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        rows.push(`| ${cells[0]} | ${cells[1]} |`);
      }
    }

    if (rows.length === 0) {
      rows.push('| [Tên/Thành phần] | [Tên/Thành phần] |');
    }

    return (
      '| Cột 1 (Bên A / Đơn vị tổ chức) | Cột 2 (Bên B / Khách mời / Người nghe) |\n' +
      '|---|---|\n' +
      rows.join('\n')
    );
  };

  const buildPlanTable = (blockLines: string[]): string => {
    if (blockLines.length === 0) {
      return (
        '| Chi tiết công việc | Phụ trách thực hiện |\n' +
        '|---|---|\n' +
        '| [Task] | [Người phụ trách] |'
      );
    }

    const merged = blockLines.join(' ').replace(/\s+/g, ' ');
    const rawRows = merged.split('||').map((r) => r.trim()).filter(Boolean);

    const rows: string[] = [];
    for (const rawRow of rawRows) {
      const cells = rawRow
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        rows.push(`| ${cells[0]} | ${cells[1]} |`);
      }
    }

    if (rows.length === 0) {
      rows.push('| [Task] | [Người phụ trách] |');
    }

    return (
      '| Chi tiết công việc | Phụ trách thực hiện |\n' +
      '|---|---|\n' +
      rows.join('\n')
    );
  };

  // Trộn lại các dòng, thay block excel lộn xộn thành bảng Markdown chuẩn
  const withTablesLines: string[] = [];

  for (let i = 0; i < cleanedLines.length; i += 1) {
    const line = cleanedLines[i];

    if (/THÀNH PHẦN THAM D[ƯU]/i.test(line)) {
      withTablesLines.push('THÀNH PHẦN THAM DỰ');

      const block: string[] = [];
      i += 1;
      for (; i < cleanedLines.length; i += 1) {
        const current = cleanedLines[i];
        if (
          /^NỘI DUNG TRAO ĐỔI/i.test(current) ||
          /^Chi tiết công việc\s*\|/i.test(current)
        ) {
          i -= 1;
          break;
        }
        if (current.trim() !== '') {
          block.push(current);
        }
      }

      const table = buildParticipantsTable(block);
      withTablesLines.push('', ...table.split('\n'), '');
      continue;
    }

    if (/^Chi tiết công việc\s*\|/i.test(line)) {
      withTablesLines.push('KẾ HOẠCH TRIỂN KHAI');

      const block: string[] = [];
      i += 1;
      for (; i < cleanedLines.length; i += 1) {
        const current = cleanedLines[i];
        if (current.trim() === '' || /^Trân trọng/i.test(current)) {
          break;
        }
        block.push(current);
      }

      const table = buildPlanTable(block);
      withTablesLines.push('', ...table.split('\n'), '');
      continue;
    }

    withTablesLines.push(line);
  }

  // Chuẩn hoá đánh số nội dung: "Nội dung 01" -> "1."
  const normalizedBodyLines = withTablesLines.map((line) => {
    const match = line.match(
      /^\s*(Nội dung|Noi dung)\s*0?(\d+)[.: -]\s*(.*)$/i,
    );
    if (!match) return line;
    const num = Number(match[2]);
    const rest = match[3] ?? '';
    return `${num}. ${rest}`.trimEnd();
  });

  const normalizedBody = normalizedBodyLines.join('\n');
  let result = normalizedBody.trimEnd();

  if (!/Trân trọng\**\s*$/m.test(result)) {
    result = `${result.trim()}\n\n**Trân trọng**`;
  }

  // Đảm bảo mỗi dòng nội dung là một paragraph riêng trong Markdown
  // (ReactMarkdown cần dòng trắng giữa các dòng để xuống dòng)
  // Bỏ qua table rows (dòng bắt đầu bằng |)
  const resultLines = result.split('\n');
  const paragraphed: string[] = [];
  for (let i = 0; i < resultLines.length; i++) {
    paragraphed.push(resultLines[i]);
    if (
      i < resultLines.length - 1 &&
      resultLines[i].trim() !== '' &&
      resultLines[i + 1].trim() !== '' &&
      !resultLines[i].trim().startsWith('|') &&
      !resultLines[i + 1].trim().startsWith('|')
    ) {
      paragraphed.push('');
    }
  }

  return paragraphed.join('\n');
}

