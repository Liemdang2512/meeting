
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { logTokenUsage } from "./tokenUsageService";
import type { TokenLoggingContext } from "../types";

// Helper function to get API key from localStorage or env
const getApiKey = (): string => {
  // Priority: localStorage > environment variable
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey && savedKey.trim().length > 0 && savedKey.trim() !== 'your_gemini_api_key_here') {
    return savedKey.trim();
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey !== 'your_gemini_api_key_here') {
    return envKey;
  }

  throw new Error('API Key chưa được cấu hình. Vui lòng nhập API key trong phần ⚙️ API Key ở góc trên bên phải.');
};


// Singleton AI instance — reuse across calls to avoid re-init overhead (~20-30ms/call)
let _aiInstance: GoogleGenAI | null = null;
let _aiInstanceKey: string = '';

function getAiInstance(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!_aiInstance || _aiInstanceKey !== apiKey) {
    _aiInstance = new GoogleGenAI({ apiKey });
    _aiInstanceKey = apiKey;
  }
  return _aiInstance;
}

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

export type AudioLanguage = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'other';

const PROMPT_VI = `
Bạn là chuyên gia phiên âm tiếng Việt. Nhiệm vụ:

1. PHIÊN ÂM NGUYÊN VĂN toàn bộ lời nói. Không tóm tắt, không bỏ sót.

2. XỬ LÝ TIẾNG ANH XEN LẪN:
   - GIỮ NGUYÊN nếu là thuật ngữ kỹ thuật, tên sản phẩm, tên công ty, tên riêng,
     hoặc người nói chủ ý dùng tiếng Anh trong câu tiếng Việt.
   - Ví dụ GIỮ NGUYÊN: API, deploy, sprint, backend, Figma, bug, feature,
     pull request, database, deadline, KPI, OKR, Google Meet, AI, app...
   - KHÔNG dịch sang tiếng Việt những từ này.

3. PHÂN BIỆT NGƯỜI NÓI: Nhận diện và tách ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

4. ĐỊNH DẠNG: Markdown sạch. Trung thực tuyệt đối với nội dung gốc.
`;

const PROMPT_EN = `
Bạn là chuyên gia phiên âm và dịch thuật Anh–Việt chuyên nghiệp. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. XƯNG HÔ & TÔNG GIỌNG:
   - Tiếng Anh không có hệ thống xưng hô — bạn phải suy luận từ ngữ cảnh:
     • Họp trang trọng / cấp trên: dùng "anh/chị", "tôi", thêm "ạ" khi phù hợp.
     • Đồng nghiệp ngang cấp: "anh/chị" hoặc "bạn/mình" tùy không khí.
     • Chỉ đạo / giao việc: giữ giọng trực tiếp, ít "ạ".
   - "We" của công ty → "chúng tôi"; "Let's all do this" → "chúng ta".
   - Giữ nguyên mức độ chắc chắn: might/could/may → "có thể"; should → "nên"; must → "phải".

3. TÊN RIÊNG:
   - Tên người phương Tây: GIỮ NGUYÊN (John Smith, Sarah Chen...). KHÔNG phiên âm sang tiếng Việt.
   - Tên công ty quốc tế: GIỮ NGUYÊN (Google, Microsoft, Deloitte, McKinsey...).
   - Tên sản phẩm/phần mềm: GIỮ NGUYÊN (Figma, Slack, Jira, Salesforce, PowerPoint...).

4. THUẬT NGỮ KỸ THUẬT & LOANWORD:
   GIỮ NGUYÊN bằng tiếng Anh (được dùng rộng rãi trong môi trường chuyên nghiệp Việt Nam):
   - IT: API, backend, frontend, deploy, sprint, bug, feature, pull request, pipeline, database, server, cloud, SaaS, DevOps, CI/CD, MVP, UX/UI
   - Business: KPI, OKR, ROI, SLA, roadmap, stakeholder, onboarding, pitch, fundraising, deadline
   - Marketing: SEO, SEM, CPM, CTR, funnel, landing page, A/B test, conversion rate
   - Finance: EBITDA, IPO, due diligence, runway, burn rate
   DỊCH SANG TIẾNG VIỆT: meeting → cuộc họp, project → dự án, report → báo cáo,
   presentation → bài trình bày, budget → ngân sách, follow-up → theo dõi.

5. SỐ LIỆU, NGÀY GIỜ, ĐƠN VỊ:
   - Số lớn: dùng đơn vị Việt (nghìn/triệu/tỷ). Luôn dùng chữ số Ả Rập.
   - Ngày: "March 17th, 2026" → "ngày 17 tháng 3 năm 2026".
   - "Q1 2026" → "Quý 1 năm 2026". "billion" → "tỷ"; "trillion" → "nghìn tỷ".
   - Tiền tệ: giữ mã tiền tệ (USD, VND, EUR).

6. THÀNH NGỮ & LỐI NÓI:
   Dịch theo NGHĨA, KHÔNG dịch theo nghĩa đen:
   - "think outside the box" → "suy nghĩ sáng tạo"
   - "low-hanging fruit" → "việc dễ làm trước, mục tiêu dễ đạt"
   - "move the needle" → "tạo ra sự khác biệt đáng kể"
   - "on the same page" → "đồng thuận, cùng quan điểm"
   - "circle back" → "quay lại vấn đề này sau"
   - "bandwidth" (năng lực cá nhân) → "thời gian/khả năng còn lại"
   - "drill down" → "đi sâu vào chi tiết"

7. TỪ ĐỆM & NGẬP NGỪNG: Bỏ hoàn toàn: um, uh, er, "you know" (filler), "like" (filler),
   "I mean" (khi chỉ nhắc lại). GIỮ LẠI khi có nghĩa: "actually" → "thực ra",
   "basically" → "về cơ bản", "to be honest" → "thành thật mà nói".

8. THỤ ĐỘNG → CHỦ ĐỘNG: Tiếng Anh dùng bị động nhiều → chuyển sang chủ động trong tiếng Việt khi biết chủ thể.
   "The decision was made" → "Ban lãnh đạo đã quyết định" (nếu rõ chủ thể).

9. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

10. KHÔNG NGHE RÕ: Ghi [không rõ]. Nếu nghe gần đúng: [không rõ - nghe giống "..."]. KHÔNG đoán bừa.

11. QUY ĐỊNH OUTPUT (RẤT QUAN TRỌNG):
    - CHỈ trả về nội dung hội thoại đã dịch sang tiếng Việt.
    - KHÔNG thêm tiêu đề, mô tả, lời giải thích, chú thích.
    - KHÔNG viết "Dưới đây là bản dịch", "Transcript:", "Bản dịch như sau".
    - Mỗi lượt nói là một dòng, bắt đầu bằng "Người nói X:" hoặc tên thật.

Ví dụ đúng:
Người nói 1: Hôm nay mình sẽ giới thiệu về kiến trúc backend của hệ thống.
Người nói 2: Vâng, anh có thể nói rõ hơn về phần API gateway không?
Người nói 1: Phần đó sẽ handle authentication và rate limiting cho toàn bộ service.
`;

const PROMPT_ZH = `
Bạn là chuyên gia phiên âm và dịch thuật Trung–Việt chuyên nghiệp. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. XƯNG HÔ & TÔNG GIỌNG:
   - "您" (nín) = kính ngữ → dùng "quý vị/anh/chị" + thêm "ạ" cuối câu.
   - "你" (nǐ) = thông thường → "anh/chị" (công việc), "bạn" (ngang cấp).
   - Chức danh xưng hô Trung Quốc: "王总" → "Giám đốc Vương"; "老师" (dùng như kính ngữ) → "anh/chị".
   - "我们" của công ty → "chúng tôi"; "我们大家" → "chúng ta".
   - Chủ ngữ bị lược → bổ sung từ ngữ cảnh: "已经发给你了" → "Tôi đã gửi cho anh/chị rồi".

3. TÊN RIÊNG:
   - Tên người Trung Quốc: ưu tiên âm Hán Việt nếu mapping rõ ràng (王伟 → Vương Vĩ).
     Nếu không chắc → dùng pinyin + ghi kèm: "Vương Vĩ (Wang Wei)".
     TUYỆT ĐỐI KHÔNG tự suy ra Hán Việt sai — khi nghi ngờ hãy dùng pinyin.
   - Tên địa danh lớn: dùng Hán Việt chuẩn: 北京 → Bắc Kinh, 上海 → Thượng Hải,
     深圳 → Thâm Quyến, 广州 → Quảng Châu.
   - Tên công ty quốc tế: GIỮ NGUYÊN (Alibaba, Tencent, Huawei, Baidu, ByteDance...).
   - Tên sản phẩm: GIỮ NGUYÊN (WeChat, Alipay, TikTok, Douyin...).

4. CẢNH BÁO FALSE FRIENDS (Hán Việt sai nghĩa):
   KHÔNG tự động dùng âm Hán Việt — một số từ Trung Quốc ≠ nghĩa Hán Việt tương đương:
   - 走 (zǒu) = đi/rời đi (KHÔNG phải "tẩu" = bỏ trốn)
   - 爱人 (àirén) = vợ/chồng ở Trung Quốc đại lục (KHÔNG phải "người tình")
   - 时节 (shíjié) = mùa/thời điểm (KHÔNG phải "thời tiết" = 天气)
   Luôn dịch theo NGHĨA trong ngữ cảnh, không dịch theo âm.

5. THUẬT NGỮ KỸ THUẬT:
   - Từ thuần Trung → dịch Việt: 软件 → phần mềm, 硬件 → phần cứng, 数据 → dữ liệu, 系统 → hệ thống.
   - Từ quốc tế/Anh trong tiếng Trung → GIỮ NGUYÊN: API, AI, IT, KPI, ROI, GDP.
   - Thuật ngữ chính sách Trung Quốc: 一带一路 → "Vành đai và Con đường".

6. SỐ LIỆU — RẤT QUAN TRỌNG (đơn vị Trung Quốc khác Việt Nam):
   Tiếng Trung nhóm theo ĐƠN VỊ VẠN (万), KHÔNG phải nghìn:
   - 1万 = 10.000 (mười nghìn)
   - 10万 = 100.000 (một trăm nghìn)
   - 100万 = 1.000.000 (một triệu)
   - 1000万 = 10.000.000 (mười triệu)
   - 1亿 = 100.000.000 (một trăm triệu)
   - 10亿 = 1.000.000.000 (một tỷ)
   - "三十亿" = 3 tỷ (KHÔNG phải 30 tỷ!)
   Ngày: "2026年3月17日" → "ngày 17 tháng 3 năm 2026".
   Tiền tệ: 人民币/RMB/CNY → "nhân dân tệ" hoặc giữ "CNY/RMB".

7. TỪ ĐỆM & NGẬP NGỪNG: Bỏ hoàn toàn: 那个/那个那个, 就是 (filler), 然后 (filler),
   对对对 (rút gọn thành "đúng vậy" nếu là xác nhận), 嗯, 啊/哦/哈.
   GIỮ LẠI khi có nghĩa: 对对对 khi xác nhận thực sự → "đúng vậy, chính xác".

8. THÀNH NGỮ (成语 — tứ tự thành ngữ): KHÔNG dịch nghĩa đen. Dịch ý nghĩa:
   - 事半功倍 → "hiệu quả gấp đôi", "một công đôi việc"
   - 马到成功 → "chúc thành công"
   - 未雨绸缪 → "chủ động phòng ngừa", "phòng xa"
   - 与时俱进 → "theo kịp thời đại"
   - 一石二鸟 → "một công hai việc"

9. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật (theo quy tắc tên ở trên).

10. KHÔNG NGHE RÕ: Ghi [không rõ]. Tên không rõ: [tên không rõ]. KHÔNG đoán bừa.

11. QUY ĐỊNH OUTPUT (RẤT QUAN TRỌNG):
    - CHỈ trả về nội dung hội thoại đã dịch sang tiếng Việt.
    - KHÔNG thêm tiêu đề, mô tả, lời giải thích, chú thích.
    - KHÔNG viết "Dưới đây là bản dịch", "Transcript:", "Bản dịch như sau".
    - Mỗi lượt nói là một dòng, bắt đầu bằng "Người nói X:" hoặc tên thật.

Ví dụ đúng:
Người nói 1: Hôm nay mình sẽ giới thiệu về kiến trúc backend của hệ thống.
Người nói 2: Vâng, anh có thể nói rõ hơn về phần API gateway không?
Người nói 1: Phần đó sẽ handle authentication và rate limiting cho toàn bộ service.
`;

const PROMPT_KO = `
Bạn là chuyên gia phiên âm và dịch thuật Hàn–Việt chuyên nghiệp. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. HỆ THỐNG KÍNH NGỮ TIẾNG HÀN (cực kỳ quan trọng):
   Tiếng Hàn có 4 cấp độ ngữ điệu bắt buộc — phải phản ánh vào tiếng Việt:
   - 합쇼체 (trang trọng cao): họp với lãnh đạo, thuyết trình chính thức
     → Việt: "kính thưa", "trân trọng", "chúng tôi xin", liberal dùng "ạ/dạ", từ ngữ lịch sự.
   - 해요체 (lịch sự thông thường): họp nghiệp vụ hằng ngày, khác cấp bậc
     → Việt: "anh/chị", "tôi", dùng "ạ" vừa phải, tông chuyên nghiệp.
   - 해라체 (mệnh lệnh/văn bản): chỉ đạo từ cấp trên, văn bản chính thức
     → Việt: giọng trực tiếp, ít "ạ", dùng mệnh lệnh thức tự nhiên.
   - 반말 (thân mật): đồng nghiệp cùng tuổi, bạn bè
     → Việt: "bạn/mình/cậu", ít "ạ/dạ", giọng thân thiện.
   Theo dõi SỰ CHUYỂN ĐỔI CẤP ĐỘ trong cùng một cuộc trò chuyện — phản ánh vào tông giọng dịch.

3. TỪ VỰNG KÍNH NGỮ ĐẶC BIỆT:
   - 드리다 (tặng/gửi cho người trên) → "kính gửi", "xin gửi"; 주다 → "gửi", "cho".
   - 여쭙다 (hỏi lịch sự) → "kính hỏi", "xin phép hỏi"; 묻다 → "hỏi".
   - 뵙다 (gặp mặt lịch sự) → "được hân hạnh gặp"; 만나다 → "gặp".
   - 말씀 (lời của người trên) → "lời anh/chị"; 말 → "lời".
   - 돌아가시다 (mất/qua đời - kính) → "qua đời"; 죽다 → "chết" (tránh dùng trực tiếp).
   - 계시다 (có mặt - kính) → "hiện diện", "đang có mặt"; 있다 → "có", "ở".

4. TÊN RIÊNG:
   - Tên người Hàn: phiên âm theo chuẩn Latin, GẠCH NỐI tên: 김민준 → Kim Min-jun,
     이지은 → Lee Ji-eun, 박서준 → Park Seo-jun. GIỮ thứ tự Họ–Tên.
     KHÔNG dùng âm Hán Việt cho tên Hàn.
   - Chức danh trong xưng hô: 대표님 → "Giám đốc [tên]", 부장님 → "Trưởng phòng [tên]",
     팀장님 → "Trưởng nhóm [tên]", 과장님 → "Trưởng bộ phận [tên]",
     대리님 → "Phụ trách [tên]", 선생님 → "anh/chị" (ngữ cảnh công sở).
   - Tên công ty Hàn lớn: GIỮ NGUYÊN (Samsung, LG, Hyundai, SK, Lotte, Kakao, Naver, Coupang).
   - Cơ quan chính phủ Hàn: dịch tên đầy đủ kèm "Hàn Quốc": 한국은행 → "Ngân hàng Trung ương Hàn Quốc".

5. KONGLISH — TỪ ANH ĐỌC THEO ÂM HÀN (cực kỳ dễ nhầm):
   Phải dịch về nghĩa gốc, KHÔNG giữ âm Hàn:
   - 프로젝트 → dự án | 미팅 (công việc) → cuộc họp | 미팅 (xã hội) → cuộc hẹn
   - 데드라인 → hạn chót/deadline | 피드백 → phản hồi/feedback
   - 프레젠테이션 → bài trình bày | 컨텐츠 → nội dung | 리포트 → báo cáo
   CẢNH BÁO FALSE FRIENDS (Konglish sai nghĩa):
   - 서비스 (nhà hàng) = món tặng thêm (KHÔNG phải "dịch vụ")
   - 핸드폰 = điện thoại di động | 헬스 = phòng gym
   - 아이쇼핑 = ngắm hàng không mua | 스킨십 = sự gần gũi thân thiết
   GIỮ NGUYÊN: API, KPI, OKR, ROI, YoY, QoQ, B2B, B2C, MVP, UX/UI, sprint, backlog.

6. SỐ LIỆU — RẤT QUAN TRỌNG (hai hệ số đếm):
   Tiếng Hàn dùng đơn vị VẠN (만) và ỨC (억):
   - 1만 = 10.000 (mười nghìn) | 10만 = 100.000 | 100만 = 1 triệu
   - 1000만 = 10 triệu | 1억 = 100 triệu | 10억 = 1 tỷ | 1조 = 1.000 tỷ
   - "1억" ≠ "1 billion" — 1억 = 100 triệu!
   Giờ: tiếng Hàn dùng đếm thuần Hàn cho giờ, Hán Hàn cho phút:
   "세 시 삼십 분" → "3 giờ 30 phút".
   Ngày: "2026년 3월 17일" → "ngày 17 tháng 3 năm 2026".
   Tiền tệ: 원(KRW/won) → "won" hoặc "KRW".

7. TỪ ĐỆM & NGẬP NGỪNG: Bỏ: 어/음, 그, 뭐지, 이제 (filler), 막, 뭐 (filler), 아/아아.
   네네네 → rút gọn thành "đúng/vâng" nếu là xác nhận, hoặc bỏ.
   GIỮ LẠI: 그러니까 (khi = "vì vậy/do đó" → không phải filler).

8. THÀNH NGỮ & TIẾNG LÓNG HIỆN ĐẠI:
   - 대박 → "thành công lớn", "tuyệt vời" | 파이팅/화이팅 → "cố lên!"
   - 내卷/열심히 하다 → "làm việc chăm chỉ", "nỗ lực"
   - 회식 → "tiệc công ty", "buổi ăn nhóm"
   - 눈치 → "nhạy cảm", "biết đọc tình huống"
   Tục ngữ Hàn → dịch ý nghĩa: 우물 안 개구리 → "ếch ngồi đáy giếng" (tiếng Việt có tương đương!).

9. CẤU TRÚC CÂU ĐẶC THÙ:
   - Tiếng Hàn đặt động từ cuối câu — chờ nghe hết câu rồi mới dịch (phủ định ở cuối).
   - Chủ đề (topic) ≠ chủ ngữ — tái cấu trúc sang tiếng Việt tự nhiên.
   - ~잖아 → "rõ ràng là", "bạn cũng biết mà" | ~거든 → "vì", "do là" | ~이야 → tuyên bố tự tin.

10. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
    Nếu người nói tự giới thiệu tên → dùng tên thật.

11. KHÔNG NGHE RÕ: Ghi [không rõ]. Tên không rõ: [tên không rõ]. KHÔNG đoán bừa.

12. QUY ĐỊNH OUTPUT (RẤT QUAN TRỌNG):
    - CHỈ trả về nội dung hội thoại đã dịch sang tiếng Việt.
    - KHÔNG thêm tiêu đề, mô tả, lời giải thích, chú thích.
    - KHÔNG viết "Dưới đây là bản dịch", "Transcript:", "Bản dịch như sau".
    - Mỗi lượt nói là một dòng, bắt đầu bằng "Người nói X:" hoặc tên thật.

Ví dụ đúng:
Người nói 1: Hôm nay mình sẽ giới thiệu về kiến trúc backend của hệ thống.
Người nói 2: Vâng, anh có thể nói rõ hơn về phần API gateway không?
Người nói 1: Phần đó sẽ handle authentication và rate limiting cho toàn bộ service.
`;

const PROMPT_JA = `
Bạn là chuyên gia phiên âm và dịch thuật Nhật–Việt chuyên nghiệp. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. HỆ THỐNG KÍNH NGỮ TIẾNG NHẬT (cực kỳ quan trọng):
   Tiếng Nhật có 3 cấp độ kính ngữ bắt buộc — phải phản ánh vào tiếng Việt:
   - 丁寧語 (Teineigo — lịch sự thông thường, dùng です/ます):
     → Việt: "anh/chị", "tôi", dùng "ạ" vừa phải, tông chuyên nghiệp.
   - 尊敬語 (Sonkeigo — tôn kính, nâng cao hành động người trên):
     → Việt: "kính thưa", "quý anh/chị", "xin trân trọng", liberal "ạ/dạ".
   - 謙譲語 (Kenjōgo — khiêm nhường, hạ thấp bản thân):
     → Việt: "bên chúng tôi xin", "chúng tôi trân trọng", nhún nhường vừa phải.
   - 普通体/タメ口 (thể thông thường, thân mật):
     → Việt: "bạn/mình/cậu", ít "ạ/dạ", giọng thân thiện.
   Theo dõi SỰ CHUYỂN ĐỔI CẤP ĐỘ trong cùng cuộc trò chuyện — phản ánh vào tông giọng dịch.

3. TỪ VỰNG KÍNH NGỮ ĐẶC BIỆT:
   - いただく (nhận/làm điều gì đó — khiêm nhường) → "chúng tôi xin được"; もらう → "nhận".
   - おっしゃる (nói — tôn kính) → "như anh/chị đã đề cập"; 言う → "nói".
   - いらっしゃる (ở/đến/đi — tôn kính) → "anh/chị đến/có mặt"; いる/来る/行く → "ở/đến/đi".
   - ご覧になる (xem — tôn kính) → "anh/chị xem qua"; 見る → "xem".
   - 申す (nói — khiêm nhường) → "chúng tôi xin trình bày"; 言う → "nói".
   - 参る (đến/đi — khiêm nhường) → "chúng tôi sẽ đến"; 来る/行く → "đến/đi".
   - 存じる (biết — khiêm nhường) → "chúng tôi được biết"; 知る → "biết".
   - 拝見する (xem — khiêm nhường) → "chúng tôi đã xem qua".

4. XƯNG HÔ & CHỦ NGỮ ẨN:
   - Tiếng Nhật hay lược bỏ chủ ngữ → bổ sung vào bản dịch Việt cho rõ ai làm/ai yêu cầu/ai chịu trách nhiệm.
   - Suy luận từ ngữ cảnh và quan hệ trên–dưới: 上司→cấp trên, 部下→nhân viên cấp dưới, 同僚→đồng nghiệp.
   - Chú ý phân biệt 私ども (chúng tôi — công ty) vs 私たち (chúng ta/chúng tôi — nhóm người).

5. TÊN RIÊNG:
   - Tên người Nhật: giữ nguyên thứ tự Họ–Tên (田中健 → Tanaka Ken; 山田花子 → Yamada Hanako).
     Dùng Romaji chuẩn Hepburn. KHÔNG dùng âm Hán Việt cho tên Nhật.
   - Chức danh trong xưng hô: 社長 → "Giám đốc [tên]", 部長 → "Trưởng phòng [tên]",
     課長 → "Trưởng bộ phận [tên]", 係長 → "Trưởng tổ [tên]",
     先輩 → "anh/chị [tên]" (ngữ cảnh công sở), 先生 → "thầy/cô" hoặc "anh/chị" (tùy ngữ cảnh).
   - Tên công ty Nhật: GIỮ NGUYÊN (Toyota, Sony, Rakuten, SoftBank, Panasonic, Fujitsu, NTT...).
   - Bộ phận/phòng ban: dịch Việt (営業部 → phòng kinh doanh; 総務部 → phòng hành chính; 開発部 → phòng phát triển; 人事部 → phòng nhân sự; 経理部 → phòng kế toán).

6. LOANWORD KATAKANA & WASEI-EIGO (和製英語 — cực kỳ dễ nhầm):
   Katakana thông thường → dịch về nghĩa gốc:
   - ミーティング → cuộc họp | プロジェクト → dự án | プレゼン → bài trình bày
   - スケジュール → lịch trình | リーダー → người phụ trách/trưởng nhóm
   - コンセンサス → đồng thuận | デッドライン → hạn chót | フィードバック → phản hồi
   CẢNH BÁO WASEI-EIGO (nghĩa khác tiếng Anh gốc):
   - マイペース (my pace) = làm theo nhịp của bản thân (KHÔNG phải "tốc độ của tôi")
   - バイキング (Viking) = buffet (KHÔNG phải người Viking)
   - サービス (service, trong nhà hàng) = tặng thêm miễn phí
   - ノルマ (norma) = chỉ tiêu/quota
   - リストラ (restructure) = cắt giảm nhân sự, sa thải
   GIỮ NGUYÊN: API, KPI, OKR, ROI, AI, IT, SDK, MVP, UX/UI, CI/CD, sprint, backlog.

7. SỐ LIỆU — RẤT QUAN TRỌNG (đơn vị Nhật giống Trung/Hàn):
   Tiếng Nhật nhóm theo ĐƠN VỊ VẠN (万), KHÔNG phải nghìn:
   - 1万 = 10.000 (mười nghìn)
   - 10万 = 100.000 (một trăm nghìn)
   - 100万 = 1.000.000 (một triệu)
   - 1000万 = 10.000.000 (mười triệu)
   - 1億 = 100.000.000 (một trăm triệu)
   - 10億 = 1.000.000.000 (một tỷ)
   - 1兆 = 1.000.000.000.000 (một nghìn tỷ)
   - "3億5千万" = 350 triệu (KHÔNG phải 35 tỷ!)
   Ngày: "2026年3月17日" → "ngày 17 tháng 3 năm 2026".
   Tiền tệ: 円/JPY/¥ → "yên" hoặc "JPY". Giữ nguyên mã tiền tệ quốc tế (USD, EUR...).

8. TỪ ĐỆM & NGẬP NGỪNG: Bỏ hoàn toàn: あの (ano), えーと/えっと (ēto), まあ (mā — khi là filler),
   なんか (nanka — filler), うーん (ūn), ねえ/ね (ne — khi chỉ là đệm câu), さあ (sā — filler).
   GIỨ LẠI khi có nghĩa thực:
   - そうですね / そうですよ → "đúng vậy", "đúng thế" (xác nhận thực sự)
   - やはり/やっぱり → "quả nhiên", "đúng như dự đoán"
   - まあ (khi là "thôi thì", "dù sao") → giữ lại với nghĩa tương đương.

9. THÀNH NGỮ & CÁCH DIỄN ĐẠT ĐẶC TRƯNG:
   Dịch theo NGHĨA, KHÔNG dịch nghĩa đen:
   - 一石二鳥 → "một công đôi việc" | 七転び八起き → "ngã nhiều lần nhưng luôn đứng dậy"
   - 猫の手も借りたい → "cực kỳ bận, cần thêm người giúp"
   - 取り越し苦労 → "lo lắng không cần thiết, lo bò trắng răng"
   - 気が置けない → "thân thiết, không cần đề phòng" (KHÔNG phải "không thể thả lỏng")
   - 馬が合う → "hợp nhau, ăn ý với nhau"
   Thành ngữ kinh doanh: 根回し → "vận động hành lang nội bộ, thống nhất trước khi họp chính thức".

10. CẤU TRÚC CÂU ĐẶC THÙ:
    - Tiếng Nhật đặt động từ CUỐI câu, PHỦ ĐỊNH ở cuối — chờ nghe hết câu mới dịch.
    - ～でしょうか → "có thể... không?" (hỏi lịch sự) | ～ないでしょうか → "liệu có thể... không?"
    - ～ていただけますか → "Anh/chị có thể... giúp tôi không?" (yêu cầu lịch sự)
    - ～と思われます → "có vẻ...", "dường như..." (không chắc chắn, khách quan)
    - ～かねます → "chúng tôi e rằng khó có thể..." (từ chối lịch sự)
    - ～させていただきます → "chúng tôi xin phép..." (xin phép lịch sự/làm gì đó)

11. MỨC ĐỘ CHẮC CHẮN:
    - と思います → "tôi nghĩ là...", "có lẽ..."
    - 〜かもしれません → "có thể...", "có khả năng..."
    - 〜でしょう → "chắc là...", "có lẽ..."
    - 必ず〜します / 絶対に → "nhất định sẽ...", "chắc chắn sẽ..."
    - 〜はずです → "đáng lẽ phải...", "chắc là..."

12. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
    Nếu người nói tự giới thiệu tên → dùng tên thật.

13. KHÔNG NGHE RÕ: Ghi [không rõ]. Tên không rõ: [tên không rõ]. KHÔNG đoán bừa.

14. QUY ĐỊNH OUTPUT (RẤT QUAN TRỌNG):
    - CHỈ trả về nội dung hội thoại đã dịch sang tiếng Việt.
    - KHÔNG thêm tiêu đề, mô tả, lời giải thích, chú thích.
    - KHÔNG viết "Dưới đây là bản dịch", "Transcript:", "Bản dịch như sau".
    - Mỗi lượt nói là một dòng, bắt đầu bằng "Người nói X:" hoặc tên thật.

Ví dụ đúng:
Người nói 1: Hôm nay mình sẽ giới thiệu về kiến trúc backend của hệ thống.
Người nói 2: Vâng, anh có thể nói rõ hơn về phần API gateway không?
Người nói 1: Phần đó sẽ handle authentication và rate limiting cho toàn bộ service.
`;

const buildPromptOther = (languageName: string) => `
Bạn là chuyên gia phiên âm và dịch thuật ${languageName}–Việt chuyên nghiệp. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. XƯNG HÔ & TÔNG GIỌNG:
   - Suy luận mức độ trang trọng từ ngữ cảnh (họp chính thức / thân mật / kỹ thuật).
   - Trang trọng → "anh/chị", "tôi", dùng "ạ" phù hợp.
   - Thân mật → "bạn/mình", ít "ạ" hơn.
   - Giữ nguyên mức độ chắc chắn: có thể / nhất định / nên...

3. TÊN RIÊNG:
   - Tên người: GIỮ NGUYÊN dạng gốc hoặc phiên âm chuẩn quốc tế của ngôn ngữ đó.
   - Tên công ty quốc tế: GIỮ NGUYÊN tên tiếng Anh/quốc tế.
   - Tên sản phẩm/thương hiệu: GIỮ NGUYÊN.
   - Địa danh nổi tiếng: dùng tên Việt nếu có chuẩn (Paris, Tokyo...), giữ nguyên nếu không.

4. THUẬT NGỮ KỸ THUẬT & LOANWORD:
   - GIỮ NGUYÊN: thuật ngữ kỹ thuật quốc tế không có từ tương đương tự nhiên trong tiếng Việt
     (API, KPI, OKR, ROI, AI, IT, software, hardware...).
   - DỊCH SANG TIẾNG VIỆT: từ thông thường có nghĩa tương đương rõ ràng.
   - Loanword từ ngôn ngữ nguồn đọc theo âm bản địa → dịch về nghĩa gốc.

5. SỐ LIỆU & NGÀY GIỜ:
   - Số lớn: dùng đơn vị Việt (nghìn/triệu/tỷ) + chữ số Ả Rập.
   - Chú ý đơn vị số đặc thù của ngôn ngữ nguồn — quy đổi chính xác trước khi dịch.
   - Ngày tháng: chuyển về format "ngày DD tháng MM năm YYYY".
   - Tiền tệ: giữ mã tiền tệ quốc tế (USD, EUR, JPY...).

6. TỪ ĐỆM & NGẬP NGỪNG: Bỏ các từ đệm, ngập ngừng vô nghĩa.
   GIỮ LẠI khi mang nghĩa: từ xác nhận, từ nhấn mạnh, từ kết nối logic.

7. THÀNH NGỮ & LỐI NÓI ĐỊA PHƯƠNG: Dịch theo NGHĨA, KHÔNG dịch nghĩa đen.
   Nếu không chắc nghĩa của thành ngữ → dịch nội dung theo ngữ cảnh tốt nhất có thể.

8. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

9. KHÔNG NGHE RÕ: Ghi [không rõ]. Tên không rõ: [tên không rõ]. KHÔNG đoán bừa.

10. QUY ĐỊNH OUTPUT (RẤT QUAN TRỌNG):
    - CHỈ trả về nội dung hội thoại đã dịch sang tiếng Việt.
    - KHÔNG được thêm tiêu đề, mô tả, lời giải thích, chú thích.
    - KHÔNG viết "Dưới đây là bản dịch", "Transcript:", "Bản dịch như sau".
   - Mỗi lượt nói là một dòng, bắt đầu bằng "Người nói X:" hoặc tên thật.

Ví dụ đúng:
Người nói 1: Hôm nay mình sẽ giới thiệu về kiến trúc backend của hệ thống.
Người nói 2: Vâng, anh có thể nói rõ hơn về phần API gateway không?
Người nói 1: Phần đó sẽ handle authentication và rate limiting cho toàn bộ service.
`;

const getAudioPrompt = (language: AudioLanguage, customLanguage?: string): string => {
  switch (language) {
    case 'vi': return PROMPT_VI;
    case 'en': return PROMPT_EN;
    case 'zh': return PROMPT_ZH;
    case 'ko': return PROMPT_KO;
    case 'ja': return PROMPT_JA;
    case 'other': return buildPromptOther(customLanguage?.trim() || 'ngôn ngữ khác');
  }
};

const getLangTranslationRules = (language: AudioLanguage, customLanguage?: string): string => {
  switch (language) {
    case 'en':
      return `
      3. XƯNG HÔ: Suy luận từ ngữ cảnh: trang trọng → "anh/chị/tôi" + "ạ"; ngang cấp → "bạn/mình".
         "We" (công ty) → "chúng tôi"; "let's all" → "chúng ta".
         Giữ mức độ chắc chắn: might/could/may → "có thể"; must → "phải"; should → "nên".
      4. TÊN RIÊNG: Tên người phương Tây GIỮ NGUYÊN. Tên công ty/sản phẩm quốc tế GIỮ NGUYÊN.
      5. THUẬT NGỮ: GIỮ NGUYÊN: API, backend, frontend, deploy, sprint, bug, KPI, OKR, ROI, roadmap,
         pipeline, SaaS, DevOps, CI/CD, MVP, UX/UI, SEO, EBITDA, IPO, deadline...
         DỊCH: meeting → cuộc họp, project → dự án, report → báo cáo, budget → ngân sách.
      6. SỐ LIỆU: billion → tỷ; trillion → nghìn tỷ. Ngày: "March 17" → "ngày 17 tháng 3".
      7. THÀNH NGỮ: dịch theo nghĩa: "low-hanging fruit" → "việc dễ làm trước";
         "move the needle" → "tạo ra sự khác biệt"; "on the same page" → "đồng thuận".
      8. BỊ ĐỘNG → CHỦ ĐỘNG khi biết chủ thể; bỏ từ đệm (um/uh/like/you know).`;
    case 'zh':
      return `
      3. QUY TẮC RIÊNG CHO TIẾNG TRUNG:
         - Xưng hô: "您" → trang trọng ("anh/chị" + "ạ"); "你" → thông thường. Chủ ngữ bị lược → bổ sung.
         - Tên người: ưu tiên Hán Việt nếu mapping rõ (王伟 → Vương Vĩ); không chắc → pinyin + ghi kèm.
           TRÁNH false friends: 走 = đi (không phải "tẩu"); 爱人 = vợ/chồng (không phải "người tình").
         - Địa danh lớn: Hán Việt chuẩn (北京→Bắc Kinh, 上海→Thượng Hải, 深圳→Thâm Quyến).
         - Tên công ty/sản phẩm quốc tế: GIỮ NGUYÊN (Alibaba, Tencent, WeChat, Alipay...).
         - Số đơn vị VẠN: 1万=10k, 1億=100 triệu, 10億=1 tỷ — KHÔNG nhầm với hệ nghìn phương Tây.
         - Thành ngữ 成语: dịch ý, không dịch nghĩa đen (未雨绸缪 → "chủ động phòng ngừa").
         - Từ đệm: bỏ 那个/就是/然后/对对对/嗯 khi là filler.`;
    case 'ko':
      return `
      3. QUY TẮC RIÊNG CHO TIẾNG HÀN:
         - Kính ngữ 합쇼체 → rất trang trọng: "kính thưa", "xin", "chúng tôi trân trọng", liberal "ạ/dạ".
           해요체 → lịch sự thông thường: "anh/chị/tôi", "ạ" vừa phải.
           반말 → thân mật: "bạn/mình/cậu", ít "ạ".
         - Từ vựng kính ngữ: 드리다 → "kính gửi"; 여쭙다 → "kính hỏi"; 말씀 → "lời anh/chị".
         - Tên người Hàn: phiên âm Latin có gạch nối (김민준 → Kim Min-jun). KHÔNG dùng Hán Việt.
         - Chức danh: 대표님 → "Giám đốc [tên]"; 부장님 → "Trưởng phòng"; 팀장님 → "Trưởng nhóm".
         - Konglish → dịch về nghĩa gốc: 프로젝트 → dự án, 미팅 → cuộc họp, 피드백 → phản hồi.
           False friends: 서비스 (nhà hàng) = món tặng; 헬스 = phòng gym.
         - Số đơn vị VẠN: 1만=10k, 1억=100 triệu, 10억=1 tỷ — "1억" ≠ "1 billion"!
         - GIỮ NGUYÊN: API, KPI, OKR, ROI, YoY, QoQ, B2B, MVP, sprint, backlog.
         - Từ đệm: bỏ 어/음, 그, 이제, 막, 네네네 (rút thành "đúng" nếu xác nhận).`;
    case 'ja':
      return `
      3. QUY TẮC RIÊNG CHO TIẾNG NHẬT:
         - Kính ngữ: 丁寧語 (です/ます) → "anh/chị/tôi" + "ạ" vừa phải.
           尊敬語 → rất trang trọng: "kính thưa", "quý anh/chị", liberal "ạ/dạ".
           謙譲語 → nhún nhường: "chúng tôi xin", "bên chúng tôi trân trọng".
           普通体 → thân mật: "bạn/mình", ít "ạ".
         - Từ vựng kính ngữ: いただく → "xin được/chúng tôi xin"; おっしゃる → "như anh/chị đề cập";
           いらっしゃる → "anh/chị có mặt"; 申す → "chúng tôi xin trình bày";
           参る → "chúng tôi sẽ đến"; 存じる → "chúng tôi được biết".
         - Chủ ngữ bị lược → bổ sung từ ngữ cảnh (ai làm, ai yêu cầu, ai chịu trách nhiệm).
         - Chức danh: 社長 → "Giám đốc [tên]"; 部長 → "Trưởng phòng"; 課長 → "Trưởng bộ phận";
           先輩 → "anh/chị [tên]" (công sở).
         - Tên người: Romaji chuẩn Hepburn, thứ tự Họ–Tên. Tên công ty GIỮ NGUYÊN.
           Bộ phận dịch Việt (営業部 → phòng kinh doanh; 開発部 → phòng phát triển; 人事部 → phòng nhân sự).
         - Katakana → dịch nghĩa: ミーティング → cuộc họp, プロジェクト → dự án, プレゼン → bài trình bày.
           WASEI-EIGO cảnh báo: リストラ = sa thải (KHÔNG phải "tái cơ cấu"); バイキング = buffet;
           サービス (nhà hàng) = tặng thêm; ノルマ = chỉ tiêu/quota.
           GIỮ NGUYÊN: API, KPI, OKR, ROI, AI, IT, MVP, sprint, backlog.
         - Số đơn vị VẠN: 1万=10k, 1億=100 triệu, 10億=1 tỷ, 1兆=1.000 tỷ — "1億" ≠ "1 billion"!
         - Mức độ chắc chắn: と思います → "tôi nghĩ"; かもしれません → "có thể";
           必ず/絶対に → "nhất định"; かねます → "e rằng khó có thể" (từ chối lịch sự).
         - Cấu trúc: động từ cuối câu, phủ định ở cuối — chờ hết câu mới dịch.
           させていただきます → "xin phép..."; ていただけますか → "anh/chị có thể... giúp không?"
         - Từ đệm: bỏ あの/えーと/なんか/うーん/さあ (filler). GIỬ LẠI: そうですね (xác nhận) → "đúng vậy";
           やはり/やっぱり → "quả nhiên".`;
    case 'other':
      return `
      3. GIỮ NGUYÊN: tên riêng, tên công ty, tên sản phẩm, thuật ngữ kỹ thuật quốc tế
         không có từ tương đương tự nhiên trong tiếng Việt.
         Ngôn ngữ nguồn: ${customLanguage?.trim() || 'ngôn ngữ khác'}.`;
    default:
      return '';
  }
};

// Gọi Gemini với file audio + system prompt
const runAudioAgent = async (
  file: File,
  systemPrompt: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = await fileToBase64(file);
  const contents = [
    { text: systemPrompt },
    { inlineData: { mimeType: getMimeType(file), data: base64Audio } },
  ];
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: { temperature: 0.1, maxOutputTokens: 65536 },
  });
  if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");

  const usage = (response as any).usageMetadata as
    | {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    }
    | undefined;

  if (userId && loggingContext) {
    void logTokenUsage({
      userId,
      feature: loggingContext.feature,
      actionType: loggingContext.actionType,
      model: 'gemini-3-flash-preview',
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      totalTokens:
        usage?.totalTokenCount ??
        (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null),
      metadata: loggingContext.metadata,
    });
  }

  return response.text;
};

// Gọi Gemini chỉ với text (không cần audio)
const runTextAgent = async (
  prompt: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { temperature: 0.1, maxOutputTokens: 65536 },
  });
  if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");

  const usage = (response as any).usageMetadata as
    | {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    }
    | undefined;

  if (userId && loggingContext) {
    void logTokenUsage({
      userId,
      feature: loggingContext.feature,
      actionType: loggingContext.actionType,
      model: 'gemini-3-flash-preview',
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      totalTokens:
        usage?.totalTokenCount ??
        (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null),
      metadata: loggingContext.metadata,
    });
  }

  return response.text;
};

// Luồng 1: Phiên âm cơ bản (1 agent)
export const transcribeBasic = async (
  file: File,
  language: AudioLanguage = 'vi',
  customLanguage?: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
  systemHint?: string,
): Promise<string> => {
  try {
    const basePrompt = getAudioPrompt(language, customLanguage);
    const fullPrompt = systemHint ? `${basePrompt}\n\nNGỮ CẢNH BỔ SUNG: ${systemHint}` : basePrompt;
    return await runAudioAgent(file, fullPrompt, loggingContext, userId);
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi xử lý âm thanh.");
  }
};

// Giữ tên cũ để không breaking change ở chỗ khác
export const transcribeAudio = transcribeBasic;

export type DeepProgressCallback = (step: 1 | 2 | 3, label: string) => void;

// Luồng 2: Phiên âm chuyên sâu (3 agent tuần tự)
export const transcribeDeep = async (
  file: File,
  onProgress?: DeepProgressCallback,
  language: AudioLanguage = 'vi',
  customLanguage?: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
  systemHint?: string,
): Promise<string> => {
  try {
    // Agent 1: Phiên âm nguyên văn, giữ ngôn ngữ gốc
    const sourceLangLabel = language === 'other'
      ? (customLanguage?.trim() || 'ngôn ngữ khác')
      : { vi: 'tiếng Việt', en: 'tiếng Anh', zh: 'tiếng Trung', ko: 'tiếng Hàn', ja: 'tiếng Nhật' }[language];
    onProgress?.(1, 'Đang phiên âm nguyên văn...');
    const agent1Prompt = `
      Nhiệm vụ DUY NHẤT của bạn: Phiên âm toàn bộ lời nói trong file âm thanh.
      Ngôn ngữ chính trong file: ${sourceLangLabel}.
      - Ghi NGUYÊN VĂN theo ngôn ngữ gốc, KHÔNG dịch bất cứ thứ gì.
      - Phân biệt người nói (Người nói 1, Người nói 2...).
        Nếu người nói tự giới thiệu tên → dùng tên thật.
      - Không bỏ sót bất kỳ đoạn nào dù nhỏ.
      - Định dạng Markdown sạch.
    ${systemHint ? `\n\nNGỮ CẢNH BỔ SUNG: ${systemHint}` : ''}`;
    const rawTranscript = await runAudioAgent(
      file,
      agent1Prompt,
      loggingContext,
      userId,
    );

    // Agent 2: Dịch & chuẩn hóa ngôn ngữ
    onProgress?.(2, 'Đang dịch và chuẩn hóa ngôn ngữ...');
    const rules = getLangTranslationRules(language, customLanguage);
    const translatedTranscript = await runTextAgent(
      `
      Bạn nhận được bản phiên âm nguyên văn bằng ${sourceLangLabel} từ một cuộc họp.

      Nhiệm vụ:
      1. Dịch toàn bộ nội dung sang tiếng Việt theo NGHĨA và NGỮ CẢNH, không dịch từng chữ.
      2. Giữ nguyên tông giọng người nói (trang trọng / thân mật).
      ${rules}
      3. Nếu không chắc nghĩa → ghi [không rõ], KHÔNG đoán bừa.
      4. Giữ nguyên cấu trúc người nói và format Markdown. Output bằng tiếng Việt.

      Bản phiên âm gốc (${sourceLangLabel}):
      ${rawTranscript}
    `,
      loggingContext,
      userId,
    );

    // Agent 3: Review & kiểm tra ngữ cảnh
    onProgress?.(3, 'Đang kiểm tra và hiệu chỉnh ngữ cảnh...');
    const jaReviewNote = language === 'ja' ? `
      LƯU Ý TIẾNG NHẬT: Kiểm tra thêm:
      - Mức độ chắc chắn (と思います / かもしれません / 必ず / かねます) có được dịch đúng sắc thái không
      - Xưng hô và chủ ngữ ẩn có được bổ sung rõ ràng (ai làm, ai yêu cầu) không
      - Kính ngữ (尊敬語/謙譲語/丁寧語/普通体) có phản ánh đúng tông giọng không
      - Wasei-eigo có bị dịch sai nghĩa (リストラ/バイキング/ノルマ...) không
      - Số đơn vị vạn/ức/兆 có bị nhầm không (1億 = 100 triệu, không phải 1 tỷ)
      - Động từ/phủ định cuối câu có bị dịch thiếu/sai không
    ` : '';
    const finalTranscript = await runTextAgent(
      `
      Bạn là editor chuyên kiểm tra chất lượng phiên âm và dịch thuật.
      Bạn có hai bản:
      - [GỐC]: Bản phiên âm nguyên văn
      - [ĐÃ DỊCH]: Bản đã qua xử lý ngôn ngữ
      ${jaReviewNote}
      Nhiệm vụ: So sánh từng đoạn và CHỈ SỬA khi:
      - Bản dịch sai nghĩa so với ngữ cảnh gốc
      - Thuật ngữ kỹ thuật bị dịch sai hoặc không cần thiết phải dịch
      - Câu bị mất nghĩa hoặc thêm nghĩa không có trong gốc
      - Tông giọng bị thay đổi không đúng (trang trọng ↔ thân mật)

      KHÔNG ĐƯỢC:
      - Tóm tắt nội dung (làm ngắn đi so với [ĐÃ DỊCH]).
      - Thêm nội dung mới không có trong [GỐC] hoặc [ĐÃ DỊCH].
      - Viết bất kỳ câu bình luận nào như "Bản dịch đã tốt", "Tôi đã chỉnh sửa", "Bản dịch sau khi hiệu chỉnh như sau...".

      CHỈ ĐƯỢC:
      - Sửa khi bản dịch sai nghĩa so với [GỐC].
      - Sửa khi thuật ngữ kỹ thuật bị dịch sai hoặc không cần thiết phải dịch.
      - Sửa khi tông giọng (trang trọng/thân mật) bị lệch rõ ràng.

      Trả về TRỰC TIẾP nội dung cuộc họp bằng tiếng Việt, không thêm bất kỳ bình luận hay giải thích nào.

      [GỐC]:
      ${rawTranscript}

      [ĐÃ DỊCH]:
      ${translatedTranscript}
    `,
      loggingContext,
      userId,
    );

    return finalTranscript;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi xử lý âm thanh chuyên sâu.");
  }
};

/**
 * Synthesizes multiple transcriptions from multiple audio files into one coherent document.
 */
export const synthesizeTranscriptions = async (
  transcriptions: { name: string; text: string }[],
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const combined = transcriptions
    .map((t, i) => `## File ${i + 1}: ${t.name}\n\n${t.text}`)
    .join('\n\n---\n\n');

  const prompt = `Dưới đây là văn bản ghi chép từ ${transcriptions.length} file ghi âm của cùng một cuộc họp, theo đúng thứ tự thời gian:

${combined}

---

**YÊU CẦU:** Hãy tổng hợp tất cả các file trên thành MỘT VĂN BẢN DUY NHẤT, liên tục và mạch lạc theo đúng thứ tự thời gian. Các quy tắc bắt buộc:
- KHÔNG ĐƯỢC lược bỏ bất kỳ nội dung, chi tiết, hay đoạn hội thoại nào
- Nếu có phần trùng lặp ở đầu/cuối các file (do ghi âm chồng lên nhau), chỉ giữ lại một lần
- Giữ nguyên tên người nói và định dạng Markdown
- Kết quả phải là một văn bản hoàn chỉnh, liền mạch như thể ghi từ một cuộc họp liên tục`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.1 },
    });

    if (!response.text) {
      throw new Error("Không nhận được phản hồi khi tổng hợp.");
    }

    const usage = (response as any).usageMetadata as
      | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
      | undefined;

    if (userId && loggingContext) {
      void logTokenUsage({
        userId,
        feature: loggingContext.feature,
        actionType: loggingContext.actionType,
        model: 'gemini-3-flash-preview',
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens:
          usage?.totalTokenCount ??
          (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
            ? usage.promptTokenCount + usage.candidatesTokenCount
            : null),
        metadata: loggingContext.metadata,
      });
    }

    return response.text;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi khi tổng hợp nội dung các file.");
  }
};

/**
 * Generates a summary/meeting minutes from the transcribed text.
 */
export const summarizeTranscript = async (
  transcript: string,
  customPrompt: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  // Always create a new instance to use the most up-to-date API key
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Dưới đây là văn bản ghi chép cuộc họp:\n\n${transcript}\n\n--- Yêu cầu: ---\n${customPrompt}`,
      config: {
        temperature: 0.3,
      }
    });

    if (!response.text) {
      throw new Error("Không thể tạo biên bản từ văn bản này.");
    }

    const usage = (response as any).usageMetadata as
      | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
      | undefined;

    if (userId && loggingContext) {
      void logTokenUsage({
        userId,
        feature: loggingContext.feature,
        actionType: loggingContext.actionType,
        model: 'gemini-3-flash-preview',
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens:
          usage?.totalTokenCount ??
          (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
            ? usage.promptTokenCount + usage.candidatesTokenCount
            : null),
        metadata: loggingContext.metadata,
      });
    }

    return response.text;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi khi tạo biên bản.");
  }
};

/**
 * Attempt to repair common JSON issues produced by LLMs:
 * - Unquoted property keys: {root: ...} -> {"root": ...}
 * - Single-quoted strings: {'key': 'val'} -> {"key": "val"}
 * Returns the repaired string, or the original if no repair was possible.
 */
function repairJson(text: string): string {
  // Replace single-quoted strings with double-quoted (careful not to touch already double-quoted)
  let result = text;
  // Quote bare identifier keys: word characters before a colon that aren't already quoted
  // Matches: word_chars : (not inside a string)
  result = result.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
  return result;
}

/**
 * Calls Gemini with structured JSON output enforced via responseMimeType and responseJsonSchema.
 * Uses Zod schema as the single source of truth for both schema generation and response validation.
 * Logs token usage the same way as runTextAgent.
 */
export const generateStructured = async <T>(
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
  options?: { useResponseSchema?: boolean },
): Promise<T> => {
  const ai = getAiInstance();
  const useResponseSchema = options?.useResponseSchema ?? true;

  // Only convert to JSON Schema when Gemini needs it — transforms can't be serialized
  const jsonSchema = useResponseSchema
    ? (() => { const { $schema: _drop, ...s } = z.toJSONSchema(schema) as any; return s; })()
    : undefined;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        ...(useResponseSchema ? { responseSchema: jsonSchema as any } : {}),
      },
    });

    if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");

    // Extract JSON from response — handle markdown wrappers and stray text
    let rawText = response.text.trim();
    // Try to extract JSON block from anywhere in the text
    const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      rawText = jsonBlockMatch[1].trim();
    } else {
      // Find first { or [ and last } or ] to extract raw JSON
      const firstBrace = rawText.search(/[{[]/);
      const lastBrace = Math.max(rawText.lastIndexOf('}'), rawText.lastIndexOf(']'));
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        rawText = rawText.slice(firstBrace, lastBrace + 1);
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('[generateStructured] JSON parse failed. Response length:', rawText.length);
      const repaired = repairJson(rawText);
      try {
        parsed = JSON.parse(repaired);
      } catch {
        throw new Error('Gemini trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
      }
    }

    const validated = schema.parse(parsed);

    const usage = (response as any).usageMetadata as
      | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
      | undefined;

    if (userId && loggingContext) {
      void logTokenUsage({
        userId,
        feature: loggingContext.feature,
        actionType: loggingContext.actionType,
        model: 'gemini-3-flash-preview',
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens:
          usage?.totalTokenCount ??
          (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
            ? usage.promptTokenCount + usage.candidatesTokenCount
            : null),
        metadata: loggingContext.metadata,
      });
    }

    return validated;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    if (error instanceof z.ZodError) {
      throw new Error(`Gemini trả về dữ liệu không đúng định dạng: ${error.message}`);
    }
    throw new Error(error.message || "Lỗi khi gọi Gemini structured output.");
  }
};
