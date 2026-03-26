import React, { useState } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { AuthUser } from '../../../lib/auth';
import type { OfficerInfo } from '../../minutes/types';
import { loadOfficerDraft } from '../../minutes/storage';
import { OfficerInfoForm } from './OfficerInfoForm';
import { buildOfficerPrompt } from './officerPrompt';
import { WorkflowStepHeader } from '../../../components/workflows/WorkflowStepHeader';
import { FileUpload } from '../../../components/FileUpload';
import { TranscriptionView } from '../../../components/TranscriptionView';
import { transcribeBasic, transcribeDeep } from '../../../services/geminiService';
import type { AudioLanguage } from '../../../services/geminiService';

interface OfficerWorkflowPageProps {
  navigate?: (path: string) => void;
  user?: AuthUser;
}

type Step = 1 | 2 | 3 | 4; // upload | transcribe | form | result

function defaultOfficerInfo(): OfficerInfo {
  return {
    title: '',
    presiding: '',
    courtSecretary: '',
    participants: [],
    datetime: '',
    location: '',
  };
}

const DEFAULT_OFFICER_PROMPT =
  'Hãy tạo biên bản phiên toà/hồ sơ pháp lý hoàn chỉnh, chuyên nghiệp dựa trên nội dung transcript. Bao gồm: tiêu đề, thông tin phiên toà, nội dung xét xử/thảo luận, và kết luận/quyết định.';

const OFFICER_SYSTEM_HINT =
  'Đây là phiên toà/hội nghị pháp lý. Ưu tiên tên cán bộ, điều luật, và tuyên bố chính thức.';

export default function OfficerWorkflowPage({ navigate: _navigate, user }: OfficerWorkflowPageProps = {}) {
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<('idle' | 'processing' | 'done' | 'error')[]>([]);
  const [transcribeMode, setTranscribeMode] = useState<'basic' | 'deep'>('basic');
  const [audioLanguage, setAudioLanguage] = useState<AudioLanguage>('vi');
  const [customLanguage, setCustomLanguage] = useState('');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [deepProgress, setDeepProgress] = useState<{ step: number; label: string } | null>(null);
  const [info, setInfo] = useState<OfficerInfo>(() => loadOfficerDraft() ?? defaultOfficerInfo());
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState(DEFAULT_OFFICER_PROMPT);

  const handleAddFiles = (newFiles: File[]) => {
    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      setFileStatuses(updated.map(() => 'idle'));
      return updated;
    });
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartTranscribe = async () => {
    if (files.length === 0) {
      setError('Vui lòng chọn ít nhất một file âm thanh.');
      return;
    }
    setError(null);
    setIsTranscribing(true);
    setDeepProgress(null);
    setStep(2);

    const statuses: ('idle' | 'processing' | 'done' | 'error')[] = files.map(() => 'idle');
    setFileStatuses([...statuses]);

    const results: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        statuses[i] = 'processing';
        setFileStatuses([...statuses]);

        if (transcribeMode === 'basic') {
          const result = await transcribeBasic(
            files[i],
            audioLanguage,
            audioLanguage === 'other' ? customLanguage : undefined,
            undefined,
            user?.userId,
            OFFICER_SYSTEM_HINT,
          );
          results.push(result);
        } else {
          const result = await transcribeDeep(
            files[i],
            (stepNum, label) => setDeepProgress({ step: stepNum, label }),
            audioLanguage,
            audioLanguage === 'other' ? customLanguage : undefined,
            undefined,
            user?.userId,
            OFFICER_SYSTEM_HINT,
          );
          results.push(result);
        }

        statuses[i] = 'done';
        setFileStatuses([...statuses]);
      }

      const combined = results.join('\n\n---\n\n');
      setTranscription(combined);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Phiên âm thất bại. Vui lòng thử lại hoặc chọn chế độ khác.');
      const updatedStatuses = statuses.map((s) => (s === 'processing' ? 'error' : s));
      setFileStatuses([...updatedStatuses]);
    } finally {
      setIsTranscribing(false);
      setDeepProgress(null);
    }
  };

  const handleSummarize = async () => {
    if (!transcription) return;
    setError(null);
    setIsSummarizing(true);
    try {
      const { summarizeTranscript } = await import('../../../services/geminiService');
      const prompt = buildOfficerPrompt({ info, templatePrompt });
      const result = await summarizeTranscript(
        transcription,
        prompt,
        undefined,
        user?.userId,
      );
      setSummary(result);
    } catch (err: any) {
      setError(err.message || 'Tổng hợp thất bại. Kiểm tra kết nối và thử lại.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRegenerateSummary = () => {
    setSummary(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <WorkflowStepHeader currentStep={step} />

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-800">Upload file âm thanh</h2>
                <p className="text-sm text-slate-600">
                  Tải lên file ghi âm phiên toà hoặc hội nghị pháp lý để bắt đầu phiên âm.
                </p>
              </div>

              <FileUpload
                pendingFiles={files}
                onAddFiles={handleAddFiles}
                onRemoveFile={handleRemoveFile}
                onStartConvert={handleStartTranscribe}
                fileStatuses={fileStatuses}
                disabled={false}
                showStartButton={false}
              />

              {/* Transcribe Mode */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Chế độ phiên âm</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTranscribeMode('basic')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors duration-200 ${
                      transcribeMode === 'basic'
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Nhanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranscribeMode('deep')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors duration-200 ${
                      transcribeMode === 'deep'
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Chi tiết
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Ngôn ngữ phiên âm
                </label>
                <select
                  value={audioLanguage}
                  onChange={(e) => setAudioLanguage(e.target.value as AudioLanguage)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 cursor-pointer"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                  <option value="zh">Tiếng Trung</option>
                  <option value="ko">Tiếng Hàn</option>
                  <option value="ja">Tiếng Nhật</option>
                  <option value="other">--</option>
                </select>
                {audioLanguage === 'other' && (
                  <input
                    type="text"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder="Nhập tên ngôn ngữ"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white mt-2"
                  />
                )}
              </div>

              {error && <div className="text-sm text-red-700 mt-1">{error}</div>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleStartTranscribe}
                  disabled={files.length === 0}
                  className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1E40AF] transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Phiên âm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Transcribing */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Phiên âm</h2>
            {isTranscribing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
                <p className="text-sm text-slate-500">
                  {deepProgress ? deepProgress.label : 'Đang phiên âm...'}
                </p>
              </div>
            ) : transcription ? (
              <div className="space-y-4">
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                  Phiên âm hoàn tất
                </p>
                <TranscriptionView text={transcription} userId={user?.userId} />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1E40AF] transition-colors duration-200 shadow-sm"
                  >
                    Tiếp tục
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Chưa có kết quả phiên âm. Vui lòng upload file và thử lại.
              </p>
            )}
            {error && <div className="text-sm text-red-700 mt-1">{error}</div>}
          </div>
        )}

        {/* Step 3: Officer Info Form */}
        {step === 3 && (
          <OfficerInfoForm
            value={info}
            onChange={setInfo}
            onContinue={() => setStep(4)}
            onSkip={() => setStep(4)}
          />
        )}

        {/* Step 4: Result */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Transcription panel */}
            {transcription && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Nội dung phiên âm</h2>
                <TranscriptionView text={transcription} userId={user?.userId} />
              </div>
            )}

            {/* Summary panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Kết quả tổng hợp</h2>

              {/* Collapsible prompt editor */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPromptEditor((v) => !v)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-200"
                >
                  {showPromptEditor ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Tùy chỉnh prompt
                </button>
                {showPromptEditor && (
                  <textarea
                    value={templatePrompt}
                    onChange={(e) => setTemplatePrompt(e.target.value)}
                    className="mt-3 w-full min-h-[120px] px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono resize-y bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF]"
                  />
                )}
              </div>

              {error && <div className="text-sm text-red-700 mt-1">{error}</div>}

              {summary ? (
                <div className="space-y-4">
                  <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                    Tổng hợp hoàn tất
                  </p>
                  <TranscriptionView text={summary} userId={user?.userId} />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRegenerateSummary}
                      className="px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors duration-200"
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
                    className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1E40AF] transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
