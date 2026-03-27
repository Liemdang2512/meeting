import React, { useState, useEffect, useRef } from 'react';
import { takePendingUpload } from '../shared/fileStore';
import { SESSION_KEY_MEETING_LANGUAGE } from '../shared/sessionKeys';
import { Loader2 } from 'lucide-react';
import type { AuthUser } from '../../../lib/auth';
import type { ReporterInfo } from '../../minutes/types';
import { loadReporterDraft } from '../../minutes/storage';
import { WorkflowStepHeader } from '../../../components/workflows/WorkflowStepHeader';
import { TranscriptionView } from '../../../components/TranscriptionView';
import { ReporterInfoForm } from './ReporterInfoForm';
import { buildReporterPrompt } from './reporterPrompt';
import {
  transcribeBasic,
  transcribeDeep,
  summarizeTranscript,
} from '../../../services/geminiService';
import type { AudioLanguage } from '../../../services/geminiService';
import type { TokenLoggingContext } from '../../../types';

interface ReporterWorkflowPageProps {
  navigate: (path: string) => void;
  user: AuthUser;
}

type Step = 1 | 2 | 3;

const REPORTER_SYSTEM_HINT =
  'Đây là phỏng vấn báo chí. Ưu tiên tên người, tổ chức, câu hỏi và câu trả lời.';

const DEFAULT_REPORTER_PROMPT =
  'Hãy tạo một bài phỏng vấn/báo chí hoàn chỉnh, chuyên nghiệp dựa trên nội dung transcript. Bao gồm: tiêu đề, giới thiệu, nội dung phỏng vấn dạng hỏi-đáp, và kết luận.';

const STEP_LABELS = ['Thông tin', 'Phiên âm', 'Kết quả'];

function defaultReporterInfo(): ReporterInfo {
  return { interviewTitle: '', guestName: '', reporter: '', datetime: '', location: '' };
}

export default function ReporterWorkflowPage({ navigate, user }: ReporterWorkflowPageProps) {
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
  const [deepProgress, setDeepProgress] = useState<{ step: number; label: string } | null>(null);
  const [info, setInfo] = useState<ReporterInfo>(() => loadReporterDraft() ?? defaultReporterInfo());
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState(DEFAULT_REPORTER_PROMPT);

  // Redirect về landing nếu không có file
  useEffect(() => {
    if (files.length === 0) {
      navigate('/meeting');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setTranscription(null);
    setIsTranscribing(true);
    setStep(2);

    const loggingContext: TokenLoggingContext = {
      feature: 'minutes',
      actionType: 'transcribe-basic',
      metadata: {},
    };

    const orderedResults: (string | null)[] = new Array(files.length).fill(null);
    const errors: { index: number; message: string }[] = [];

    await Promise.all(
      files.map(async (file, i) => {
        try {
          const resultText = await transcribeBasic(
            file,
            audioLanguage,
            undefined,
            loggingContext,
            user.userId,
            REPORTER_SYSTEM_HINT,
          );
          orderedResults[i] = resultText;
        } catch (err: any) {
          errors.push({ index: i, message: err.message || 'Có lỗi xảy ra.' });
        }
      })
    );

    setIsTranscribing(false);
    setDeepProgress(null);

    if (errors.length === files.length) {
      setError(`Lỗi phiên âm: ${errors[0].message}`);
      setStep(1);
      return;
    }

    const combined = orderedResults.filter(Boolean).join('\n\n---\n\n');
    setTranscription(combined);
    setStep(3);
  };

  const handleSummarize = async () => {
    if (!transcription) return;
    setError(null);
    setIsSummarizing(true);
    setSummary(null);
    try {
      const loggingContext: TokenLoggingContext = {
        feature: 'minutes',
        actionType: 'minutes-generate',
        metadata: {},
      };
      const customPrompt = buildReporterPrompt({ info, templatePrompt });
      const result = await summarizeTranscript(transcription, customPrompt, loggingContext, user.userId);
      setSummary(result);
    } catch (err: any) {
      setError(`Lỗi tổng hợp: ${err.message || 'Không thể tạo bài viết.'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <WorkflowStepHeader currentStep={step} steps={STEP_LABELS} />

        {/* Step 1: Info Form */}
        {step === 1 && (
          <>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <ReporterInfoForm
              value={info}
              onChange={setInfo}
              onContinue={handleStartConvert}
              onSkip={handleStartConvert}
            />
          </>
        )}

        {/* Step 2: Transcribing */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-[#1E3A8A] animate-spin" />
              <p className="text-base font-medium text-slate-700">
                {deepProgress ? deepProgress.label : 'Đang phiên âm...'}
              </p>
              {deepProgress && (
                <p className="text-sm text-slate-400">Bước {deepProgress.step}/3</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <button
                type="button"
                onClick={() => setShowPromptEditor((v) => !v)}
                className="text-sm font-semibold text-[#1E3A8A] hover:text-[#1E40AF] transition-colors"
              >
                {showPromptEditor ? 'Ẩn tùy chỉnh prompt' : 'Tùy chỉnh prompt'}
              </button>
              {showPromptEditor && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Prompt tạo bài viết</label>
                  <textarea
                    value={templatePrompt}
                    onChange={(e) => setTemplatePrompt(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white resize-vertical"
                  />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {!summary && !isSummarizing && (
                  <button
                    type="button"
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1E40AF] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tổng hợp bài phỏng vấn
                  </button>
                )}
                {summary && !isSummarizing && (
                  <button
                    type="button"
                    onClick={handleSummarize}
                    className="px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Tạo lại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Quay lại form
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {isSummarizing && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
                  <p className="text-base font-medium text-slate-700">Đang tổng hợp bài viết...</p>
                </div>
              </div>
            )}

            {summary && !isSummarizing && (
              <div className="h-[600px]">
                <TranscriptionView text={summary} userId={user.userId} />
              </div>
            )}

            {transcription && !summary && !isSummarizing && (
              <div className="h-[400px]">
                <TranscriptionView text={transcription} userId={user.userId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
