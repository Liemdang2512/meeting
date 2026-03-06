
import { GoogleGenAI } from "@google/genai";

// Helper function to get API key from localStorage or env
const getApiKey = (): string => {
  // Priority: localStorage > environment variable
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey && savedKey.trim().length > 0) {
    return savedKey.trim();
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY') {
    return envKey;
  }

  throw new Error('API Key chưa được cấu hình. Vui lòng nhập API key trong cài đặt.');
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const getMimeType = (file: File): string => {
  if (file.type) return file.type;

  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'm4a': return 'audio/m4a';
    case 'ogg': return 'audio/ogg';
    case 'aac': return 'audio/aac';
    case 'flac': return 'audio/flac';
    case 'mp4': return 'video/mp4';
    case 'm4p': return 'audio/mp4';
    default: return 'audio/mp3';
  }
};

// Giới hạn inlineData: file <= 20MB dùng base64, file > 20MB dùng File API
const INLINE_DATA_LIMIT = 20 * 1024 * 1024; // 20MB

// Timeout cho API call (10 phút)
const API_TIMEOUT_MS = 10 * 60 * 1000;

// Hàm tạo promise với timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

export const transcribeAudio = async (file: File): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const modelId = 'gemini-2.5-flash-preview-05-20';

    const systemPrompt = `
      Bạn là một chuyên gia bóc tách âm thanh và dịch thuật cao cấp. Nhiệm vụ của bạn là:
      
      1. TRÍCH XUẤT TOÀN BỘ: Chuyển đổi toàn bộ lời nói từ file âm thanh thành văn bản (Transcription). KHÔNG ĐƯỢC tóm tắt, lược bỏ hay bỏ qua bất kỳ đoạn hội thoại nào, kể cả những chi tiết nhỏ.
      2. DỊCH SANG TIẾNG VIỆT: Nếu ngôn ngữ trong âm thanh gốc không phải là Tiếng Việt (ví dụ: Tiếng Anh, Tiếng Nhật, Tiếng Trung...), hãy DỊCH TOÀN BỘ nội dung đó sang Tiếng Việt một cách chính xác và trôi chảy.
      3. PHÂN BIỆT NGƯỜI NÓI: Tự động nhận diện và tách biệt các người nói khác nhau (ví dụ: "Người nói 1:", "Người nói 2:",...). Nếu họ tự giới thiệu tên, hãy sử dụng tên của họ.
      4. ĐỊNH DẠNG: Trình bày kết quả bằng Markdown sạch đẹp. Đảm bảo tính trung thực tuyệt đối so với bản gốc.
      
      Hãy bắt đầu xử lý file âm thanh ngay bây giờ:
    `;

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    console.log(`[Transcribe] File: ${file.name}, Size: ${fileSizeMB}MB, MIME: ${getMimeType(file)}`);

    let response;

    if (file.size <= INLINE_DATA_LIMIT) {
      // File nhỏ (<= 20MB): dùng inlineData (base64)
      console.log('[Transcribe] Sử dụng inlineData (file nhỏ)');
      const base64Audio = await fileToBase64(file);
      const audioPart = {
        inlineData: {
          mimeType: getMimeType(file),
          data: base64Audio,
        },
      };

      response = await withTimeout(
        ai.models.generateContent({
          model: modelId,
          contents: {
            parts: [audioPart],
          },
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
          }
        }),
        API_TIMEOUT_MS,
        `Quá thời gian xử lý (10 phút). File ${fileSizeMB}MB có thể quá lớn. Hãy thử file nhỏ hơn hoặc cắt nhỏ file âm thanh.`
      );
    } else {
      // File lớn (> 20MB): upload qua File API trước
      console.log('[Transcribe] Sử dụng File API (file lớn > 20MB)');

      const uploadedFile = await withTimeout(
        ai.files.upload({
          file: file,
          config: {
            mimeType: getMimeType(file),
          },
        }),
        5 * 60 * 1000, // 5 phút để upload
        `Quá thời gian upload file (5 phút). Kiểm tra kết nối mạng và thử lại.`
      );

      console.log('[Transcribe] Upload xong, đang chờ xử lý...');

      // Chờ file được xử lý xong trên server
      let fileStatus = uploadedFile;
      let waitCount = 0;
      const maxWait = 60; // Tối đa 60 lần kiểm tra (5 phút)

      while (fileStatus.state === 'PROCESSING' && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Chờ 5 giây
        waitCount++;
        console.log(`[Transcribe] Đang chờ xử lý file... (${waitCount * 5}s)`);

        if (fileStatus.name) {
          const checkResult = await ai.files.get({ name: fileStatus.name });
          fileStatus = checkResult;
        }
      }

      if (fileStatus.state === 'FAILED') {
        throw new Error('File không thể xử lý được. Vui lòng thử file khác.');
      }

      response = await withTimeout(
        ai.models.generateContent({
          model: modelId,
          contents: {
            parts: [
              {
                fileData: {
                  fileUri: fileStatus.uri!,
                  mimeType: getMimeType(file),
                },
              },
            ],
          },
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
          }
        }),
        API_TIMEOUT_MS,
        `Quá thời gian phân tích nội dung (10 phút). File ${fileSizeMB}MB có thể quá dài. Hãy cắt nhỏ file âm thanh và thử lại.`
      );
    }

    if (response.text) {
      return response.text;
    } else {
      throw new Error("Không nhận được phản hồi từ AI.");
    }
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_EXPIRED");
    }
    if (error.message?.includes("Quá thời gian")) {
      throw error;
    }
    throw new Error(error.message || "Lỗi xử lý âm thanh.");
  }
};

/**
 * Generates a summary/meeting minutes from the transcribed text.
 */
export const summarizeTranscript = async (transcript: string, customPrompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: `Dưới đây là văn bản ghi chép cuộc họp:\n\n${transcript}\n\n--- Yêu cầu: ---\n${customPrompt}`,
        config: {
          temperature: 0.3,
        }
      }),
      API_TIMEOUT_MS,
      'Quá thời gian tạo biên bản (10 phút). Vui lòng thử lại.'
    );

    if (response.text) {
      return response.text;
    } else {
      throw new Error("Không thể tạo biên bản từ văn bản này.");
    }
  } catch (error: any) {
    throw new Error(error.message || "Lỗi khi tạo biên bản.");
  }
};
