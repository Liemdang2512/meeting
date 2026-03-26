import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { AuthUser } from '../../../lib/auth';
import type { ReporterInfo } from '../../minutes/types';
import { loadReporterDraft } from '../../minutes/storage';
import { WorkflowStepHeader } from '../../../components/workflows/WorkflowStepHeader';
import { FileUpload } from '../../../components/FileUpload';
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

type Step = 1 | 2 | 3 | 4;

const REPORTER_SYSTEM_HINT =
  'Đây là phỏng vấn báo chí. Ưu tiên tên người, tổ chức, câu hỏi và câu trả lời.';

const DEFAULT_REPORTER_PROMPT =
  'Hãy tạo một bài phỏng vấn/báo chí hoàn chỉnh, chuyên nghiệp dựa trên nội dung transcript. Bao gồm: tiêu đề, giới thiệu, nội dung phỏng vấn dạng hỏi-đáp, và kết luận.';

function defaultReporterInfo(): ReporterInfo {
  return {
    interviewTitle: '',
    guestName: '',
    reporter: '',
    datetime: '',
    location: '',
  };
}

const AUDIO_LANGUAGES: { value: AudioLanguage; label: string }[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'other', label: 'Khác' },
];

export default function ReporterWorkflowPage({ navigate: _navigate, user }: ReporterWorkflowPageProps) {
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<('idle' | 'processing' | 'done' | 'error')[]>([]);
  const [transcribeMode, setTranscribeMode] = useState<'basic' | 'deep'>('basic');
  const [audioLanguage, setAudioLanguage] = useState<AudioLanguage>('vi');
  const [customLanguage, setCustomLanguage] = useState('');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [deepProgress, setDeepProgress] = useState<{ step: number; label: string } | null>(null);
  const [info, setInfo] = useState<ReporterInfo>(() => loadReporterDraft() ?? defaultReporterInfo());
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState(DEFAULT_REPORTER_PROMPT);

  const handleAddFiles = (incoming: File[]) => {
    setFiles(prev => [...prev, ...incoming]);
    setFileStatuses(prev => [...prev, ...incoming.map(() => 'idle' as const)]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileStatuses(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setTranscription(null);
    setIsTranscribing(true);
    setStep(2);

    const initialStatuses = new Array(files.length).fill('processing') as ('idle' | 'processing' | 'done' | 'error')[];
    setFileStatuses(initialStatuses);

    const orderedResults: (string | null)[] = new Array(files.length).fill(null);
    const errors: { index: number; message: string }[] = [];

    const loggingContext: TokenLoggingContext = {
      feature: 'minutes',
      actionType: transcribeMode === 'deep' ? 'transcribe-deep' : 'transcribe-basic',
      metadata: { mode: transcribeMode },
    };

    await Promise.all(
      files.map(async (file, i) => {
        try {
          let resultText: string;
          if (transcribeMode === 'deep') {
            resultText = await transcribeDeep(
              file,
              (stepNum, label) => setDeepProgress({ step: stepNum, label }),
              audioLanguage,
              customLanguage || undefined,
              loggingContext,
              user.userId,
              REPORTER_SYSTEM_HINT,
            );
            setDeepProgress(null);
          } else {
            resultText = await transcribeBasic(
              file,
              audioLanguage,
              customLanguage || undefined,
              loggingContext,
              user.userId,
              REPORTER_SYSTEM_HINT,
            );
          }
          orderedResults[i] = resultText;
          setFileStatuses(prev => { const n = [...prev]; n[i] = 'done'; return n; });
        } catch (err: any) {
          setFileStatuses(prev => { const n = [...prev]; n[i] = 'error'; return n; });
          errors.push({ index: i, message: err.message || 'Có lỗi xảy ra.' });
        }
      })
    );

    setIsTranscribing(false);

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
        <WorkflowStepHeader currentStep={step} />

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Tải lên tệp âm thanh</h2>
              <FileUpload
                pendingFiles={files}
                onAddFiles={handleAddFiles}
                onRemoveFile={handleRemoveFile}
                onStartConvert={handleStartConvert}
                fileStatuses={fileStatuses}
                disabled={isTranscribing}
                showStartButton={false}
              />
            </div>

            {/* Transcription mode selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Chế độ phiên âm</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTranscribeMode('basic')}
                  className={`flex flex-col items-start gap-2 p-4 border transition-all text-left group rounded-xl ${
                    transcribeMode === 'basic'
                      ? 'border-slate-200 bg-slate-100 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-[#1E3A8A]'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-800">Cơ bản</span>
                  <span className="text-xs text-slate-500">Nhanh, phù hợp phỏng vấn ngắn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTranscribeMode('deep')}
                  className={`flex flex-col items-start gap-2 p-4 border transition-all text-left group rounded-xl ${
                    transcribeMode === 'deep'
                      ? 'border-slate-200 bg-[#1E3A8A]/10 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-[#1E3A8A]'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-800">Chuyên sâu</span>
                  <span className="text-xs text-slate-500">3 bước, chất lượng cao hơn</span>
                </button>
              </div>
            </div>

            {/* Language selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Ngôn ngữ âm thanh</h3>
              <div className="flex flex-wrap gap-2">
                {AUDIO_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setAudioLanguage(lang.value)}
                    className={`px-3 py-2.5 border text-xs font-medium transition-all text-left rounded-xl ${
                      audioLanguage === lang.value
                        ? 'border-slate-200 bg-slate-200 text-slate-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              {audioLanguage === 'other' && (
                <input
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="Nhập ngôn ngữ (VD: Tiếng Tây Ban Nha)"
                  className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white"
                />
              )}
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartConvert}
              disabled={files.length === 0 || isTranscribing}
              className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-base rounded-xl hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Bắt đầu phiên âm
            </button>
          </div>
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

        {/* Step 3: Form */}
        {step === 3 && (
          <div className="space-y-6">
            {transcription && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-700 mb-2">Nội dung đã phiên âm</p>
                <div className="max-h-48 overflow-y-auto text-sm text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3">
                  {transcription}
                </div>
              </div>
            )}
            <ReporterInfoForm
              value={info}
              onChange={setInfo}
              onContinue={() => setStep(4)}
              onSkip={() => setStep(4)}
            />
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Prompt editor toggle */}
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
                  onClick={() => setStep(3)}
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
