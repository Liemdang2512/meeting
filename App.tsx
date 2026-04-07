import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { TranscriptionStatus, FileMetadata, type TokenLoggingContext } from './types';
import {
  transcribeBasic,
  transcribeDeep,
  summarizeTranscript,
  synthesizeTranscriptions,
  consumeLastSummaryBillingCorrelationId,
  type DeepProgressCallback,
  type AudioLanguage,
} from './services/geminiService';
import { getMe, logout as signOut, loadApiKeyFromAccount, saveApiKeyToAccount } from './lib/auth';
import type { AuthUser } from './lib/auth';
import { authFetch } from './lib/api';
import { Spinner } from './components/Spinner';
import { FileAudioIcon, RefreshIcon, AlertCircleIcon, DownloadIcon, CheckIcon, CopyIcon, MailIcon } from './components/Icons';
import { FileText, Scissors, GitBranch, Zap, BarChart2, Users, Settings, User as UserIcon } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { MeetingInfo } from './features/minutes/types';
import { loadMeetingInfoDraft, clearMeetingInfoDraft } from './features/minutes/storage';
import { buildMinutesCustomPrompt } from './features/minutes/prompt';
// Lazy load MeetingInfoForm — chỉ dùng trong meeting flow, không cần trong main bundle
const MeetingInfoForm = lazy(() => import('./features/minutes/components/MeetingInfoForm').then(m => ({ default: m.MeetingInfoForm })));
// useMindmapTree cần direct import vì được gọi trong App() root component
// TODO: Tách App thành AppShell + MeetingApp để hook chỉ chạy khi route /meeting
import { useMindmapTree } from './features/mindmap/hooks/useMindmapTree';
import { downloadAsDocx, downloadAsPdf } from './lib/minutesDocxExport';
import { QuotaBadge } from './features/pricing/QuotaBadge';
import { QuotaUpgradeModal } from './features/pricing/QuotaUpgradeModal';


// Lazy load các route pages - chỉ tải khi user navigate đến
const FileSplitPage = lazy(() => import('./features/file-split').then(m => ({ default: m.FileSplitPage })));
const TokenUsageAdminPage = lazy(() => import('./features/token-usage-admin/TokenUsageAdminPage').then(m => ({ default: m.TokenUsageAdminPage })));
const UserManagementPage = lazy(() => import('./features/user-management/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const MindmapPage = lazy(() => import('./features/mindmap/MindmapPage').then(m => ({ default: m.MindmapPage })));
const MindmapTreeCanvasLazy = lazy(() => import('./features/mindmap/components/MindmapTreeCanvas').then(m => ({ default: m.MindmapTreeCanvas })));
const RegisterPage = lazy(() => import('./components/RegisterPage').then(m => ({ default: m.RegisterPage })));
const PricingPage = lazy(() => import('./features/pricing/PricingPage').then(m => ({ default: m.PricingPage })));
const HomePage = lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const PaymentResultPage = lazy(() => import('./components/PaymentResultPage').then(m => ({ default: m.PaymentResultPage })));
import { WorkflowGuard } from './features/workflows/WorkflowGuard';

import { WORKFLOW_GROUPS } from './features/workflows/types';

const MeetingLandingPage = lazy(() => import('./components/MeetingLandingPage').then(m => ({ default: m.MeetingLandingPage })));
const ReporterWorkflowPage = lazy(() => import('./features/workflows/reporter/ReporterWorkflowPage'));
const SpecialistWorkflowPage = lazy(() => import('./features/workflows/specialist/SpecialistWorkflowPage'));
const OfficerWorkflowPage = lazy(() => import('./features/workflows/officer/OfficerWorkflowPage'));


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
  const [user, setUser] = useState<AuthUser | null>(null);
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

  // Mindmap từ transcription
  const { tree: mindmapTree, loading: mindmapLoading, error: mindmapError, generate: generateMindmap, reset: resetMindmap } = useMindmapTree();
  const mindmapCaptureFnRef = useRef<(() => Promise<string | null>) | null>(null);
  const mindmapPdfDataRef = useRef<string | null>(null);

  // Step navigation — controls which step's content is displayed
  const [viewStep, setViewStep] = useState(1);

  // Trạng thái từng file khi xử lý song song
  const [fileStatuses, setFileStatuses] = useState<('idle' | 'processing' | 'done' | 'error')[]>([]);

  // Chế độ phiên âm
  const [transcribeMode, setTranscribeMode] = useState<'basic' | 'deep'>('basic');

  // Ngôn ngữ audio
  const [audioLanguage, setAudioLanguage] = useState<AudioLanguage>('vi');
  const [customLanguage, setCustomLanguage] = useState('');

  // Chế độ workflow được chọn trong bước 1


  // Progress cho chế độ chuyên sâu (3 bước)
  const [deepProgress, setDeepProgress] = useState<{ step: number; label: string } | null>(null);

  const [mode, setMode] = useState<'notes' | 'splitter'>('notes');
  const [route, setRoute] = useState<string>(() => window.location.pathname || '/');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const QUOTA_DISMISS_KEY = 'quota_modal_dismissed_date';
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const isQuotaModalDismissedToday = () => localStorage.getItem(QUOTA_DISMISS_KEY) === todayStr();
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaToast, setQuotaToast] = useState(false);
  const showQuotaModalIfNotDismissed = () => {
    if (!isQuotaModalDismissedToday()) setShowQuotaModal(true);
  };
  const showQuotaToast = () => {
    setQuotaToast(true);
    setTimeout(() => setQuotaToast(false), 4000);
  };

  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>(() => (
    loadMeetingInfoDraft() ?? {
      companyName: '',
      companyAddress: '',
      meetingDatetime: '',
      meetingLocation: '',
      participants: [],
      recipientEmails: [],
    }
  ));

  // Email sending state
  const [emailSendState, setEmailSendState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSentCount, setEmailSentCount] = useState(0);

  useEffect(() => {
    const parts = ['Biên bản cuộc họp'];
    if (meetingInfo.companyName) parts.push(meetingInfo.companyName);
    if (meetingInfo.meetingDatetime) parts.push(meetingInfo.meetingDatetime);
    else parts.push(new Date().toISOString().slice(0, 10));
    setEmailSubject(parts.join(' - '));
  }, [meetingInfo.companyName, meetingInfo.meetingDatetime]);

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

      // Khoi tao trang thai dang nhap tu JWT trong localStorage
      const currentUser = await getMe();
      setUser(currentUser);
      setAuthLoading(false);

      // Neu da dang nhap, tai API key tu server
      if (currentUser) {
        const accountKey = await loadApiKeyFromAccount(currentUser.userId);
        if (accountKey) {
          setUserApiKey(accountKey);
          localStorage.setItem('gemini_api_key', accountKey);
          setHasApiKey(true);
          setShowApiKeyInput(false);
        }
        // Kiem tra admin tu role trong JWT
        setIsAdmin(currentUser.role === 'admin');

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

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    if (path === route) return;
    window.history.pushState({}, '', path);
    setRoute(path);
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

      // Luu API key len server (dong bo qua cac thiet bi)
      if (user) {
        const saved = await saveApiKeyToAccount(user.userId, trimmedKey);
        if (saved) {
          console.log('API key đã được lưu vào tài khoản.');
        }
      }
    } else {
      alert('Vui lòng nhập API key hợp lệ');
    }
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

    // Kiểm tra quota trước khi gọi Gemini (tránh lãng phí API call)
    if (user) {
      try {
        const quotaRes = await authFetch('/quota');
        if (quotaRes.ok) {
          const quotaData = await quotaRes.json();
          if (quotaData.remaining === 0) {
            showQuotaToast();
            return;
          }
        }
      } catch {
        // Nếu không check được quota thì cho qua, server sẽ chặn sau
      }
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
          const loggingContext: TokenLoggingContext = {
            feature: 'minutes',
            actionType: transcribeMode === 'deep' ? 'transcribe-deep' : 'transcribe-basic',
            metadata: {
              fileName: file.name,
              mode: transcribeMode,
            },
          };

          let resultText: string;
          if (transcribeMode === 'deep') {
            resultText = await transcribeDeep(
              file,
              (step, label) => {
                setDeepProgress({ step, label });
              },
              audioLanguage,
              customLanguage,
              loggingContext,
              user?.userId ?? null,
            );
            setDeepProgress(null);
          } else {
            resultText = await transcribeBasic(
              file,
              audioLanguage,
              customLanguage,
              loggingContext,
              user?.userId ?? null,
            );
          }
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

    // Save transcription to backend in background (khong block buoc chuyen tiep)
    if (files[0]) {
      void (async () => {
        try {
          const res = await authFetch('/transcriptions', {
            method: 'POST',
            body: JSON.stringify({
              file_name: files.length > 1 ? `${files[0].name} (+${files.length - 1} files)` : files[0].name,
              file_size: files.reduce((sum, f) => sum + f.size, 0),
              transcription_text: combined,
            }),
          });
          if (res.status === 429) {
            const errData = await res.json().catch(() => ({}));
            if (errData.upgradeRequired) {
              showQuotaModalIfNotDismissed();
              return;
            }
          }
          if (!res.ok) {
            console.error('Error saving transcription:', await res.text());
          } else {
            const row = await res.json();
            setTranscriptionId(row.id);
            window.dispatchEvent(new Event('quota-updated'));
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      })();
    }

    setPendingFiles([]);
    setViewingIndex(0);

    // Multi-file: thêm bước tổng hợp trước khi tạo biên bản
    if (files.length > 1) {
      setStatus(TranscriptionStatus.SYNTHESIZING);
      try {
        const synthLoggingContext: TokenLoggingContext = {
          feature: 'minutes',
          actionType: 'other',
          metadata: { fileName: 'Synthesize Combined', mode: 'synthesize', fileCount: completedList.length },
        };
        const synthesized = await synthesizeTranscriptions(
          completedList,
          synthLoggingContext,
          user?.userId ?? null
        );
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
      const customPrompt = buildMinutesCustomPrompt({ meetingInfo, templatePrompt: summaryPrompt });
      const sumLoggingContext: TokenLoggingContext = {
        feature: 'minutes',
        actionType: 'minutes-generate',
        metadata: { fileName: fileMeta?.name || 'Combined', mode: 'summarize' },
      };
      const resultSummary = await summarizeTranscript(
        sourceText,
        customPrompt,
        sumLoggingContext,
        user?.userId ?? null
      );
      setSummary(resultSummary);
      // Auto-advance sang bước Hoàn thành sau khi tạo biên bản xong
      setViewStep(biênBảnStep + 1);

      // Save summary to backend if we have a transcription ID
      if (transcriptionId) {
        try {
          const billingCorrelationId = consumeLastSummaryBillingCorrelationId();
          const res = await authFetch('/summaries', {
            method: 'POST',
            body: JSON.stringify({
              transcription_id: transcriptionId,
              summary_text: resultSummary,
              prompt_used: customPrompt,
              billing_correlation_id: billingCorrelationId,
            }),
          });
          if (!res.ok) {
            const saveError = await res.json().catch(() => ({}));
            if (res.status === 402 && saveError?.upgradeRequired) {
              setErrorMsg('Số dư hiện tại không đủ để lưu kết quả. Vui lòng nạp thêm và thử lại.');
              navigate('/pricing');
              return;
            }
            console.error('Error saving summary:', saveError);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      setStatus(TranscriptionStatus.COMPLETED);
    } catch (err: any) {
      if (err?.upgradeRequired) {
        setErrorMsg('Số dư hiện tại không đủ để tạo biên bản. Vui lòng nạp thêm để tiếp tục.');
        navigate('/pricing');
        setStatus(TranscriptionStatus.COMPLETED);
        return;
      }
      setErrorMsg(err.message || "Có lỗi xảy ra khi tạo biên bản.");
      setStatus(TranscriptionStatus.COMPLETED); // Return to completed transcription state even if summary fails
    }
  };

  const handleGenerateMindmap = async () => {
    const sourceText = synthesizedTranscription || transcription;
    if (!sourceText) return;
    await generateMindmap(sourceText, user?.userId ?? null);
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

  const handleExportExcel = async () => {
    if (!summary) return;

    // Dynamic import - chỉ tải XLSX (~200KB) khi user thực sự click Export Excel
    const XLSX = await import('xlsx');
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

  const handleExportPDF = () => {
    if (!summary) return;
    downloadAsPdf(summary);
  };

  const handleExportDocx = async () => {
    if (!summary) return;
    const filename = fileMeta?.name
      ? `bien-ban-${fileMeta.name.replace(/\.[^/.]+$/, '')}.docx`
      : `bien-ban-${new Date().toISOString().slice(0, 10)}.docx`;
    await downloadAsDocx(summary, filename);
  };

  const handleSendEmail = async () => {
    if (!summary || meetingInfo.recipientEmails.length === 0) return;
    setEmailSendState('loading');
    setEmailError('');
    try {
      // Dùng PDF mindmap đã capture sẵn (capture ngay khi mindmap render)
      const mindmapPng = mindmapPdfDataRef.current ?? null;

      const resp = await authFetch('/email/send-minutes', {
        method: 'POST',
        body: JSON.stringify({
          recipients: meetingInfo.recipientEmails,
          subject: emailSubject,
          minutesMarkdown: summary,
          mindmapPng,
          meetingInfo: {
            companyName: meetingInfo.companyName,
            companyAddress: meetingInfo.companyAddress,
            meetingDatetime: meetingInfo.meetingDatetime,
            meetingLocation: meetingInfo.meetingLocation,
            participants: meetingInfo.participants,
          },
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Gửi thất bại');
      }
      setEmailSendState('success');
      setEmailSentCount(meetingInfo.recipientEmails.length);
    } catch (err: any) {
      setEmailSendState('error');
      setEmailError(err.message || 'Gửi thất bại. Vui lòng thử lại.');
    }
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
    resetMindmap();
    setErrorMsg(null);
    setViewStep(1);
    setFileStatuses([]);
    clearMeetingInfoDraft();
    setMeetingInfo({
      companyName: '',
      companyAddress: '',
      meetingDatetime: '',
      meetingLocation: '',
      participants: [],
      recipientEmails: [],
    });
    setEmailSendState('idle');
    setEmailSubject('');
    setEmailError('');
    setEmailSentCount(0);
  };

  const handleLogout = async () => {
    await signOut();
    // Reset toan bo state de quay lai trang dang nhap ngay
    setUser(null);
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
    clearMeetingInfoDraft();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" className="text-slate-500 mb-4" />
        <h2 className="text-xl font-sans font-medium text-slate-800 animate-pulse">Đang tải...</h2>
      </div>
    );
  }

  if (user && (route === '/login' || route === '/register')) {
    navigate('/meeting');
    return null;
  }

  if (!user) {
    if (route === '/') {
      return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner /></div>}>
          <HomePage onNavigate={(path) => { window.history.pushState({}, '', path); setRoute(path); }} />
        </Suspense>
      );
    }
    if (route === '/register') {
      return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner /></div>}>
          <RegisterPage
            onRegisterSuccess={async () => {
              const loggedInUser = await getMe();
              setUser(loggedInUser);
              if (loggedInUser) {
                navigate('/meeting');
              } else {
                navigate('/pricing');
              }
              if (loggedInUser) {
                setIsAdmin(loggedInUser.role === 'admin');
                const accountKey = await loadApiKeyFromAccount(loggedInUser.userId);
                if (accountKey) {
                  setUserApiKey(accountKey);
                  localStorage.setItem('gemini_api_key', accountKey);
                  setHasApiKey(true);
                  setShowApiKeyInput(false);
                }
              }
            }}
            onGoToLogin={() => navigate('/login')}
          />
        </Suspense>
      );
    }
    // Handle /payment/result even when user is not authenticated yet
    // (VNPay/MoMo redirects back before app finishes auth loading)
    if (route === '/payment/result') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
          <PaymentResultPage
            onTokenRefresh={(newUser) => {
              setUser(newUser);
            }}
          />
        </Suspense>
      );
    }

    return <LoginPage onLoginSuccess={async () => {
      // Sau khi dang nhap thanh cong, lay user info va cap nhat state
      const loggedInUser = await getMe();
      setUser(loggedInUser);
      if (loggedInUser) {
        navigate('/meeting');
      } else {
        navigate('/pricing');
      }
      if (loggedInUser) {
        setIsAdmin(loggedInUser.role === 'admin');
        const accountKey = await loadApiKeyFromAccount(loggedInUser.userId);
        if (accountKey) {
          setUserApiKey(accountKey);
          localStorage.setItem('gemini_api_key', accountKey);
          setHasApiKey(true);
          setShowApiKeyInput(false);
        }
      }
    }} />;
  }

  // Tính bước hiện tại cho step indicator
  const isMultiFile = totalFiles > 1;
  const meetingInfoStep = isMultiFile ? 4 : 3;
  const biênBảnStep = isMultiFile ? 5 : 4;
  const hoànThànhStep = biênBảnStep + 1;
  const isNavigableState = status === TranscriptionStatus.SYNTHESIZED || status === TranscriptionStatus.COMPLETED;

  const currentStep = (() => {
    if (isMultiFile) {
      if (status === TranscriptionStatus.IDLE) return 1;
      if (status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.READING_FILE) return 2;
      if (status === TranscriptionStatus.SYNTHESIZING || status === TranscriptionStatus.SYNTHESIZED) return 3;
      if (status === TranscriptionStatus.SUMMARIZING) return biênBảnStep;
      if (status === TranscriptionStatus.COMPLETED) return summary ? 6 : meetingInfoStep;
      return 1;
    } else {
      if (status === TranscriptionStatus.IDLE) return 1;
      if (status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.READING_FILE) return 2;
      if (status === TranscriptionStatus.SUMMARIZING) return biênBảnStep;
      if (status === TranscriptionStatus.COMPLETED) return summary ? 5 : meetingInfoStep;
      return 1;
    }
  })();

  const steps = isMultiFile ? [
    { n: 1, label: 'Tải lên file' },
    { n: 2, label: 'Ghi chép' },
    { n: 3, label: 'Tổng hợp' },
    { n: 4, label: 'Thông tin cuộc họp' },
    { n: 5, label: 'Biên bản' },
    { n: 6, label: 'Hoàn thành' },
  ] : [
    { n: 1, label: 'Tải lên file' },
    { n: 2, label: 'Ghi chép' },
    { n: 3, label: 'Thông tin cuộc họp' },
    { n: 4, label: 'Biên bản' },
    { n: 5, label: 'Hoàn thành' },
  ];

  const isNotesRoute = route === '/meeting';
  const isAdminRoute = route === '/admin/token-usage';
  const isUserMgmtRoute = route === '/admin/users';
const isMindmapRoute = route === '/mindmap';
  const isPricingRoute = route === '/pricing';
  const isHomeRoute = route === '/';
  const isReporterRoute = route === '/reporter' || route === '/meeting/reporter';
  const isSpecialistRoute = route === '/specialist' || route === '/meeting/specialist';
  const isOfficerRoute = route === '/officer' || route === '/meeting/officer';
  const isWorkflowRoute = isReporterRoute || isSpecialistRoute || isOfficerRoute;

  if (isHomeRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner /></div>}>
        <HomePage onNavigate={(path) => { window.history.pushState({}, '', path); setRoute(path); }} />
      </Suspense>
    );
  }


  if (route === '/payment/result') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
        <PaymentResultPage
          onTokenRefresh={(newUser) => {
            setUser(newUser);
          }}
        />
      </Suspense>
    );
  }

  if (route === '/profile' || route === '/settings') {
    const roleLabel = user?.role === 'admin' ? 'Admin' : ((user?.plans?.length ?? 0) > 0 ? 'Paid' : 'Free');
    const planLabels = (user?.plans ?? []).map(p => WORKFLOW_GROUPS.find(wg => wg.key === p)?.label ?? p);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-8">
        <div className="w-full max-w-lg">
          <button
            onClick={() => window.history.back()}
            className="mb-4 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Quay lại
          </button>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Thông tin tài khoản</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800">{user?.email ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Quyền</span>
                <span className="font-medium text-slate-800">{roleLabel}</span>
              </div>
              <div className="py-2 border-b border-slate-100">
                <QuotaBadge variant="card" />
              </div>
              <div className="flex justify-between items-start py-2">
                <span className="text-slate-500">Gói đã đăng ký</span>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {planLabels.length > 0 ? planLabels.map(label => (
                    <span key={label} className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">{label}</span>
                  )) : <span className="text-slate-400">—</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant/20 py-6 z-40">
        {/* Logo */}
        <div className="px-6 mb-8">
          <button
            onClick={() => { navigate('/meeting'); setMode('notes'); }}
            className="flex items-center gap-3 w-full text-left hover:opacity-90 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl nebula-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <FileAudioIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface font-headline">MOMAI</h1>
              <p className="text-[10px] tracking-widest uppercase text-on-surface-variant font-semibold">Meeting Minute</p>
            </div>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className="space-y-1">
            {([
              { label: 'Ghi chép', icon: <FileText size={18} />, active: (isNotesRoute || isWorkflowRoute) && mode !== 'splitter', onClick: () => { navigate('/meeting'); setMode('notes'); } },
              { label: 'Cắt file', icon: <Scissors size={18} />, active: isNotesRoute && mode === 'splitter', onClick: () => { navigate('/meeting'); setMode('splitter'); } },
              { label: 'Sơ đồ tư duy', icon: <GitBranch size={18} />, active: isMindmapRoute, onClick: () => navigate('/mindmap') },
              { label: 'Nâng cấp', icon: <Zap size={18} />, active: isPricingRoute, onClick: () => navigate('/pricing') },
            ] as const).map(item => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  item.active
                    ? 'nebula-gradient text-white shadow-md shadow-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-container hover:scale-[1.02]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            {isAdmin && (
              <>
                <div className="pt-4 pb-1 px-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Admin</p>
                </div>
                {([
                  { label: 'Token Usage', icon: <BarChart2 size={18} />, active: isAdminRoute, onClick: () => navigate('/admin/token-usage') },
                  { label: 'Quản lý tài khoản', icon: <Users size={18} />, active: isUserMgmtRoute, onClick: () => navigate('/admin/users') },
                ] as const).map(item => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      item.active
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:scale-[1.02]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* New Session CTA */}
          <div className="mt-8">
            <button
              onClick={resetApp}
              className="w-full py-3 nebula-gradient text-white rounded-full font-bold text-sm shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              + Phiên mới
            </button>
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-4 border-t border-outline-variant/10 pt-4 space-y-1">
          {user && (
            <div className="px-4 pb-2">
              <QuotaBadge variant="card" onQuotaExhausted={() => showQuotaModalIfNotDismissed()} />
            </div>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container px-4 py-3 rounded-xl w-full transition-colors text-sm font-semibold"
          >
            <UserIcon size={18} />
            Profile & Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container px-4 py-3 rounded-xl w-full transition-colors text-sm font-semibold"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main area (right of sidebar) ── */}
      <div className="flex-1 flex flex-col md:ml-64">

        {/* Top Header */}
        <header className="flex justify-between items-center w-full px-6 py-3 bg-surface-container-lowest/80 backdrop-blur-xl sticky top-0 z-30 border-b border-outline-variant/10 shadow-sm">
          {/* Mobile: logo */}
          <button
            onClick={() => { navigate('/meeting'); setMode('notes'); }}
            className="md:hidden flex items-center gap-2 font-bold font-headline text-on-surface"
          >
            <div className="w-7 h-7 rounded-lg nebula-gradient flex items-center justify-center">
              <FileAudioIcon className="w-4 h-4 text-white" />
            </div>
            MOMAI
          </button>

          {/* Desktop: active page label + quota */}
          <div className="hidden md:flex items-center gap-3 text-sm font-bold text-primary">
            <span className="border-b-2 border-primary pb-1">
              {isNotesRoute && mode !== 'splitter' && 'Ghi chép'}
              {isNotesRoute && mode === 'splitter' && 'Cắt file'}
              {isReporterRoute && 'Bài phỏng vấn'}
              {isSpecialistRoute && 'Thư ký Cuộc họp'}
              {isOfficerRoute && 'Thông tin Dự án'}
              {isMindmapRoute && 'Sơ đồ tư duy'}
              {isPricingRoute && 'Nâng cấp'}
              {isAdminRoute && 'Token Usage (Admin)'}
              {isUserMgmtRoute && 'Quản lý tài khoản'}
            </span>
            {user && (
              <QuotaBadge onQuotaExhausted={() => showQuotaModalIfNotDismissed()} />
            )}
          </div>

          {/* Right: avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full nebula-gradient flex items-center justify-center text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
              title="Profile"
            >
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </button>
          </div>
        </header>


        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Spinner /></div>}>
          {isAdminRoute && user && (
            <TokenUsageAdminPage currentUserId={user.userId} isAdmin={isAdmin} />
          )}
          {isUserMgmtRoute && user && (
            <UserManagementPage currentUserId={user.userId} isAdmin={isAdmin} />
          )}
          {isMindmapRoute && (
            <MindmapPage user={user} navigate={navigate} />
          )}
          {isPricingRoute && (
            <PricingPage
              currentUserRole={user?.role}
              userPlans={user?.plans}
              onPaymentSuccess={async () => {
                const refreshedUser = await getMe();
                setUser(refreshedUser);
              }}
            />
          )}
          {isReporterRoute && user && (
            <WorkflowGuard group="reporter" user={user} navigate={navigate}>
              <ReporterWorkflowPage navigate={navigate} user={user} />
            </WorkflowGuard>
          )}
          {isSpecialistRoute && user && (
            <WorkflowGuard group="specialist" user={user} navigate={navigate}>
              <SpecialistWorkflowPage navigate={navigate} user={user} />
            </WorkflowGuard>
          )}
          {isOfficerRoute && user && (
            <WorkflowGuard group="officer" user={user} navigate={navigate}>
              <OfficerWorkflowPage navigate={navigate} user={user} />
            </WorkflowGuard>
          )}
          {isNotesRoute && mode === 'splitter' && (
            <FileSplitPage
              onSendToTranscription={(files) => {
                setPendingFiles(files);
                setMode('notes');
              }}
            />
          )}
        </Suspense>
        {isNotesRoute && mode === 'notes' && (
          <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner /></div>}>
            <MeetingLandingPage user={user} navigate={navigate} initialFiles={pendingFiles.length > 0 ? pendingFiles : undefined} />
          </Suspense>
        )}
      </main>

      {/* Toast: hết lượt */}
      {quotaToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-3">
            <span className="text-base">⚡</span>
            <span>Bạn đã hết lượt hôm nay. Hãy nâng cấp để tiếp tục.</span>
            <button
              onClick={() => { setQuotaToast(false); navigate('/pricing'); }}
              className="ml-2 text-amber-700 underline underline-offset-2 font-semibold whitespace-nowrap"
            >
              Xem gói
            </button>
          </div>
        </div>
      )}

      <QuotaUpgradeModal
        isOpen={showQuotaModal}
        onClose={() => {
          localStorage.setItem(QUOTA_DISMISS_KEY, todayStr());
          setShowQuotaModal(false);
        }}
        onViewPlans={() => {
          localStorage.setItem(QUOTA_DISMISS_KEY, todayStr());
          setShowQuotaModal(false);
          navigate('/pricing');
        }}
      />

      </div> {/* end md:ml-64 */}

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/20 pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { label: 'Ghi chép', icon: <FileText size={20} />, active: (isNotesRoute || isWorkflowRoute) && mode !== 'splitter', onClick: () => { navigate('/meeting'); setMode('notes'); } },
            { label: 'Cắt file', icon: <Scissors size={20} />, active: isNotesRoute && mode === 'splitter', onClick: () => { navigate('/meeting'); setMode('splitter'); } },
            { label: 'Sơ đồ', icon: <GitBranch size={20} />, active: isMindmapRoute, onClick: () => navigate('/mindmap') },
            { label: 'Nâng cấp', icon: <Zap size={20} />, active: isPricingRoute, onClick: () => navigate('/pricing') },
            { label: 'Tôi', icon: <UserIcon size={20} />, active: route === '/profile', onClick: () => navigate('/profile') },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                item.active
                  ? 'text-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;