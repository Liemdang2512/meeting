import React from 'react';

interface HomePageProps {
  onNavigate?: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', color: '#1e293b' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        .bg-dot-grid {
          background-image: radial-gradient(#cbd5e1 0.8px, transparent 0.8px);
          background-size: 24px 24px;
        }
        .mode-card { transition: all 0.2s ease; }
        .mode-card.active {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .shadow-soft {
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
        }
        .shadow-xl-soft {
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02);
        }
      `}</style>

      <div className="bg-dot-grid">
        {/* Sticky Navigation */}
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="https://neuronsai.net/assets/NAI.png" alt="NeuronsAI" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#0f172a' }}>
                  Neurons<span style={{ color: '#3b5bdb' }}>AI</span>
                </span>
              </div>

              {/* Desktop Nav */}
              <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <button onClick={() => handleNav('/pricing')} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>Bảng giá</button>
                <button onClick={() => handleNav('/login')} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
                >
                  Đăng ký
                </button>
              </nav>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section style={{ paddingTop: '80px', paddingBottom: '64px', padding: '80px 1rem 64px' }}>
            <div style={{ maxWidth: '896px', margin: '0 auto', textAlign: 'center' }}>
              <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, color: '#0f172a', marginBottom: '24px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                Ghi chép cuộc họp tự động bằng AI
              </h1>
              <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: '#475569', fontWeight: 500, marginBottom: '40px', maxWidth: '672px', margin: '0 auto 40px' }}>
                Chuyển đổi âm thanh và video thành văn bản chính xác chỉ trong vài giây.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ padding: '16px 40px', backgroundColor: '#2563eb', color: 'white', borderRadius: '9999px', cursor: 'pointer', fontWeight: 700, fontSize: '1.125rem', border: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
                >
                  Bắt đầu ngay
                </button>
              </div>
            </div>
          </section>

          {/* Product Interface Preview */}
          <section style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 1rem 96px' }}>
            <div style={{ background: 'white', borderRadius: '2.5rem', border: '1px solid #f1f5f9', overflow: 'hidden' }} className="shadow-xl-soft">
              <div style={{ padding: 'clamp(2rem, 5vw, 3.5rem)' }}>
                {/* Dashboard Title */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Ghi chép</h2>
                  <div>
                    <span style={{ padding: '4px 12px', background: '#eff6ff', color: '#2563eb', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gói miễn phí</span>
                  </div>
                </div>

                {/* Video Demo */}
                <div style={{ marginBottom: '40px', borderRadius: '1.5rem', overflow: 'hidden', background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                  <iframe
                    src="https://www.youtube.com/embed/4_pk6Kiv2Uw"
                    title="AI CoWorker AI Audio Transcribe with Verification and Summarization"
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>

                {/* Use Cases Grid */}
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dành cho ai?</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    {/* Phóng viên */}
                    <div className="mode-card" style={{ padding: '24px', borderRadius: '1.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.875rem' }}>🎙️</div>
                        <div>
                          <h4 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem' }}>Phóng viên</h4>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Báo chí</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', lineHeight: 1.6 }}>Ghi lại phỏng vấn, họp báo và hiện trường thành văn bản chính xác tức thì.</p>
                    </div>

                    {/* Nhân viên */}
                    <div className="mode-card active" style={{ padding: '24px', borderRadius: '1.5rem', border: '2px solid #2563eb', background: 'rgba(239,246,255,0.1)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.875rem' }}>💼</div>
                        <div>
                          <h4 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem' }}>Nhân viên</h4>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Doanh nghiệp</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', lineHeight: 1.6 }}>Tự động tạo biên bản họp, tóm tắt nội dung và danh sách việc cần làm sau cuộc họp.</p>
                    </div>

                    {/* Thư ký */}
                    <div className="mode-card" style={{ padding: '24px', borderRadius: '1.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.875rem' }}>📋</div>
                        <div>
                          <h4 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem' }}>Thư Ký Tòa</h4>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pháp lý</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', lineHeight: 1.6 }}>Ghi chép phiên tòa, lời khai và tranh luận pháp lý chính xác, đảm bảo tính pháp lý của hồ sơ.</p>
                    </div>

                  </div>

                  <button
                    onClick={() => handleNav('/register')}
                    style={{ width: '100%', padding: '20px', marginTop: '24px', backgroundColor: '#2563eb', color: 'white', fontWeight: 700, fontSize: '1.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 25px rgba(37,99,235,0.3)', transition: 'transform 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    Bắt đầu ghi chép
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section style={{ padding: '80px 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px 56px' }}>
                {[
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
                      </svg>
                    ),
                    bg: '#eff6ff',
                    title: 'Ghi chép không giới hạn',
                    desc: 'Không giới hạn số lần ghi chép. Chuyển đổi hàng nghìn giờ âm thanh và video với gói Không giới hạn.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                      </svg>
                    ),
                    bg: '#f5f3ff',
                    title: 'Độ chính xác 98%+',
                    desc: 'Được hỗ trợ bởi các mô hình AI Whisper mới nhất, cho kết quả chính xác với mọi loại âm thanh.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    ),
                    bg: '#ecfeff',
                    title: 'Xử lý siêu nhanh',
                    desc: 'Ghi chép hàng giờ âm thanh và video chỉ trong vài phút. Kết quả trả về gần như tức thì.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    ),
                    bg: '#f0fdf4',
                    title: '134+ ngôn ngữ',
                    desc: 'Hỗ trợ Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Nhật và hơn 134 ngôn ngữ khác trên toàn thế giới.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    ),
                    bg: '#fffbeb',
                    title: 'Hỗ trợ file lớn',
                    desc: 'Tải lên file dài đến 10 giờ, tối đa 5GB. Hỗ trợ MP3, MP4, WAV, M4A và nhiều định dạng khác.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                      </svg>
                    ),
                    bg: '#fff1f2',
                    title: 'Xuất linh hoạt',
                    desc: 'Xuất ra PDF, DOCX, TXT hoặc định dạng phụ đề SRT và VTT. Xuất nhiều file cùng lúc.',
                  },
                ].map(({ icon, bg, title, desc }) => (
                  <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
                    <p style={{ color: '#64748b', fontWeight: 500, lineHeight: 1.7, margin: 0, fontSize: '0.9rem' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section style={{ padding: '96px 1rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Giá cả đơn giản, minh bạch</h2>
              <p style={{ fontSize: '1.125rem', color: '#475569', fontWeight: 700 }}>Chọn gói phù hợp với công việc của bạn.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', maxWidth: '1100px', margin: '0 auto' }}>
              {/* Phóng viên */}
              <div style={{ background: 'white', padding: '40px', borderRadius: '2.5rem', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎙️</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Phóng viên</h3>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Báo chí</p>
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a' }}>$14.99</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8' }}> / tháng</span>
                </div>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {[
                    'Ghi chép không giới hạn',
                    'Phỏng vấn & họp báo tự động',
                    'Nhận diện nhiều người nói',
                    'Xuất PDF, DOCX, TXT',
                    '134+ ngôn ngữ',
                  ].map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontWeight: 600, color: '#475569', marginBottom: '12px', fontSize: '0.875rem' }}>
                      <span style={{ color: '#d97706', marginTop: '2px' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ width: '100%', padding: '14px', borderRadius: '9999px', border: '2px solid #d97706', fontWeight: 700, background: 'transparent', color: '#d97706', cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#d97706'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d97706'; }}
                >
                  Dùng thử ngay
                </button>
              </div>

              {/* Nhân viên — highlight */}
              <div style={{ background: '#0f172a', padding: '40px', borderRadius: '2.5rem', border: '1px solid #1e293b', color: 'white', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: '#2563eb', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '8px 16px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>Phổ biến nhất</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: '#1e3a5f', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💼</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Nhân viên</h3>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doanh nghiệp</p>
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 900 }}>$9.99</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}> / tháng</span>
                </div>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {[
                    'Ghi chép không giới hạn',
                    'Tự động tạo biên bản họp',
                    'Tóm tắt & danh sách việc cần làm',
                    'Tích hợp lịch & email',
                    'Xuất hàng loạt',
                  ].map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontWeight: 600, marginBottom: '12px', fontSize: '0.875rem' }}>
                      <span style={{ color: '#60a5fa', marginTop: '2px' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ width: '100%', padding: '14px', borderRadius: '9999px', background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 20px rgba(37,99,235,0.3)', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#3b82f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
                >
                  Bắt đầu ngay
                </button>
              </div>

              {/* Thư ký tòa */}
              <div style={{ background: 'white', padding: '40px', borderRadius: '2.5rem', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⚖️</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Thư ký tòa</h3>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pháp lý</p>
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a' }}>$19.99</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8' }}> / tháng</span>
                </div>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {[
                    'Ghi chép độ chính xác cao nhất',
                    'Nhận diện thuật ngữ pháp lý',
                    'Đánh dấu thời gian từng câu',
                    'Mã hóa & bảo mật tối đa',
                    'Xuất định dạng tòa án',
                  ].map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontWeight: 600, color: '#475569', marginBottom: '12px', fontSize: '0.875rem' }}>
                      <span style={{ color: '#16a34a', marginTop: '2px' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ width: '100%', padding: '14px', borderRadius: '9999px', border: '2px solid #16a34a', fontWeight: 700, background: 'transparent', color: '#16a34a', cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#16a34a'; }}
                >
                  Dùng thử ngay
                </button>
              </div>
            </div>
          </section>

          {/* Enterprise Section */}
          <section style={{ padding: '0 1rem 96px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', borderRadius: '2.5rem', padding: 'clamp(40px, 6vw, 72px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '40px' }}>
                <div style={{ flex: '1 1 400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(99,102,241,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>🏢</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#818cf8' }}>Doanh nghiệp</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: 'white', marginBottom: '16px', lineHeight: 1.2 }}>
                    Giải pháp tùy chỉnh<br />cho tổ chức của bạn
                  </h2>
                  <p style={{ color: '#94a3b8', fontWeight: 500, lineHeight: 1.7, marginBottom: '24px', maxWidth: '480px' }}>
                    Triển khai riêng, tích hợp API, quản lý người dùng tập trung, SLA cam kết và hỗ trợ ưu tiên 24/7. Phù hợp với các tổ chức từ 50 người trở lên.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '12px 32px', marginBottom: '8px' }}>
                    {['Triển khai on-premise / cloud riêng', 'Tích hợp API không giới hạn', 'Quản lý nhóm & phân quyền', 'SLA 99.9% uptime', 'Hỗ trợ kỹ thuật ưu tiên'].map(item => (
                      <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>
                        <span style={{ color: '#818cf8' }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '40px 48px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Bắt đầu từ</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>$499</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginBottom: '32px' }}>/tháng · tùy chỉnh theo nhu cầu</div>
                    <button
                      onClick={() => handleNav('/register')}
                      style={{ display: 'block', width: '100%', padding: '16px 32px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', transition: 'opacity 0.2s', marginBottom: '12px' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      Liên hệ tư vấn
                    </button>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Phản hồi trong vòng 24 giờ</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '80px 1rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '48px', marginBottom: '64px' }}>
              <div style={{ gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <img src="https://neuronsai.net/assets/NAI.png" alt="NeuronsAI" style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Neurons<span style={{ color: '#3b5bdb' }}>AI</span></span>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#94a3b8', lineHeight: 1.6 }}>Ghi chép cuộc họp bằng AI chính xác.</p>
              </div>
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a', marginBottom: '24px' }}>Sản phẩm</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {[['Bảng giá', '/pricing'], ['Tính năng', '/home']].map(([label, path]) => (
                    <li key={label} style={{ marginBottom: '16px' }}>
                      <button onClick={() => handleNav(path)} style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{label}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a', marginBottom: '24px' }}>Công cụ</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {['MP3 sang văn bản', 'MP4 sang văn bản', 'Video sang văn bản'].map(item => (
                    <li key={item} style={{ marginBottom: '16px' }}>
                      <button onClick={() => handleNav('/register')} style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a', marginBottom: '24px' }}>Pháp lý</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {['Chính sách bảo mật', 'Điều khoản sử dụng'].map(item => (
                    <li key={item} style={{ marginBottom: '16px' }}>
                      <button style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div style={{ paddingTop: '48px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>© 2026 Meeting AI. Bảo lưu mọi quyền.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
