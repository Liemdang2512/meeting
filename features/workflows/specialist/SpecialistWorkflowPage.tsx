import React, { useCallback, useState } from 'react';
import { FileUpload } from '../../../components/FileUpload';
import { TranscriptionView } from '../../../components/TranscriptionView';
import { WorkflowStepHeader } from '../../../components/workflows/WorkflowStepHeader';
import { MeetingInfoForm } from '../../minutes/components/MeetingInfoForm';
import { loadMeetingInfoDraft, saveMeetingInfoDraft } from '../../minutes/storage';
import type { MeetingInfo } from '../../minutes/types';
import { buildSpecialistPrompt } from './specialistPrompt';
import {
  transcribeBasic,
  transcribeDeep,
  summarizeTranscript,
  type AudioLanguage,
  type DeepProgressCallback,
} from '../../../services/geminiService';
import type { AuthUser } from '../../../lib/auth';

const DEFAULT_SPECIALIST_PROMPT =
  'Hãy tạo biên bản cuộc họp hoàn chỉnh, chuyên nghiệp dựa trên nội dung transcript. Bao gồm: tiêu đề cuộc họp, danh sách tham dự, nội dung thảo luận, kết luận, và nhiệm vụ phân công.';

const STEPS = ['Upload', 'Phiên âm', 'Thông tin', 'Kết quả'];

type TranscribeMode = 'basic' | 'deep';

interface SpecialistWorkflowPageProps {
  navigate: (path: string) => void;
  user: AuthUser;
}

export default function SpecialistWorkflowPage({ navigate: _navigate, user }: SpecialistWorkflowPageProps) {
  // Step: 1=Upload, 2=Transcription, 3=Form, 4=Result
  const [step, setStep] = useState(1);

  // Upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<('idle' | 'processing' | 'done' | 'error')[]>([]);

  // Transcription mode & language
  const [transcribeMode, setTranscribeMode] = useState<TranscribeMode>('basic');
  const [audioLanguage, setAudioLanguage] = useState<AudioLanguage>('vi');
  const [customLanguage, setCustomLanguage] = useState('');

  // Transcription result
  const [transcription, setTranscription] = useState<string | null>(null);
  const [deepProgress, setDeepProgress] = useState<{ step: number; label: string } | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Meeting info form
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

  // Summary / result state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_SPECIALIST_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Step 1: File upload handling ---
  const handleAddFiles = useCallback((files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
    setFileStatuses(prev => [...prev, ...files.map(() => 'idle' as const)]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setFileStatuses(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Step 2: Transcription ---
  const handleStartTranscribe = useCallback(async () => {
    if (pendingFiles.length === 0) return;
    const file = pendingFiles[0];

    setIsTranscribing(true);
    setErrorMsg(null);
    setDeepProgress(null);
    setFileStatuses([...Array(pendingFiles.length)].map((_, i) => (i === 0 ? 'processing' : 'idle')));
    setStep(2);

    const loggingContext = {
      feature: 'minutes' as const,
      actionType: (transcribeMode === 'deep' ? 'transcribe-deep' : 'transcribe-basic') as
        | 'transcribe-deep'
        | 'transcribe-basic',
      metadata: { fileName: file.name, mode: transcribeMode },
    };

    try {
      let resultText: string;
      if (transcribeMode === 'deep') {
        const onProgress: DeepProgressCallback = (deepStep, label) => {
          setDeepProgress({ step: deepStep, label });
        };
        resultText = await transcribeDeep(
          file,
          onProgress,
          audioLanguage,
          audioLanguage === 'other' ? customLanguage : undefined,
          loggingContext,
          user.userId,
        );
      } else {
        resultText = await transcribeBasic(
          file,
          audioLanguage,
          audioLanguage === 'other' ? customLanguage : undefined,
          loggingContext,
          user.userId,
        );
      }
      setTranscription(resultText);
      setFileStatuses([...Array(pendingFiles.length)].map(() => 'done'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi phiên âm.';
      setErrorMsg(message);
      setFileStatuses([...Array(pendingFiles.length)].map(() => 'error'));
    } finally {
      setIsTranscribing(false);
      setDeepProgress(null);
    }
  }, [pendingFiles, transcribeMode, audioLanguage, customLanguage, user.userId]);

  // --- Step 3 -> 4: Generate minutes ---
  const handleGenerateSummary = useCallback(async () => {
    if (!transcription) return;
    setIsSummarizing(true);
    setErrorMsg(null);
    setSummary(null);

    const customPrompt = buildSpecialistPrompt({ info, templatePrompt: summaryPrompt });

    try {
      const result = await summarizeTranscript(
        transcription,
        customPrompt,
        { feature: 'minutes', actionType: 'minutes-generate', metadata: { mode: 'specialist' } },
        user.userId,
      );
      setSummary(result);
      setStep(4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tạo biên bản.';
      setErrorMsg(message);
    } finally {
      setIsSummarizing(false);
    }
  }, [transcription, info, summaryPrompt, user.userId]);

  const handleRegenerateSummary = useCallback(async () => {
    if (!transcription) return;
    setIsSummarizing(true);
    setErrorMsg(null);

    const customPrompt = buildSpecialistPrompt({ info, templatePrompt: summaryPrompt });

    try {
      const result = await summarizeTranscript(
        transcription,
        customPrompt,
        { feature: 'minutes', actionType: 'minutes-generate', metadata: { mode: 'specialist-regen' } },
        user.userId,
      );
      setSummary(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tạo lại biên bản.';
      setErrorMsg(message);
    } finally {
      setIsSummarizing(false);
    }
  }, [transcription, info, summaryPrompt, user.userId]);

  const handleInfoChange = useCallback((next: MeetingInfo) => {
    setInfo(next);
    saveMeetingInfoDraft(next);
  }, []);

  // --- Language options ---
  const LANGUAGE_OPTIONS: { value: AudioLanguage; label: string }[] = [
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ko', label: '한국어' },
    { value: 'ja', label: '日本語' },
    { value: 'other', label: 'Khác' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Chuyên gia - Biên bản cuộc họp</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tải lên file âm thanh, phiên âm và tạo biên bản cuộc họp chuyên nghiệp.
          </p>
        </div>

        <WorkflowStepHeader currentStep={step} steps={STEPS} />

        {/* Error message */}
        {errorMsg && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <FileUpload
              pendingFiles={pendingFiles}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              onStartConvert={handleStartTranscribe}
              fileStatuses={fileStatuses}
              disabled={false}
              showStartButton={false}
            />

            {/* Mode selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-800 mb-3">Chế độ phiên âm</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTranscribeMode('basic')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      transcribeMode === 'basic'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Nhanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranscribeMode('deep')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      transcribeMode === 'deep'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Chuyên sâu (3 bước)
                  </button>
                </div>
              </div>

              {/* Language selector */}
              <div>
                <p className="text-sm font-medium text-slate-800 mb-3">Ngôn ngữ audio</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setAudioLanguage(lang.value)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                        audioLanguage === lang.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                    onChange={e => setCustomLanguage(e.target.value)}
                    placeholder="Nhập ngôn ngữ..."
                    className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* Start button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleStartTranscribe}
                disabled={pendingFiles.length === 0}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bắt đầu phiên âm
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Transcription in progress / completed */}
        {step === 2 && (
          <div className="space-y-6">
            {isTranscribing ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-3">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-medium text-slate-600">
                  {deepProgress ? deepProgress.label : 'Đang phiên âm...'}
                </p>
                {transcribeMode === 'deep' && deepProgress && (
                  <p className="text-xs text-slate-400">Bước {deepProgress.step}/3</p>
                )}
              </div>
            ) : transcription ? (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-800 mb-3">Kết quả phiên âm</p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans max-h-80 overflow-y-auto">
                    {transcription}
                  </pre>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl shadow-sm hover:bg-indigo-700 transition-all"
                  >
                    Tiếp tục: Nhập thông tin cuộc họp
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3: Meeting info form */}
        {step === 3 && (
          <div className="space-y-6">
            <MeetingInfoForm
              initialValue={info}
              onChange={handleInfoChange}
              onContinue={() => {
                setStep(4);
                handleGenerateSummary();
              }}
              onSkip={() => {
                setStep(4);
                handleGenerateSummary();
              }}
              labels={{
                companyName: 'Tiêu đề cuộc họp',
                companyAddress: 'Địa điểm',
              }}
            />
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && (
          <div className="space-y-6">
            {isSummarizing && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-3">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-medium text-slate-600">Đang tạo biên bản...</p>
              </div>
            )}

            {!isSummarizing && summary && (
              <div className="space-y-4">
                {/* Prompt editor toggle */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(prev => !prev)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {showPromptEditor ? 'Ẩn' : 'Chỉnh sửa'} prompt tạo biên bản
                  </button>
                  {showPromptEditor && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={summaryPrompt}
                        onChange={e => setSummaryPrompt(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none font-mono resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleRegenerateSummary}
                          disabled={isSummarizing}
                          className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
                        >
                          Tạo lại
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transcription output */}
                <TranscriptionView text={summary} />

                {/* Regenerate button */}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateSummary}
                    disabled={isSummarizing}
                    className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    Tạo lại
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
