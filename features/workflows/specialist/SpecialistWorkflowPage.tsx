import React, { useCallback, useState, useEffect, useRef } from 'react';
import { takePendingUpload } from '../shared/fileStore';
import { SESSION_KEY_MEETING_LANGUAGE } from '../shared/sessionKeys';
import { TranscriptionView } from '../../../components/TranscriptionView';
import { WorkflowStepHeader } from '../../../components/workflows/WorkflowStepHeader';
import { MeetingInfoForm } from '../../minutes/components/MeetingInfoForm';
import { loadMeetingInfoDraft, saveMeetingInfoDraft, clearMeetingInfoDraft } from '../../minutes/storage';
import type { MeetingInfo } from '../../minutes/types';
import { buildSpecialistPrompt } from './specialistPrompt';
import {
  transcribeBasic,
  synthesizeTranscriptions,
  summarizeTranscript,
  type AudioLanguage,
} from '../../../services/geminiService';
import { authFetch } from '../../../lib/api';
import { downloadAsPdf, downloadAsDocx } from '../../../lib/minutesDocxExport';
import type { AuthUser } from '../../../lib/auth';

const DEFAULT_SPECIALIST_PROMPT = `Hãy tạo BIÊN BẢN CUỘC HỌP (Meeting Minute) chuyên nghiệp theo đúng cấu trúc sau. Viết bằng tiếng Việt, súc tích, trung thực với nội dung transcript.

---

## BIÊN BẢN CUỘC HỌP

**[TÊN ĐƠN VỊ A] – [TÊN ĐƠN VỊ B]**
*(Nếu chỉ có một bên thì bỏ phần tên đơn vị B)*

| Mục | Chi tiết |
|---|---|
| **Nội dung** | [Chủ đề cuộc họp] |
| **Mục đích cuộc họp** | [Mục tiêu cần đạt được] |
| **Thời gian** | [Ngày tháng năm] |
| **Hình thức họp** | [Offline / Online / Hybrid] |

---

### Thành phần tham dự

| [Tên đơn vị A] | [Tên đơn vị B] |
|---|---|
| [Họ tên - Chức vụ] | [Họ tên - Chức vụ] |
| ... | ... |

*(Nếu chỉ có một bên, dùng danh sách đơn thay vì bảng 2 cột)*

---

### NỘI DUNG TRAO ĐỔI

**Nội dung 01:** [Tiêu đề chủ đề thứ nhất]
**Nội dung 02:** [Tiêu đề chủ đề thứ hai]
**Nội dung 03:** [Tiêu đề chủ đề thứ ba]
*(Liệt kê đủ các chủ đề được thảo luận)*

---

**1. [Tiêu đề chủ đề / Người phát biểu thứ nhất]**

- [Ý chính 1 — ghi rõ, dùng gạch đầu dòng]
- [Ý chính 2]
- [Ý chính 3]

**2. [Tiêu đề chủ đề / Người phát biểu thứ hai]**

- [Ý chính 1]
- [Ý chính 2]

*(Tiếp tục cho đến hết nội dung)*

---

### 3. Kết luận

- [Điểm thống nhất / kết quả quan trọng thứ nhất]
- [Điểm thống nhất thứ hai]
- [Các cam kết hoặc bước tiếp theo đã được hai bên đồng ý]

---

### 4. Kế hoạch triển khai dự kiến

| Chi tiết công việc | Phụ trách thực hiện |
|---|---|
| [Công việc cụ thể 1] | [Tên người / đơn vị] |
| [Công việc cụ thể 2] | [Tên người / đơn vị] |
| [Công việc cụ thể 3] | [Tên người / đơn vị] |

---

*Trân trọng*

---

**Lưu ý quan trọng khi tạo biên bản:**
- Chỉ ghi những gì thực sự được đề cập trong transcript — không thêm thông tin không có
- Nếu transcript không đề cập hình thức họp, ghi "Không rõ"
- Giữ nguyên tên người, tên công ty, số liệu cụ thể từ transcript
- Bảng "Kế hoạch triển khai" chỉ ghi các đầu việc cụ thể được phân công, không ghi chung chung
- Phần "Kết luận" tóm tắt kết quả thực sự đạt được, không lặp lại nội dung trao đổi`;


const STEPS = ['Thông tin cuộc họp', 'Ghi chép', 'Biên bản', 'Hoàn thành'];

interface FileResult {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  text: string | null;
  errorMsg: string | null;
}

interface SpecialistWorkflowPageProps {
  navigate: (path: string) => void;
  user: AuthUser;
}

export default function SpecialistWorkflowPage({ navigate, user }: SpecialistWorkflowPageProps) {
  const pendingRef = useRef(takePendingUpload());

  // Step: 1=Info, 2=Transcription, 3=Minutes, 4=Done
  const [step, setStep] = useState(1);

  const [files] = useState<File[]>(() => pendingRef.current?.files ?? []);
  const [audioLanguage] = useState<AudioLanguage>(() => {
    if (pendingRef.current) return pendingRef.current.language;
    const stored = sessionStorage.getItem(SESSION_KEY_MEETING_LANGUAGE) as AudioLanguage | null;
    sessionStorage.removeItem(SESSION_KEY_MEETING_LANGUAGE);
    return stored ?? 'vi';
  });

  // Transcription state
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const resultsRef = useRef<(string | null)[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);      // raw combined
  const [effectiveTranscript, setEffectiveTranscript] = useState<string | null>(null); // AI-synthesized or raw
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);

  // Meeting info
  const [info, setInfo] = useState<MeetingInfo>(() =>
    loadMeetingInfoDraft() ?? {
      companyName: '',
      companyAddress: '',
      meetingDatetime: '',
      meetingLocation: '',
      participants: [],
      recipientEmails: [],
    }
  );

  // Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_SPECIALIST_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Email state
  const [emailSendState, setEmailSendState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const [emailSentCount, setEmailSentCount] = useState(0);

  // Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto email subject
  const emailSubject = (() => {
    const parts = ['Biên bản cuộc họp'];
    if (info.companyName) parts.push(info.companyName);
    if (info.meetingDatetime) parts.push(info.meetingDatetime);
    else parts.push(new Date().toISOString().slice(0, 10));
    return parts.join(' - ');
  })();

  // Redirect nếu không có file
  useEffect(() => {
    if (files.length === 0) navigate('/meeting');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInfoChange = useCallback((next: MeetingInfo) => {
    setInfo(next);
    saveMeetingInfoDraft(next);
  }, []);

  // ── Step 2: Transcribe + auto-synthesize ──────────────────────────────────
  const handleStartTranscribe = useCallback(async () => {
    if (files.length === 0) return;

    setErrorMsg(null);

    // Quota check
    try {
      const quotaRes = await authFetch('/quota');
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        if (quotaData.remaining === 0) {
          setErrorMsg('Bạn đã hết lượt hôm nay. Vui lòng nâng cấp để tiếp tục.');
          return;
        }
      }
    } catch { /* quota check thất bại → tiếp tục, server sẽ chặn sau */ }

    setIsTranscribing(true);
    resultsRef.current = new Array(files.length).fill(null);

    const initial: FileResult[] = files.map(f => ({
      name: f.name, status: 'pending', text: null, errorMsg: null,
    }));
    setFileResults(initial);
    setStep(2);

    const orderedResults: (string | null)[] = new Array(files.length).fill(null);

    // Chạy song song
    await Promise.all(
      files.map(async (file, i) => {
        setFileResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r));
        try {
          const text = await transcribeBasic(
            file,
            audioLanguage,
            undefined,
            { feature: 'minutes', actionType: 'transcribe-basic', metadata: { fileName: file.name } },
            user.userId,
          );
          orderedResults[i] = text;
          resultsRef.current[i] = text;
          setFileResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'done', text } : r));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Lỗi phiên âm.';
          setFileResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', errorMsg: msg } : r));
        }
      })
    );

    setIsTranscribing(false);

    const successPairs = files
      .map((f, i) => orderedResults[i] ? { name: f.name, text: orderedResults[i]! } : null)
      .filter(Boolean) as { name: string; text: string }[];

    if (successPairs.length === 0) {
      setErrorMsg('Tất cả file đều lỗi phiên âm. Vui lòng thử lại.');
      setStep(1);
      return;
    }

    // Gộp raw
    const raw = successPairs.length === 1
      ? successPairs[0].text
      : successPairs.map((p, i) => `**[File ${i + 1}/${successPairs.length}: ${p.name}]**\n\n${p.text}`).join('\n\n---\n\n');
    setTranscription(raw);

    // Lưu transcription vào DB (nền)
    void (async () => {
      try {
        const res = await authFetch('/transcriptions', {
          method: 'POST',
          body: JSON.stringify({
            file_name: files.length > 1
              ? `${files[0].name} (+${files.length - 1} files)`
              : files[0].name,
            file_size: files.reduce((s, f) => s + f.size, 0),
            transcription_text: raw,
          }),
        });
        if (res.ok) {
          const row = await res.json();
          setTranscriptionId(row.id);
          window.dispatchEvent(new Event('quota-updated'));
        }
      } catch { /* DB lỗi không block flow */ }
    })();

    // Tổng hợp AI nếu nhiều file
    if (successPairs.length > 1) {
      setIsSynthesizing(true);
      try {
        const synthesized = await synthesizeTranscriptions(
          successPairs,
          { feature: 'minutes', actionType: 'other', metadata: { mode: 'synthesize', fileCount: successPairs.length } },
          user.userId,
        );
        setEffectiveTranscript(synthesized);
      } catch {
        // Nếu tổng hợp thất bại, dùng raw
        setEffectiveTranscript(raw);
        setErrorMsg('Không thể tổng hợp tự động. Đang dùng bản ghép thô.');
      } finally {
        setIsSynthesizing(false);
      }
    } else {
      setEffectiveTranscript(raw);
    }
  }, [files, audioLanguage, user.userId]);

  // ── Step 3: Generate summary ───────────────────────────────────────────────
  const handleGenerateSummary = useCallback(async () => {
    const src = effectiveTranscript;
    if (!src) return;
    setStep(3);
    setIsSummarizing(true);
    setErrorMsg(null);
    setSummary(null);

    const customPrompt = buildSpecialistPrompt({ info, templatePrompt: summaryPrompt });
    try {
      const result = await summarizeTranscript(
        src,
        customPrompt,
        { feature: 'minutes', actionType: 'minutes-generate', metadata: { mode: 'specialist' } },
        user.userId,
      );
      setSummary(result);

      // Lưu summary vào DB (nền)
      if (transcriptionId) {
        void authFetch('/summaries', {
          method: 'POST',
          body: JSON.stringify({
            transcription_id: transcriptionId,
            summary_text: result,
            prompt_used: customPrompt,
          }),
        });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi tạo biên bản.');
    } finally {
      setIsSummarizing(false);
    }
  }, [effectiveTranscript, info, summaryPrompt, transcriptionId, user.userId]);

  const handleRegenerateSummary = useCallback(async () => {
    const src = effectiveTranscript;
    if (!src) return;
    setIsSummarizing(true);
    setErrorMsg(null);

    const customPrompt = buildSpecialistPrompt({ info, templatePrompt: summaryPrompt });
    try {
      const result = await summarizeTranscript(
        src,
        customPrompt,
        { feature: 'minutes', actionType: 'minutes-generate', metadata: { mode: 'specialist-regen' } },
        user.userId,
      );
      setSummary(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi tạo lại biên bản.');
    } finally {
      setIsSummarizing(false);
    }
  }, [effectiveTranscript, info, summaryPrompt, user.userId]);

  // ── Step 4: Export & Email ─────────────────────────────────────────────────
  const handleExportPdf = () => {
    if (!summary) return;
    downloadAsPdf(summary);
  };

  const handleExportDocx = async () => {
    if (!summary) return;
    const filename = files[0]?.name
      ? `bien-ban-${files[0].name.replace(/\.[^/.]+$/, '')}.docx`
      : `bien-ban-${new Date().toISOString().slice(0, 10)}.docx`;
    await downloadAsDocx(summary, filename);
  };

  const handleSendEmail = async () => {
    if (!summary || info.recipientEmails.length === 0) return;
    setEmailSendState('loading');
    setEmailError('');
    try {
      const resp = await authFetch('/email/send-minutes', {
        method: 'POST',
        body: JSON.stringify({
          recipients: info.recipientEmails,
          subject: emailSubject,
          minutesMarkdown: summary,
          mindmapPng: null,
          meetingInfo: {
            companyName: info.companyName,
            companyAddress: info.companyAddress,
            meetingDatetime: info.meetingDatetime,
            meetingLocation: info.meetingLocation,
            participants: info.participants,
          },
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Gửi thất bại');
      }
      setEmailSendState('success');
      setEmailSentCount(info.recipientEmails.length);
    } catch (err: unknown) {
      setEmailSendState('error');
      setEmailError(err instanceof Error ? err.message : 'Gửi thất bại. Vui lòng thử lại.');
    }
  };

  const handleNewSession = () => {
    clearMeetingInfoDraft();
    navigate('/meeting');
  };

  const doneCount = fileResults.filter(r => r.status === 'done').length;
  const errorCount = fileResults.filter(r => r.status === 'error').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Thư ký họp - Biên bản cuộc họp</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nhập thông tin, ghi chép và tạo biên bản cuộc họp chuyên nghiệp.
          </p>
        </div>

        <WorkflowStepHeader
          currentStep={step}
          steps={STEPS}
          onStepClick={(s) => {
            // Bước 2 là đang phiên âm — không quay lại
            if (s === 2) return;
            if (s < step) setStep(s);
          }}
        />

        {errorMsg && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* ── Step 1: Meeting info ── */}
        {step === 1 && (
          <MeetingInfoForm
            initialValue={info}
            onChange={handleInfoChange}
            onContinue={handleStartTranscribe}
            onSkip={handleStartTranscribe}
            labels={{ companyName: 'Tiêu đề cuộc họp', companyAddress: 'Địa điểm' }}
          />
        )}

        {/* ── Step 2: Parallel transcription ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Progress header — chỉ hiện khi đang chạy */}
            {(isTranscribing || isSynthesizing) && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-sm font-medium text-slate-700">
                      {isSynthesizing
                        ? `Đang tổng hợp ${files.length} file bằng AI…`
                        : `Đang ghi chép song song ${files.length} file…`}
                    </span>
                  </div>
                  {!isSynthesizing && (
                    <span className="text-xs text-slate-400">
                      {doneCount}/{files.length} xong{errorCount > 0 ? `, ${errorCount} lỗi` : ''}
                    </span>
                  )}
                </div>

                {/* Per-file status */}
                {!isSynthesizing && fileResults.map((result, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                      {result.status === 'pending' && (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                      )}
                      {result.status === 'running' && (
                        <div className="w-4 h-4 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      {result.status === 'done' && (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {result.status === 'error' && (
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm font-medium text-slate-700 truncate flex-1">{result.name}</span>
                      <span className={`text-xs font-medium shrink-0 ${
                        result.status === 'done' ? 'text-emerald-600' :
                        result.status === 'error' ? 'text-red-500' :
                        result.status === 'running' ? 'text-[#1E3A8A]' : 'text-slate-400'
                      }`}>
                        {result.status === 'pending' ? 'Chờ…' :
                         result.status === 'running' ? 'Đang ghi chép…' :
                         result.status === 'done' ? 'Xong' : 'Lỗi'}
                      </span>
                    </div>
                    {result.status === 'done' && result.text && (
                      <div className="px-5 py-4 max-h-48 overflow-y-auto">
                        <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{result.text}</p>
                      </div>
                    )}
                    {result.status === 'error' && result.errorMsg && (
                      <div className="px-5 py-3 text-xs text-red-600">{result.errorMsg}</div>
                    )}
                  </div>
                ))}

                {isSynthesizing && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
                    <p className="text-xs text-slate-400">AI đang đọc và tổng hợp nội dung từ nhiều file thành một bản nhất quán…</p>
                  </div>
                )}
              </>
            )}

            {/* Khi ghi chép xong — hiển thị nội dung + nút Tạo biên bản */}
            {!isTranscribing && !isSynthesizing && effectiveTranscript && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <h2 className="text-base font-semibold text-slate-800">Nội dung ghi chép</h2>
                    </div>
                    {files.length > 1 && (
                      <span className="text-xs text-slate-400">{files.length} file đã tổng hợp</span>
                    )}
                  </div>
                  <div className="px-6 py-4 max-h-[520px] overflow-y-auto">
                    <TranscriptionView text={effectiveTranscript} userId={user.userId} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(v => !v)}
                    className="text-sm font-medium text-[#1E3A8A] hover:text-[#1E40AF] transition-colors"
                  >
                    {showPromptEditor ? 'Ẩn' : 'Chỉnh sửa'} prompt tạo biên bản
                  </button>
                  {showPromptEditor && (
                    <textarea
                      value={summaryPrompt}
                      onChange={e => setSummaryPrompt(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none font-mono resize-none"
                    />
                  )}
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <p className="text-sm text-slate-600">Ghi chép hoàn tất. Bấm để tạo biên bản cuộc họp.</p>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      className="px-6 py-3 bg-[#1E3A8A] text-white font-medium rounded-xl shadow-sm hover:bg-[#1E40AF] transition-all"
                    >
                      Tạo biên bản
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Biên bản ── */}
        {step === 3 && (
          <div className="space-y-6">
            {isSummarizing && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-3">
                <div className="animate-spin w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-medium text-slate-600">Đang tạo biên bản…</p>
              </div>
            )}

            {summary && !isSummarizing && (
              <>
                {/* BB content */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-base font-semibold text-slate-800">Biên bản cuộc họp</h2>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        Xuất PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleExportDocx}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        Xuất DOCX
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-6 min-h-[400px]">
                    <TranscriptionView text={summary} userId={user.userId} />
                  </div>
                </div>

                {/* Tạo lại + Hoàn thành */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(v => !v)}
                    className="text-sm font-medium text-[#1E3A8A] hover:text-[#1E40AF] transition-colors"
                  >
                    {showPromptEditor ? 'Ẩn' : 'Chỉnh sửa'} prompt tạo biên bản
                  </button>
                  {showPromptEditor && (
                    <textarea
                      value={summaryPrompt}
                      onChange={e => setSummaryPrompt(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none font-mono resize-none"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRegenerateSummary}
                    disabled={isSummarizing}
                    className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                  >
                    Tạo lại biên bản
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-6 py-3 bg-[#1E3A8A] text-white font-medium rounded-xl shadow-sm hover:bg-[#1E40AF] transition-all"
                  >
                    Hoàn thành →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Hoàn thành — ghi chép + BB + sơ đồ ── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* 1. Nội dung ghi chép */}
            {effectiveTranscript && (
              <details className="group bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <summary className="px-6 py-4 flex items-center justify-between cursor-pointer select-none list-none">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">1</span>
                    <h2 className="text-base font-semibold text-slate-800">Nội dung ghi chép</h2>
                    {files.length > 1 && (
                      <span className="text-xs text-slate-400 ml-1">{files.length} file</span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 py-4 border-t border-slate-100 max-h-[400px] overflow-y-auto">
                  <TranscriptionView text={effectiveTranscript} userId={user.userId} />
                </div>
              </details>
            )}

            {/* 2. Biên bản cuộc họp */}
            {summary && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#1E3A8A] text-xs font-bold flex items-center justify-center">2</span>
                    <h2 className="text-base font-semibold text-slate-800">Biên bản cuộc họp</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Xuất PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDocx}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Xuất DOCX
                    </button>
                  </div>
                </div>
                <div className="px-6 py-6">
                  <TranscriptionView text={summary} userId={user.userId} />
                </div>

                {/* Prompt editor + regenerate */}
                <div className="px-6 pb-4 border-t border-slate-100 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(v => !v)}
                    className="text-sm font-medium text-[#1E3A8A] hover:text-[#1E40AF] transition-colors"
                  >
                    {showPromptEditor ? 'Ẩn' : 'Chỉnh sửa'} prompt
                  </button>
                  {showPromptEditor && (
                    <textarea
                      value={summaryPrompt}
                      onChange={e => setSummaryPrompt(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none font-mono resize-none"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRegenerateSummary}
                    disabled={isSummarizing}
                    className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                  >
                    {isSummarizing ? 'Đang tạo lại…' : 'Tạo lại biên bản'}
                  </button>
                </div>
              </div>
            )}

            {/* 3. Sơ đồ tư duy */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-base font-semibold text-slate-800">Sơ đồ tư duy</h2>
              </div>
              <div className="px-6 py-6 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-slate-500">Tạo sơ đồ tư duy từ nội dung biên bản để dễ theo dõi các điểm chính.</p>
                <button
                  type="button"
                  onClick={() => navigate('/mindmap')}
                  className="px-5 py-2.5 text-sm font-medium bg-[#1E3A8A] text-white rounded-xl shadow-sm hover:bg-[#1E40AF] transition-all"
                >
                  Tạo sơ đồ tư duy
                </button>
              </div>
            </div>

            {/* Email */}
            {info.recipientEmails.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Gửi biên bản qua email</h3>
                <p className="text-xs text-slate-500">
                  Gửi tới: {info.recipientEmails.join(', ')}
                </p>
                {emailSendState === 'success' ? (
                  <p className="text-sm text-emerald-600 font-medium">
                    Đã gửi thành công đến {emailSentCount} người nhận.
                  </p>
                ) : (
                  <>
                    {emailSendState === 'error' && (
                      <p className="text-xs text-red-600">{emailError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={emailSendState === 'loading' || !summary}
                      className="px-5 py-2.5 text-sm font-medium bg-[#1E3A8A] text-white rounded-xl shadow-sm hover:bg-[#1E40AF] transition-all disabled:opacity-50"
                    >
                      {emailSendState === 'loading' ? 'Đang gửi…' : 'Gửi email'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                ← Xem biên bản
              </button>
              <button
                type="button"
                onClick={handleNewSession}
                className="px-5 py-2.5 text-sm font-medium bg-[#1E3A8A] text-white rounded-xl shadow-sm hover:bg-[#1E40AF] transition-all"
              >
                Cuộc họp mới
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
