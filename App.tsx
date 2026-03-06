import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { TranscriptionStatus, FileMetadata } from './types';
import { transcribeAudio, summarizeTranscript, synthesizeTranscriptions } from './services/geminiService';
import { supabase, isSupabaseConfigured, getInitialAuthState, signOut, loadApiKeyFromAccount, saveApiKeyToAccount, type AuthState } from './lib/supabase';
import { FileUpload } from './components/FileUpload';
import { TranscriptionView } from './components/TranscriptionView';
import { Spinner } from './components/Spinner';
import { FileAudioIcon, RefreshIcon, AlertCircleIcon, DownloadIcon, CheckIcon, CopyIcon } from './components/Icons';
import { LoginPage } from './components/LoginPage';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Added readonly to match the underlying environment's definition and fix the "identical modifiers" error
    readonly aistudio: AIStudio;
  }
}

const DEFAULT_SUMMARY_PROMPT = `Dựa vào văn bản ghi chép cuộc họp ở trên, hãy tạo một BIÊN BẢN CUỘC HỌP (Meeting Minute - MOM) chuyên nghiệp theo đúng cấu trúc sau. Hãy trích xuất thông tin chính xác từ nội dung cuộc họp:

---

## MEETING MINUTE

**Chủ đề cuộc họp:** [Tóm tắt chủ đề/nội dung chính của cuộc họp]

**Mục đích cuộc họp:** [Mục tiêu chính cần đạt được trong cuộc họp]

**Thời gian:** [Ngày tháng năm nếu có thông tin, nếu không ghi "Theo file ghi âm"]

**Hình thức họp:** [Online/Offline - dựa vào nội dung để suy luận]

---

### THÀNH PHẦN THAM DỰ

| Bên A | Bên B (nếu có) |
|-------|----------------|
| [Tên - Chức vụ] | [Tên - Chức vụ] |

*(Liệt kê tất cả người tham dự được nhắc đến trong cuộc họp, nếu không rõ tên thì ghi "Người nói 1", "Người nói 2"...)*

---

### NỘI DUNG TRAO ĐỔI

Tóm tắt các nội dung chính đã thảo luận, chia theo từng chủ đề/mục:

**Nội dung 01: [Tiêu đề nội dung thảo luận 1]**

- [Chi tiết các ý chính đã trao đổi]
- [Ý kiến của từng bên]

**Nội dung 02: [Tiêu đề nội dung thảo luận 2]**

- [Chi tiết]

*(Tiếp tục với các nội dung khác...)*

---

### KẾT LUẬN

- [Tóm tắt các quyết định đã được thống nhất]
- [Các điểm đã đồng ý]
- [Phương hướng tiếp theo]

---

### KẾ HOẠCH TRIỂN KHAI

| Chi tiết công việc | Phụ trách thực hiện |
|---------------------|---------------------|
| [Công việc cần làm 1] | [Người/Bên phụ trách] |
| [Công việc cần làm 2] | [Người/Bên phụ trách] |

---

*Trân trọng*

---

**YÊU CẦU QUAN TRỌNG:**
- Trình bày bằng Markdown sạch đẹp, ngôn ngữ trang trọng, chuyên nghiệp.
- Trích xuất ĐẦY ĐỦ các ý chính, KHÔNG bỏ sót thông tin quan trọng.
- Nếu có thông tin về tên người, chức vụ, công ty, thời gian → ghi chính xác.
- Phần "Kế hoạch triển khai" phải dạng BẢNG với 2 cột: Chi tiết công việc | Phụ trách thực hiện.
- Nội dung trao đổi phải được chia thành các MỤC rõ ràng (Nội dung 01, 02, 03...).`;

function App() {
  const [authState, setAuthState] = useState<AuthState>({ session: null, user: null });
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedTranscriptions, setCompletedTranscriptions] = useState<{ name: string; text: string }[]>([]);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);

  // Prompt configuration states
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_SUMMARY_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Synthesized transcription (multi-file only)
  const [synthesizedTranscription, setSynthesizedTranscription] = useState<string | null>(null);

  // Step navigation — controls which step's content is displayed
  const [viewStep, setViewStep] = useState(1);

  // Trạng thái từng file khi xử lý song song
  const [fileStatuses, setFileStatuses] = useState<('idle' | 'processing' | 'done' | 'error')[]>([]);

  useEffect(() => {
    const init = async () => {
      // Load API key from localStorage on mount (as cache)
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        setUserApiKey(savedKey);
      }
      checkApiKey();

      // Auto-show API key input if no key is configured
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!savedKey && (!envKey || envKey === 'PLACEHOLDER_API_KEY')) {
        setShowApiKeyInput(true);
      }

      // Khởi tạo trạng thái đăng nhập
      const initialAuth = await getInitialAuthState();
      setAuthState(initialAuth);
      setAuthLoading(false);

      // Nếu đã đăng nhập, tải API key từ tài khoản Supabase
      if (initialAuth.user) {
        const accountKey = await loadApiKeyFromAccount(initialAuth.user.id);
        if (accountKey) {
          setUserApiKey(accountKey);
          localStorage.setItem('gemini_api_key', accountKey);
          setHasApiKey(true);
          setShowApiKeyInput(false);
        }
      }

      if (supabase) {
        supabase.auth.onAuthStateChange(async (_event, session) => {
          setAuthState({
            session: session,
            user: session?.user ?? null,
          });
          // Khi đăng nhập trên thiết bị mới, tự động tải API key
          if (_event === 'SIGNED_IN' && session?.user) {
            const accountKey = await loadApiKeyFromAccount(session.user.id);
            if (accountKey) {
              setUserApiKey(accountKey);
              localStorage.setItem('gemini_api_key', accountKey);
              setHasApiKey(true);
              setShowApiKeyInput(false);
            }
          }
        });
      }
    };

    init();
  }, []);

  const checkApiKey = async () => {
    // Check if running in AI Studio environment
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    } else {
      // Running in standalone mode - check localStorage first, then env variable
      const savedKey = localStorage.getItem('gemini_api_key');
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      setHasApiKey((savedKey && savedKey.length > 0) || (envKey && envKey !== 'PLACEHOLDER_API_KEY'));
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      // In standalone mode, show API key input
      setShowApiKeyInput(true);
    }
  };

  const handleSaveApiKey = async () => {
    if (userApiKey && userApiKey.trim().length > 0) {
      const trimmedKey = userApiKey.trim();
      localStorage.setItem('gemini_api_key', trimmedKey);
      setHasApiKey(true);
      setShowApiKeyInput(false);

      // Lưu API key vào tài khoản Supabase (đồng bộ qua các thiết bị)
      if (authState.user) {
        const saved = await saveApiKeyToAccount(authState.user.id, trimmedKey);
        if (saved) {
          console.log('API key đã được lưu vào tài khoản.');
        }
      }
    } else {
      alert('Vui lòng nhập API key hợp lệ');
    }
  };

  const handleAddFiles = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartConvert = () => {
    handleFilesReady(pendingFiles);
  };

  const handleFilesReady = async (files: File[]) => {
    // Kiểm tra API key THỰC SỰ hợp lệ trước khi xử lý
    const savedKey = localStorage.getItem('gemini_api_key');
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const hasValidKey = (savedKey && savedKey.trim().length > 0 && savedKey.trim() !== 'your_gemini_api_key_here') ||
      (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey !== 'your_gemini_api_key_here');

    if (!hasValidKey) {
      setShowApiKeyInput(true);
      setErrorMsg('Vui lòng nhập Gemini API Key trước khi tải file lên.');
      return;
    }

    setTranscription(null);
    setSummary(null);
    setErrorMsg(null);
    setTranscriptionId(null);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);
    setCompletedTranscriptions([]);
    setViewingIndex(0);

    // Khởi tạo tất cả file ở trạng thái 'processing'
    const initialStatuses = new Array(files.length).fill('processing') as ('idle' | 'processing' | 'done' | 'error')[];
    setFileStatuses(initialStatuses);
    setFileMeta({ name: files[0].name, size: files[0].size, type: files[0].type, lastModified: files[0].lastModified });
    setStatus(TranscriptionStatus.PROCESSING);

    // Kết quả theo thứ tự file gốc
    const orderedResults: (string | null)[] = new Array(files.length).fill(null);
    const errors: { index: number; name: string; message: string }[] = [];

    // Xử lý tất cả file song song
    await Promise.all(
      files.map(async (file, i) => {
        try {
          const resultText = await transcribeAudio(file);
          orderedResults[i] = resultText;

          // Cập nhật trạng thái file này thành done
          setFileStatuses(prev => { const n = [...prev]; n[i] = 'done'; return n; });

          // Hiển thị kết quả ngay khi file xong (theo thứ tự hoàn thành)
          setCompletedTranscriptions(prev => [...prev, { name: file.name, text: resultText }]);
          setCurrentFileIndex(prev => prev + 1);
        } catch (err: any) {
          setFileStatuses(prev => { const n = [...prev]; n[i] = 'error'; return n; });
          setCurrentFileIndex(prev => prev + 1);
          errors.push({
            index: i,
            name: file.name,
            message: err.message || 'Có lỗi xảy ra.',
          });
        }
      })
    );

    // Kiểm tra lỗi API key
    if (errors.some(e => e.message === 'API_KEY_EXPIRED')) {
      setHasApiKey(false);
      setErrorMsg('API Key không hợp lệ hoặc đã hết hạn. Vui lòng chọn lại.');
      setStatus(TranscriptionStatus.ERROR);
      return;
    }

    // Tất cả file lỗi
    if (errors.length === files.length) {
      setErrorMsg(`Lỗi xử lý tất cả ${files.length} file: ${errors[0].message}`);
      setStatus(TranscriptionStatus.ERROR);
      return;
    }

    // Một số file lỗi — tiếp tục với các file thành công
    if (errors.length > 0) {
      setErrorMsg(`Lưu ý: ${errors.length} file lỗi (${errors.map(e => e.name).join(', ')}). Tiếp tục với ${files.length - errors.length} file thành công.`);
    }

    // Xây dựng danh sách theo thứ tự file gốc
    const completedList: { name: string; text: string }[] = [];
    const allTranscriptions: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (orderedResults[i] !== null) {
        const text = orderedResults[i]!;
        completedList.push({ name: files[i].name, text });
        if (files.length > 1) {
          allTranscriptions.push(`**[File ${i + 1}/${files.length}: ${files[i].name}]**\n\n${text}`);
        } else {
          allTranscriptions.push(text);
        }
      }
    }

    // Đặt lại completedTranscriptions theo thứ tự gốc sau khi xong
    setCompletedTranscriptions(completedList);
    setViewingIndex(0);

    const combined = allTranscriptions.join('\n\n---\n\n');
    setTranscription(combined);

    // Save to Supabase if configured (lưu file đầu tiên làm đại diện)
    if (isSupabaseConfigured() && supabase && files[0]) {
      try {
        const { data, error } = await supabase
          .from('transcriptions')
          .insert({
            file_name: files.length > 1 ? `${files[0].name} (+${files.length - 1} files)` : files[0].name,
            file_size: files.reduce((sum, f) => sum + f.size, 0),
            transcription_text: combined
          } as any)
          .select()
          .single();

        if (error) {
          console.error('Error saving to Supabase:', error);
        } else if (data) {
          setTranscriptionId((data as any).id);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    setPendingFiles([]);
    setViewingIndex(0);

    // Multi-file: thêm bước tổng hợp trước khi tạo biên bản
    if (files.length > 1) {
      setStatus(TranscriptionStatus.SYNTHESIZING);
      try {
        const synthesized = await synthesizeTranscriptions(completedList);
        setSynthesizedTranscription(synthesized);
        setStatus(TranscriptionStatus.SYNTHESIZED);
        setViewStep(3); // Hiển thị bước tổng hợp
      } catch (err: any) {
        // Nếu tổng hợp thất bại, chuyển thẳng sang COMPLETED với bản ghép thô
        setErrorMsg(`Lưu ý: Không thể tổng hợp tự động (${err.message}). Đang dùng bản ghép thô.`);
        setStatus(TranscriptionStatus.COMPLETED);
        setViewStep(4); // Bước biên bản (multi-file)
      }
    } else {
      setStatus(TranscriptionStatus.COMPLETED);
      setViewStep(3); // Bước biên bản (single file)
    }
  };

  const handleGenerateSummary = async () => {
    const sourceText = synthesizedTranscription || transcription;
    if (!sourceText) return;

    setErrorMsg(null);
    setStatus(TranscriptionStatus.SUMMARIZING);

    try {
      const resultSummary = await summarizeTranscript(sourceText, summaryPrompt);
      setSummary(resultSummary);

      // Save summary to Supabase if configured and we have a transcription ID
      if (isSupabaseConfigured() && supabase && transcriptionId) {
        try {
          const { error } = await supabase
            .from('summaries')
            .insert({
              transcription_id: transcriptionId,
              summary_text: resultSummary,
              prompt_used: summaryPrompt
            } as any);

          if (error) {
            console.error('Error saving summary to Supabase:', error);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      setStatus(TranscriptionStatus.COMPLETED);
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi tạo biên bản.");
      setStatus(TranscriptionStatus.COMPLETED); // Return to completed transcription state even if summary fails
    }
  };

  // Helper to remove markdown syntax for cleaner Excel output
  const cleanMarkdownText = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/__(.*?)__/g, '$1')   // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/_(.*?)_/g, '$1')       // Italic
      .replace(/`(.*?)`/g, '$1')       // Code
      .replace(/~~(.*?)~~/g, '$1')     // Strikethrough
      .replace(/^#+\s+/gm, '')         // Headers
      .replace(/^>\s+/gm, '')          // Blockquotes
      .trim();
  };

  const handleExportExcel = () => {
    if (!summary) return;

    const wb = XLSX.utils.book_new();

    // Prepare data
    const data: any[][] = [
      ["BÁO CÁO TỔNG HỢP CUỘC HỌP"],
      [""],
      ["Tên tệp tin:", fileMeta?.name || "Unknown"],
      ["Ngày tạo:", new Date().toLocaleString('vi-VN')],
      [""],
      ["NỘI DUNG CHI TIẾT:"],
      [""],
    ];

    // Split summary by lines to put in rows
    const summaryLines = summary.split('\n');

    summaryLines.forEach(line => {
      const trimmedLine = line.trim();

      // Check if line looks like a markdown table row (starts and ends with |)
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        // It's a table row
        // Remove first and last pipe, then split by pipe
        const content = trimmedLine.substring(1, trimmedLine.length - 1);

        // Check if it's a separator line (e.g. |---|---|)
        if (content.replace(/[-:| ]/g, '') === '') {
          // Skip separator lines
          return;
        }

        const cells = content.split('|').map(cell => cleanMarkdownText(cell.trim()));
        data.push(cells);
      } else {
        // Normal text line
        data.push([cleanMarkdownText(line)]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Attempt to set column widths (optional, improves readability)
    const colWidths = [
      { wch: 10 }, // STT
      { wch: 40 }, // Nội dung
      { wch: 20 }, // Người thực hiện
      { wch: 15 }, // Thời hạn
      { wch: 30 }  // Ghi chú
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Meeting Report");

    const fileName = totalFiles > 1
      ? `Bien_ban_${totalFiles}_files_${new Date().getTime()}.xlsx`
      : fileMeta?.name
        ? `Bien_ban_${fileMeta.name.split('.')[0]}.xlsx`
        : `Bien_ban_cuoc_hop_${new Date().getTime()}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const resetApp = () => {
    setStatus(TranscriptionStatus.IDLE);
    setPendingFiles([]);
    setFileMeta(null);
    setCurrentFileIndex(0);
    setTotalFiles(0);
    setCompletedTranscriptions([]);
    setViewingIndex(0);
    setTranscription(null);
    setSynthesizedTranscription(null);
    setSummary(null);
    setErrorMsg(null);
    setViewStep(1);
    setFileStatuses([]);
  };

  const handleLogout = async () => {
    await signOut();
    // Reset toàn bộ state để quay lại trang đăng nhập ngay
    setAuthState({ session: null, user: null });
    setStatus(TranscriptionStatus.IDLE);
    setPendingFiles([]);
    setFileMeta(null);
    setCurrentFileIndex(0);
    setTotalFiles(0);
    setCompletedTranscriptions([]);
    setViewingIndex(0);
    setTranscription(null);
    setSynthesizedTranscription(null);
    setSummary(null);
    setErrorMsg(null);
    setViewStep(1);
    setFileStatuses([]);
    setUserApiKey('');
    setHasApiKey(null);
    localStorage.removeItem('gemini_api_key');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!authState.user) {
    return <LoginPage onLoginSuccess={() => { /* session listener sẽ cập nhật state */ }} />;
  }

  // Tính bước hiện tại cho step indicator
  const isMultiFile = totalFiles > 1;
  const biênBảnStep = isMultiFile ? 4 : 3;
  const isNavigableState = status === TranscriptionStatus.SYNTHESIZED || status === TranscriptionStatus.COMPLETED;

  const currentStep = (() => {
    if (isMultiFile) {
      if (status === TranscriptionStatus.IDLE) return 1;
      if (status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.READING_FILE) return 2;
      if (status === TranscriptionStatus.SYNTHESIZING || status === TranscriptionStatus.SYNTHESIZED) return 3;
      if (status === TranscriptionStatus.SUMMARIZING) return 4;
      if (status === TranscriptionStatus.COMPLETED) return summary ? 5 : 4;
      return 1;
    } else {
      if (status === TranscriptionStatus.IDLE) return 1;
      if (status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.READING_FILE) return 2;
      if (status === TranscriptionStatus.SUMMARIZING) return 3;
      if (status === TranscriptionStatus.COMPLETED) return summary ? 4 : 3;
      return 1;
    }
  })();

  const steps = isMultiFile ? [
    { n: 1, label: 'Tải lên file' },
    { n: 2, label: 'Ghi chép' },
    { n: 3, label: 'Tổng hợp' },
    { n: 4, label: 'Biên bản' },
    { n: 5, label: 'Hoàn thành' },
  ] : [
    { n: 1, label: 'Tải lên file' },
    { n: 2, label: 'Ghi chép' },
    { n: 3, label: 'Biên bản' },
    { n: 4, label: 'Hoàn thành' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header — dark blue như mẫu */}
      <header className="bg-blue-950 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <FileAudioIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Meeting Scribe Pro</h1>
              <p className="text-blue-300 text-xs leading-tight">Trợ lý AI chuyển đổi audio/video thành văn bản và lập biên bản cuộc họp tự động, chính xác</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {status !== TranscriptionStatus.IDLE && (
              <button onClick={resetApp} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <RefreshIcon className="w-3.5 h-3.5" />
                Phiên mới
              </button>
            )}
            <button onClick={handleLogout} className="text-xs text-blue-300 hover:text-white transition-colors px-2 py-1">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Step indicator — clickable cho các bước đã hoàn thành */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-[72px] z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center">
            {steps.map((step, idx) => {
              const isActivelyProcessing = status === TranscriptionStatus.PROCESSING ||
                status === TranscriptionStatus.READING_FILE ||
                status === TranscriptionStatus.SYNTHESIZING ||
                status === TranscriptionStatus.SUMMARIZING;
              const isNavigable = step.n >= 2 && step.n <= currentStep && !isActivelyProcessing;
              const isViewing = step.n === viewStep && !isActivelyProcessing && step.n > 1;
              return (
                <div key={step.n} className="flex items-center">
                  <div
                    className={`flex flex-col items-center ${isNavigable ? 'cursor-pointer group' : ''}`}
                    onClick={() => isNavigable && setViewStep(step.n)}
                    title={isNavigable ? `Xem lại: ${step.label}` : undefined}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300
                      ${currentStep > step.n ? 'bg-blue-600 text-white' : ''}
                      ${currentStep === step.n ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                      ${currentStep < step.n ? 'bg-white border-2 border-slate-300 text-slate-400' : ''}
                      ${isViewing ? 'ring-4 ring-offset-2 ring-blue-400' : ''}
                      ${isNavigable ? 'group-hover:scale-110' : ''}
                    `}>
                      {currentStep > step.n ? '✓' : step.n}
                    </div>
                    <span className={`text-xs mt-1 font-medium whitespace-nowrap transition-colors duration-300
                      ${currentStep >= step.n ? 'text-blue-700' : 'text-slate-400'}
                      ${isViewing ? 'underline underline-offset-2 font-bold' : ''}
                    `}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-24 h-0.5 mx-3 mb-5 transition-all duration-500 ${currentStep > step.n ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">



        {/* API Key Input Modal */}
        {showApiKeyInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  {localStorage.getItem('gemini_api_key') ? 'Thay đổi' : 'Cấu hình'} Gemini API Key
                </h3>
                <p className="text-slate-500 text-sm">
                  {localStorage.getItem('gemini_api_key') ? (
                    <>Cập nhật API key mới của bạn</>
                  ) : (
                    <>
                      Nhập API key của bạn từ{' '}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Google AI Studio
                      </a>
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">API Key</label>
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveApiKey();
                    }
                  }}
                />
                <p className="text-xs text-slate-400">
                  API key sẽ được lưu trong trình duyệt của bạn (localStorage)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Lưu API Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BƯỚC 1: Tải lên file */}
        {status === TranscriptionStatus.IDLE && (
          <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Bước 1: Tải lên file Audio hoặc Video</h2>
              <p className="text-slate-500 text-sm mt-1">Tải lên một hoặc nhiều file cần ghi chép. Hỗ trợ MP3, MP4, WAV, M4A, OGG — tối đa 100MB/file.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <FileUpload
                pendingFiles={pendingFiles}
                onAddFiles={handleAddFiles}
                onRemoveFile={handleRemoveFile}
                onStartConvert={handleStartConvert}
                fileStatuses={[]}
                disabled={false}
              />
            </div>
            <p className="text-xs text-slate-400 text-center">Vui lòng hoàn thành bước 1 trước khi chuyển sang các bước tiếp theo.</p>
          </div>
        )}

        {/* BƯỚC 2: Ghi chép — split layout cố định */}
        {(status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.READING_FILE) && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Bước 2: Chuyển đổi âm thanh thành văn bản</h2>
              <p className="text-slate-500 text-sm mt-1">AI đang lắng nghe và ghi chép từng file. Kết quả hiện ngay khi mỗi file hoàn thành.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trái: File queue với trạng thái */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách file</p>
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200">
                <FileUpload
                  pendingFiles={pendingFiles}
                  onAddFiles={handleAddFiles}
                  onRemoveFile={handleRemoveFile}
                  onStartConvert={handleStartConvert}
                  fileStatuses={fileStatuses}
                  disabled={true}
                />
              </div>
            </div>

            {/* Phải: Kết quả từng file khi xong */}
            <div className="space-y-3 flex flex-col h-[calc(100vh-260px)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Văn bản ghi chép</p>
                {completedTranscriptions.length > 1 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {completedTranscriptions.map((t, i) => (
                      <button key={i} onClick={() => setViewingIndex(i)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${i === viewingIndex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                        {t.name.length > 15 ? t.name.substring(0, 15) + '…' : t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                {completedTranscriptions.length === 0 ? (
                  <div className="h-full bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-center p-8">
                    <Spinner size="lg" className="text-blue-400" />
                    <p className="text-slate-500 font-medium">Đã xong {currentFileIndex}/{totalFiles} file...</p>
                    <p className="text-slate-400 text-sm italic">Kết quả sẽ hiện tại đây khi file xong</p>
                  </div>
                ) : (
                  <TranscriptionView text={completedTranscriptions[viewingIndex]?.text || ''} />
                )}
              </div>
            </div>
            </div>{/* end grid */}
          </div>
        )}

        {status === TranscriptionStatus.ERROR && (
          <div className="max-w-xl mx-auto pt-10">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Lỗi hệ thống</h3>
                <p className="text-red-600 mt-1">{errorMsg}</p>
              </div>
              <button onClick={resetApp} className="px-6 py-2 bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors">Tải lại</button>
            </div>
          </div>
        )}

        {/* BƯỚC 3 (multi-file): Đang tổng hợp */}
        {status === TranscriptionStatus.SYNTHESIZING && (
          <div className="max-w-xl mx-auto pt-16 text-center space-y-5 animate-in fade-in duration-300">
            <Spinner size="lg" className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Đang tổng hợp nội dung cuộc họp...</h2>
              <p className="text-slate-500 text-sm mt-2">AI đang gộp {totalFiles} file ghi âm thành một văn bản liền mạch, không bỏ sót nội dung nào.</p>
            </div>
          </div>
        )}

        {/* Navigate back: Xem lại ghi chép từng file (bước 2) */}
        {isNavigableState && viewStep === 2 && completedTranscriptions.length > 0 && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Bước 2: Văn bản ghi chép từng file</h2>
              <p className="text-slate-500 text-sm mt-1">Xem lại nội dung ghi chép của từng file ghi âm.</p>
            </div>
            {completedTranscriptions.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                {completedTranscriptions.map((t, i) => (
                  <button key={i} onClick={() => setViewingIndex(i)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${i === viewingIndex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                    {t.name.length > 20 ? t.name.substring(0, 20) + '…' : t.name}
                  </button>
                ))}
              </div>
            )}
            <div className="h-[calc(100vh-300px)]">
              <TranscriptionView text={completedTranscriptions[viewingIndex]?.text || ''} />
            </div>
          </div>
        )}

        {/* Xem lại bản tổng hợp (bước 3, multi-file) */}
        {isNavigableState && isMultiFile && viewStep === 3 && synthesizedTranscription && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Bước 3: Tổng hợp nội dung cuộc họp</h2>
                <p className="text-slate-500 text-sm mt-1">
                  AI đã gộp {totalFiles} file ghi âm thành một văn bản liên tục. Xem lại nội dung bên dưới trước khi tạo biên bản.
                </p>
              </div>
              {status !== TranscriptionStatus.COMPLETED && (
                <button
                  onClick={() => { setStatus(TranscriptionStatus.COMPLETED); setViewStep(biênBảnStep); }}
                  className="bg-blue-600 text-white font-black px-8 py-3 rounded-xl shadow-blue-200 shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 whitespace-nowrap"
                >
                  Tạo biên bản từ nội dung này →
                </button>
              )}
              {status === TranscriptionStatus.COMPLETED && (
                <button
                  onClick={() => setViewStep(biênBảnStep)}
                  className="bg-blue-600 text-white font-black px-8 py-3 rounded-xl shadow-blue-200 shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 whitespace-nowrap"
                >
                  Xem biên bản →
                </button>
              )}
            </div>
            <div className="h-[calc(100vh-280px)]">
              <TranscriptionView text={synthesizedTranscription} />
            </div>
          </div>
        )}

        {/* BƯỚC 3/4: Biên bản — COMPLETED / SUMMARIZING */}
        {((isNavigableState && viewStep === biênBảnStep) || status === TranscriptionStatus.SUMMARIZING) && transcription && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {summary
                  ? `Bước ${isMultiFile ? 5 : 4}: Biên bản hoàn thành`
                  : `Bước ${isMultiFile ? 4 : 3}: Tạo biên bản cuộc họp`}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {summary ? 'Biên bản đã được tạo. Bạn có thể tạo lại hoặc xuất file Excel.' : 'Văn bản đã sẵn sàng. Nhấn tạo biên bản để AI tổng hợp nội dung cuộc họp.'}
              </p>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Cột 1: Văn bản tổng hợp (multi-file) hoặc văn bản thô (single file) */}
            <div className="space-y-4 flex flex-col h-[calc(100vh-280px)]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full">1</span>
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                    {synthesizedTranscription ? 'Nội dung tổng hợp' : 'Văn bản thô'}
                  </h2>
                  {synthesizedTranscription && (
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      {totalFiles} files đã gộp
                    </span>
                  )}
                </div>
                {!synthesizedTranscription && completedTranscriptions.length > 1 && (
                  <div className="flex gap-1 flex-wrap">
                    {completedTranscriptions.map((t, i) => (
                      <button key={i} onClick={() => setViewingIndex(i)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${i === viewingIndex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                        {t.name.length > 12 ? t.name.substring(0, 12) + '…' : t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <TranscriptionView text={
                  synthesizedTranscription
                    ? synthesizedTranscription
                    : completedTranscriptions.length > 1
                      ? completedTranscriptions[viewingIndex]?.text || ''
                      : transcription
                } />
              </div>
            </div>

            {/* Cột 2: Biên bản — luôn dùng toàn bộ transcription (combined) */}
            <div className="space-y-4 flex flex-col h-[calc(100vh-280px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full">2</span>
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Biên bản cuộc họp</h2>
                  {totalFiles > 1 && (
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      {totalFiles} files
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors underline decoration-2 underline-offset-4"
                >
                  {showPromptEditor ? "Đóng tùy chỉnh" : "Sửa lại yêu cầu biên bản"}
                </button>
              </div>

              {/* Prompt Editor (Toggleable) */}
              {showPromptEditor && (
                <div className="bg-white border-2 border-blue-100 rounded-xl p-4 shadow-lg animate-in fade-in zoom-in duration-200">
                  <label className="block text-xs font-bold text-blue-900 uppercase mb-2">Cấu hình Prompt tóm tắt:</label>
                  <textarea
                    value={summaryPrompt}
                    onChange={(e) => setSummaryPrompt(e.target.value)}
                    className="w-full h-40 text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                    placeholder="Nhập yêu cầu tóm tắt tại đây..."
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => setSummaryPrompt(DEFAULT_SUMMARY_PROMPT)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Khôi phục mặc định
                    </button>
                    <button
                      onClick={() => setShowPromptEditor(false)}
                      className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Lưu cấu hình
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col min-h-0">
                {!summary ? (
                  <div className="flex-1 bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <DownloadIcon className="w-8 h-8 opacity-20" />
                    </div>
                    <div>
                      <h3 className="text-slate-700 font-bold">Chưa tạo biên bản</h3>
                      <p className="text-slate-400 text-sm mt-1">Sử dụng Gemini 3 Pro để tự động hóa biên bản từ văn bản thô.</p>
                    </div>
                    <button
                      onClick={handleGenerateSummary}
                      disabled={status === TranscriptionStatus.SUMMARIZING}
                      className="bg-blue-600 text-white font-black px-8 py-3 rounded-xl shadow-blue-200 shadow-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50"
                    >
                      {status === TranscriptionStatus.SUMMARIZING
                        ? "ĐANG XỬ LÝ..."
                        : totalFiles > 1
                          ? `TẠO BIÊN BẢN (${totalFiles} FILES)`
                          : "TẠO BIÊN BẢN NGAY"}
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <TranscriptionView text={summary} />
                    <div className="mt-4 flex gap-4">
                      <button
                        onClick={handleGenerateSummary}
                        className="flex-1 border-2 border-blue-600 text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshIcon className="w-4 h-4" />
                        Tạo lại bản khác
                      </button>

                      <button
                        onClick={handleExportExcel}
                        className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Xuất Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
          </div>
        )}

      </main>


    </div>
  );
}

export default App;