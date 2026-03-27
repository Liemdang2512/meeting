import React, { useState, useEffect, useRef } from 'react';
import { takePendingUpload } from '../shared/fileStore';
import { SESSION_KEY_MEETING_LANGUAGE } from '../shared/sessionKeys';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { AuthUser } from '../../../lib/auth';
import type { OfficerInfo } from '../../minutes/types';
import { loadOfficerDraft } from '../../minutes/storage';
import { OfficerInfoForm } from './OfficerInfoForm';
import { buildOfficerPrompt } from './officerPrompt';
import { WorkflowStepHeader } from '../../../components/workflows/WorkflowStepHeader';
import { TranscriptionView } from '../../../components/TranscriptionView';
import { transcribeBasic } from '../../../services/geminiService';
import type { AudioLanguage } from '../../../services/geminiService';

interface OfficerWorkflowPageProps {
  navigate?: (path: string) => void;
  user?: AuthUser;
}

type Step = 1 | 2 | 3;

const OFFICER_STEP_LABELS = ['Thông tin vụ án', 'Phiên âm', 'Kết quả'];

function defaultOfficerInfo(): OfficerInfo {
  return { title: '', presiding: '', courtSecretary: '', participants: [], datetime: '', location: '' };
}

const DEFAULT_OFFICER_PROMPT =
  'Hãy tạo biên bản phiên toà/hồ sơ pháp lý hoàn chỉnh, chuyên nghiệp dựa trên nội dung transcript. Bao gồm: tiêu đề, thông tin phiên toà, nội dung xét xử/thảo luận, và kết luận/quyết định.';

const OFFICER_SYSTEM_HINT =
  'Đây là phiên toà/hội nghị pháp lý. Ưu tiên tên cán bộ, điều luật, và tuyên bố chính thức.';

export default function OfficerWorkflowPage({ navigate, user }: OfficerWorkflowPageProps = {}) {
  const pendingRef = useRef(takePendingUpload());
  const [step, setStep] = useState<Step>(1);
  const [files] = useState<File[]>(() => pendingRef.current?.files ?? []);
  const [audioLanguage] = useState<AudioLanguage>(() => {
    if (pendingRef.current) return pendingRef.current.language;
    const stored = sessionStorage.getItem(SESSION_KEY_MEETING_LANGUAGE) as AudioLanguage | null;
    sessionStorage.removeItem(SESSION_KEY_MEETING_LANGUAGE);
    return stored ?? 'vi';
  });
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [info, setInfo] = useState<OfficerInfo>(() => loadOfficerDraft() ?? defaultOfficerInfo());
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState(DEFAULT_OFFICER_PROMPT);

  // Redirect về landing nếu không có file
  useEffect(() => {
    if (files.length === 0) {
      navigate?.('/meeting');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTranscribe = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsTranscribing(true);
    setStep(2);

    const results: string[] = [];
    try {
      for (const file of files) {
        const result = await transcribeBasic(
          file,
          audioLanguage,
          undefined,
          undefined,
          user?.userId,
          OFFICER_SYSTEM_HINT,
        );
        results.push(result);
      }
      setTranscription(results.join('\n\n---\n\n'));
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Phiên âm thất bại. Vui lòng thử lại.');
      setStep(1);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSummarize = async () => {
    if (!transcription) return;
    setError(null);
    setIsSummarizing(true);
    try {
      const { summarizeTranscript } = await import('../../../services/geminiService');
      const prompt = buildOfficerPrompt({ info, templatePrompt });
      const result = await summarizeTranscript(transcription, prompt, undefined, user?.userId);
      setSummary(result);
    } catch (err: any) {
      setError(err.message || 'Tổng hợp thất bại. Kiểm tra kết nối và thử lại.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <WorkflowStepHeader currentStep={step} steps={OFFICER_STEP_LABELS} />

        {/* Step 1: Officer Info Form */}
        {step === 1 && (
          <>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <OfficerInfoForm
              value={info}
              onChange={setInfo}
              onContinue={handleStartTranscribe}
              onSkip={handleStartTranscribe}
            />
          </>
        )}

        {/* Step 2: Transcribing */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              <p className="text-sm text-slate-500">Đang phiên âm...</p>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && (
          <div className="space-y-6">
            {transcription && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Nội dung phiên âm</h2>
                <TranscriptionView text={transcription} userId={user?.userId} />
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Kết quả tổng hợp</h2>

              <div>
                <button
                  type="button"
                  onClick={() => setShowPromptEditor((v) => !v)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPromptEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Tùy chỉnh prompt
                </button>
                {showPromptEditor && (
                  <textarea
                    value={templatePrompt}
                    onChange={(e) => setTemplatePrompt(e.target.value)}
                    className="mt-3 w-full min-h-[120px] px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono resize-y bg-slate-50 focus:outline-none"
                  />
                )}
              </div>

              {error && <div className="text-sm text-red-700">{error}</div>}

              {summary ? (
                <div className="space-y-4">
                  <TranscriptionView text={summary} userId={user?.userId} />
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Sửa thông tin
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSummary(null); setError(null); }}
                      className="px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Tạo lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSummarize}
                    disabled={isSummarizing || !transcription}
                    className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1E40AF] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSummarizing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSummarizing ? 'Đang tổng hợp...' : 'Tổng hợp'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
