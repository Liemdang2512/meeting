export interface EmailTemplateData {
  companyName: string;
  companyAddress: string;
  meetingDatetime: string;
  meetingLocation: string;
  participants: Array<{ name: string; title?: string; role?: string }>;
  minutesHtml: string;
}

export function buildEmailHtml(data: EmailTemplateData): string {
  const participantRows = data.participants.map(p => {
    const parts = [p.title, p.role].filter(Boolean);
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155">${escH(p.name)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b">${escH(parts.join(' - '))}</td>
    </tr>`;
  }).join('');

  const metaRow = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:4px 0;font-size:13px;color:#64748b;width:120px;vertical-align:top">${label}</td><td style="padding:4px 0;font-size:14px;color:#334155;font-weight:500">${escH(value)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;margin:0;padding:24px 0">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <!-- Header -->
    <div style="background:#4f46e5;padding:32px 40px">
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;font-family:Arial,Helvetica,sans-serif">Bien ban cuoc hop</h1>
      ${data.companyName ? `<p style="color:#c7d2fe;margin:8px 0 0;font-size:14px">${escH(data.companyName)}</p>` : ''}
    </div>

    <!-- Meeting info -->
    <div style="padding:24px 40px;border-bottom:1px solid #e2e8f0">
      <table style="border-collapse:collapse;width:100%">
        ${metaRow('Thoi gian', data.meetingDatetime)}
        ${metaRow('Dia diem', data.meetingLocation)}
        ${metaRow('Dia chi', data.companyAddress)}
      </table>
    </div>

    <!-- Participants -->
    ${data.participants.length > 0 ? `
    <div style="padding:24px 40px;border-bottom:1px solid #e2e8f0">
      <h2 style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 12px;font-family:Arial,Helvetica,sans-serif">Thanh phan tham du</h2>
      <table style="border-collapse:collapse;width:100%">
        ${participantRows}
      </table>
    </div>` : ''}

    <!-- Minutes content -->
    <div style="padding:32px 40px">
      <h2 style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif">Noi dung bien ban</h2>
      <div style="font-size:14px;line-height:1.7;color:#334155">
        ${data.minutesHtml}
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
        Email nay duoc gui tu Meeting Scribe AI Pro. File PDF dinh kem chua noi dung bien ban day du.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escH(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
