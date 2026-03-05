import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { TranscriptionStatus, FileMetadata } from './types';
import { transcribeAudio, summarizeTranscript } from './services/geminiService';
import { supabase, isSupabaseConfigured, getInitialAuthState, signOut, type AuthState } from './lib/supabase';
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

const DEFAULT_SUMMARY_PROMPT = `Dựa vào văn bản ghi chép trên, hãy tạo một biên bản cuộc họp chuyên nghiệp theo cấu trúc sau:
1. Tóm tắt ngắn gọn mục đích cuộc họp.
2. Danh sách các thành phần tham dự (nếu có thông tin).
3. Các nội dung chính đã thảo luận (trình bày dưới dạng bullet points).
4. Các quyết định đã được đưa ra.
5. Danh sách các đầu việc (Action Items): Ghi rõ ai làm gì, thời hạn (nếu có).

Yêu cầu trình bày sạch đẹp bằng Markdown, ngôn ngữ trang trọng.`;

function App() {
  const [authState, setAuthState] = useState<AuthState>({ session: null, user: null });
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);
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

  useEffect(() => {
    const init = async () => {
      // Load API key from localStorage on mount
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

      if (supabase) {
        supabase.auth.onAuthStateChange((_event, session) => {
          setAuthState({
            session: session,
            user: session?.user ?? null,
          });
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

  const handleSaveApiKey = () => {
    if (userApiKey && userApiKey.trim().length > 0) {
      localStorage.setItem('gemini_api_key', userApiKey.trim());
      setHasApiKey(true);
      setShowApiKeyInput(false);
    } else {
      alert('Vui lòng nhập API key hợp lệ');
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!hasApiKey) {
      await handleOpenKeySelector();
    }

    setFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    setTranscription(null);
    setSummary(null);
    setErrorMsg(null);
    setTranscriptionId(null);
    setStatus(TranscriptionStatus.READING_FILE);

    try {
      setStatus(TranscriptionStatus.PROCESSING);
      const resultText = await transcribeAudio(file);
      setTranscription(resultText);

      // Save to Supabase if configured
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('transcriptions')
            .insert({
              file_name: file.name,
              file_size: file.size,
              transcription_text: resultText
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
          // Don't fail the whole operation if DB save fails
        }
      }

      setStatus(TranscriptionStatus.COMPLETED);
    } catch (err: any) {
      if (err.message === "API_KEY_EXPIRED") {
        setHasApiKey(false);
        setErrorMsg("API Key không hợp lệ hoặc đã hết hạn. Vui lòng chọn lại.");
      } else {
        setErrorMsg(err.message || "Có lỗi xảy ra khi xử lý file.");
      }
      setStatus(TranscriptionStatus.ERROR);
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcription) return;

    setErrorMsg(null);
    setStatus(TranscriptionStatus.SUMMARIZING);

    try {
      const resultSummary = await summarizeTranscript(transcription, summaryPrompt);
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

    const fileName = fileMeta?.name
      ? `Bien_ban_${fileMeta.name.split('.')[0]}.xlsx`
      : `Bien_ban_cuoc_hop_${new Date().getTime()}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const resetApp = () => {
    setStatus(TranscriptionStatus.IDLE);
    setFileMeta(null);
    setTranscription(null);
    setSummary(null);
    setErrorMsg(null);
  };

  const handleLogout = async () => {
    await signOut();
    setStatus(TranscriptionStatus.IDLE);
    setFileMeta(null);
    setTranscription(null);
    setSummary(null);
    setErrorMsg(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  if (!authState.user) {
    return <LoginPage onLoginSuccess={() => { /* session listener sẽ cập nhật state */ }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">
              3
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Meeting Scribe <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full font-medium hover:bg-slate-200 transition-colors flex items-center gap-1"
              title="Thay đổi API Key"
            >
              ⚙️ API Key
            </button>
            {status !== TranscriptionStatus.IDLE && (
              <button
                onClick={resetApp}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                <RefreshIcon className="w-4 h-4" />
                Dự án mới
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-full font-medium hover:bg-red-100 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">



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
                        className="text-indigo-600 hover:underline font-medium"
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
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
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
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Lưu API Key
                </button>
              </div>
            </div>
          </div>
        )}

        {status === TranscriptionStatus.IDLE && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-slate-900 leading-tight">Biến âm thanh thành <span className="text-indigo-600">kết quả công việc</span></h2>
              <p className="text-slate-500 text-lg">
                Quy trình khép kín từ Ghi âm {'→'} Văn bản {'→'} Biên bản cuộc họp chuyên nghiệp.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 ring-1 ring-slate-100">
              <FileUpload onFileSelect={handleFileSelect} disabled={false} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="font-bold text-slate-800 mb-1">BƯỚC 1</div>
                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">Transcription</div>
                <div className="text-sm text-slate-500 italic">Chuyển đổi âm thanh thô thành văn bản có phân biệt người nói.</div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="font-bold text-slate-800 mb-1">BƯỚC 2</div>
                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">Tóm tắt</div>
                <div className="text-sm text-slate-500 italic">Sử dụng AI phân tích nội dung để tạo biên bản, danh sách đầu việc.</div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="font-bold text-slate-800 mb-1">KẾT QUẢ</div>
                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">Báo cáo</div>
                <div className="text-sm text-slate-500 italic">Lưu trữ và chia sẻ ngay kết quả cuối cùng cho đội ngũ.</div>
              </div>
            </div>
          </div>
        )}

        {(status === TranscriptionStatus.READING_FILE || status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.SUMMARIZING) && (
          <div className="max-w-xl mx-auto text-center pt-12 space-y-6 animate-pulse">
            <div className="relative inline-block">
              <Spinner size="lg" className="text-indigo-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileAudioIcon className="w-5 h-5 text-indigo-600 opacity-50" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-800">
                {status === TranscriptionStatus.READING_FILE && "Đang chuẩn bị dữ liệu..."}
                {status === TranscriptionStatus.PROCESSING && "Đang bóc tách âm thanh..."}
                {status === TranscriptionStatus.SUMMARIZING && "Đang soạn thảo biên bản..."}
              </h3>
              <p className="text-slate-500 italic">
                {status === TranscriptionStatus.SUMMARIZING
                  ? "Gemini 3 Pro đang phân tích các ý chính và hành động cần thiết..."
                  : "Đang lắng nghe từng câu chữ và phân biệt người nói..."}
              </p>
            </div>
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

        {/* Workflow View */}
        {(status === TranscriptionStatus.COMPLETED || status === TranscriptionStatus.SUMMARIZING) && transcription && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

            {/* Step 1: Transcription Result */}
            <div className="space-y-4 flex flex-col h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full">1</span>
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Văn bản thô</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">{fileMeta?.name}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <TranscriptionView text={transcription} />
              </div>
            </div>

            {/* Step 2: Summary Generator / Result */}
            <div className="space-y-4 flex flex-col h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full">2</span>
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Biên bản cuộc họp</h2>
                </div>
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors underline decoration-2 underline-offset-4"
                >
                  {showPromptEditor ? "Đóng tùy chỉnh" : "Sửa Prompt"}
                </button>
              </div>

              {/* Prompt Editor (Toggleable) */}
              {showPromptEditor && (
                <div className="bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-lg animate-in fade-in zoom-in duration-200">
                  <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">Cấu hình Prompt tóm tắt:</label>
                  <textarea
                    value={summaryPrompt}
                    onChange={(e) => setSummaryPrompt(e.target.value)}
                    className="w-full h-40 text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono"
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
                      className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700"
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
                      className="bg-indigo-600 text-white font-black px-8 py-3 rounded-xl shadow-indigo-200 shadow-xl hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50"
                    >
                      {status === TranscriptionStatus.SUMMARIZING ? "ĐANG XỬ LÝ..." : "TẠO BIÊN BẢN NGAY"}
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <TranscriptionView text={summary} />
                    <div className="mt-4 flex gap-4">
                      <button
                        onClick={handleGenerateSummary}
                        className="flex-1 border-2 border-indigo-600 text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
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
        )}

      </main>


    </div>
  );
}

export default App;