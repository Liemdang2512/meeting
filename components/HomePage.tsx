import React, { useState } from 'react';

interface HomePageProps {
  onNavigate?: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(1);

  const handleNav = (path: string) => {
    setMobileOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen">

      <div className="bg-dot-grid">
        {/* Sticky Navigation */}
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
              {/* Logo */}
              <button
                type="button"
                onClick={() => handleNav('/')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="Về trang chủ"
              >
                <img src="https://neuronsai.net/assets/NAI.png" alt="NeuronsAI" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#0f172a' }}>
                  <span style={{ color: '#1e40af' }}>MOMAI</span>
                </span>
              </button>

              {/* Desktop Nav */}
              <nav className="desktop-nav" style={{ alignItems: 'center', gap: '32px' }}>
                <button onClick={() => handleNav('/pricing')} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>Bảng giá</button>
                <button onClick={() => handleNav('/login')} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ backgroundColor: '#1e40af', color: 'white', padding: '8px 20px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
                >
                  Đăng ký
                </button>
              </nav>

              {/* Hamburger Button */}
              <button
                className="hamburger-btn"
                onClick={() => setMobileOpen(o => !o)}
                style={{ alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'none', border: 'none', cursor: 'pointer', flexDirection: 'column', gap: '5px', padding: 0 }}
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                <span style={{ display: 'block', width: '22px', height: '2px', background: mobileOpen ? 'transparent' : '#0f172a', transition: 'all 0.2s' }} />
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#0f172a', transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none', transition: 'all 0.2s' }} />
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#0f172a', transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none', transition: 'all 0.2s' }} />
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileOpen && (
            <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => handleNav('/pricing')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#475569', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>Bảng giá</button>
              <button onClick={() => handleNav('/login')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#475569', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>Đăng nhập</button>
              <button
                onClick={() => handleNav('/register')}
                style={{ marginTop: '12px', padding: '14px', backgroundColor: '#1e40af', color: 'white', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
              >
                Đăng ký miễn phí
              </button>
            </div>
          )}
        </header>

        <main>
          {/* Hero Section */}
          <section style={{ padding: '80px 1rem 64px' }}>
            <div style={{ maxWidth: '896px', margin: '0 auto', textAlign: 'center' }}>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4.2vw, 3.15rem)', fontWeight: 900, color: '#0f172a', marginBottom: '24px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                THƯ KÝ AI 24/7 CỦA BẠN
              </h1>

              <p style={{ fontSize: 'clamp(0.88rem, 2vw, 1.2rem)', color: '#475569', fontWeight: 500, marginBottom: '24px', maxWidth: '672px', margin: '0 auto 24px' }}>
                Tự động chuyển đổi video, hình ảnh, âm thanh thành văn bản phù hợp chỉ trong vài giây với tính chính xác cao.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => handleNav('/register')}
                  style={{ padding: '16px 40px', backgroundColor: '#1e40af', color: 'white', borderRadius: '9999px', cursor: 'pointer', fontWeight: 700, fontSize: '1.125rem', border: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
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
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>GIỚI THIỆU</h2>
                </div>

                {/* Video Demo */}
                <div style={{ marginBottom: '20px', borderRadius: '1.5rem', overflow: 'hidden', background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                  <iframe
                    src="https://www.youtube.com/embed/4_pk6Kiv2Uw"
                    title="AI CoWorker AI Audio Transcribe with Verification and Summarization"
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '19px', marginBottom: '32px', flexWrap: 'wrap' }}>
                  {['NHANH CHÓNG', 'CHÍNH XÁC', 'DỄ SỬ DỤNG'].map((tag, i) => (
                    <span key={i} style={{ fontSize: '0.77rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '6px 16px', background: '#eff6ff', borderRadius: '9999px', border: '1px solid #bfdbfe' }}>{tag}</span>
                  ))}
                </div>

                {/* Use Cases Grid */}
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phù hợp với</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    {/* Phóng viên */}
                    <div className={`mode-card${activeCard === 0 ? ' active' : ''}`} onClick={() => setActiveCard(0)} style={{ padding: '24px', borderRadius: '1.5rem', border: activeCard === 0 ? '2px solid #1e40af' : '1px solid #e2e8f0', background: activeCard === 0 ? 'rgba(239,246,255,0.1)' : 'white', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem' }}>Phóng viên</h4>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Báo chí</p>
                        </div>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {['Không giới hạn thông tin tổng hợp', 'Phỏng vấn và viết bài tự động', 'Nhận diện nội dung', 'Chuyển đổi nhiều định dạng', '100+ ngôn ngữ'].map((item, i) => (
                          <li key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ color: '#d97706', flexShrink: 0, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Chuyên viên */}
                    <div className={`mode-card${activeCard === 1 ? ' active' : ''}`} onClick={() => setActiveCard(1)} style={{ padding: '24px', borderRadius: '1.5rem', border: activeCard === 1 ? '2px solid #1e40af' : '1px solid #e2e8f0', background: activeCard === 1 ? 'rgba(239,246,255,0.1)' : 'white', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem' }}>Chuyên viên</h4>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Doanh nghiệp</p>
                        </div>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {['Không giới hạn thông tin tổng hợp', 'Tự động tạo biên bản họp', 'Tóm tắt nội dung & danh sách việc cần làm', 'Tích hợp lịch & email', 'Quy trình chuẩn'].map((item, i) => (
                          <li key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ color: '#1e40af', flexShrink: 0, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cán bộ */}
                    <div className={`mode-card${activeCard === 2 ? ' active' : ''}`} onClick={() => setActiveCard(2)} style={{ padding: '24px', borderRadius: '1.5rem', border: activeCard === 2 ? '2px solid #1e40af' : '1px solid #e2e8f0', background: activeCard === 2 ? 'rgba(239,246,255,0.1)' : 'white', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem' }}>Cán bộ</h4>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pháp lý</p>
                        </div>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {['Ghi chép biên bản với độ chính xác cao', 'Nhận diện thuật ngữ pháp lý', 'Đánh dấu thời gian từng câu', 'Nhận diện giọng địa phương', 'Quy trình chuẩn tòa án'].map((item, i) => (
                          <li key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ color: '#16a34a', flexShrink: 0, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  <button
                    onClick={() => handleNav('/register')}
                    style={{ width: '100%', padding: '20px', marginTop: '24px', backgroundColor: '#1e40af', color: 'white', fontWeight: 700, fontSize: '1.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 25px rgba(37,99,235,0.3)', transition: 'transform 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    Bắt đầu ngay
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid — Tại sao chọn MoMai? */}
          <section style={{ padding: '80px 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>Tại sao chọn MoMai?</h2>
                <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#64748b' }}>Được xây dựng cho từng ngành nghề cụ thể</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '48px' }}>
                {[
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                      </svg>
                    ),
                    bg: '#eff6ff',
                    title: 'Tự động hoá 100%',
                    desc: 'Giảm thiểu 95% các tác vụ thủ công. AI tự động thực hiện các thao tác theo quy trình chuẩn giúp bạn có thêm nhiều thời gian.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
                      </svg>
                    ),
                    bg: '#eff6ff',
                    title: 'Không giới hạn',
                    desc: 'Không giới hạn số lần sử dụng. Chuyển đổi hàng nghìn file âm thanh và video với các gói dịch vụ phù hợp.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    ),
                    bg: '#f1f5f9',
                    title: 'Tiết kiệm chi phí',
                    desc: 'Tối ưu hóa ngân sách, thời gian cho bạn. Chỉ với chi phí nhỏ so với thuê nhân viên truyền thống hoặc các phần mềm riêng lẻ.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                      </svg>
                    ),
                    bg: '#eff6ff',
                    title: 'Độ chính xác 99%+',
                    desc: 'Được ứng dụng bởi các mô hình AI mới nhất cùng nền tảng huấn luyện AI riêng do Neurons AI xây dựng cho kết quả chính xác cao nhất.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    ),
                    bg: '#eff6ff',
                    title: 'Xử lý siêu nhanh',
                    desc: 'Ghi chép và tổng hợp hàng giờ âm thanh và video chỉ trong vài phút.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    ),
                    bg: '#f1f5f9',
                    title: '100+ ngôn ngữ',
                    desc: 'Hỗ trợ Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Nhật và hơn 100 ngôn ngữ khác trên toàn thế giới.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    ),
                    bg: '#f1f5f9',
                    title: 'Hỗ trợ nhiều định dạng',
                    desc: 'Tải lên file dài đến 5 giờ. Hỗ trợ MP3, MP4, WAV, M4A và nhiều định dạng khác.',
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                      </svg>
                    ),
                    bg: '#f1f5f9',
                    title: 'Hỗ trợ nhiều lựa chọn',
                    desc: 'Nền tảng cho phép lựa chọn định dạng sau khi tổng hợp: PDF, DOCX, Sơ đồ tư duy...',
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

          {/* Trusted By Section */}
          <section style={{ padding: '64px 1rem', background: '#f8fafc' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '36px' }}>Được tin dùng bởi</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                {[
                  { src: '/logo-htp.jpg', alt: 'Saigon Hi-Tech Park' },
                  { src: '/logo-tand.jpg', alt: 'Tòa Án Nhân Dân' },
                  { src: '/logo-giadinh.jpg', alt: 'Gia Dinh University' },
                  { src: '/logo-hiu.jpg', alt: 'HIU' },
                  { src: '/logo-thethao.jpg', alt: 'Thể Thao & Văn Hóa' },
                ].map((logo, i) => (
                  <div
                    key={i}
                    style={{
                      width: '160px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      style={{
                        maxWidth: '140px',
                        maxHeight: '64px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        filter: 'grayscale(20%)',
                        opacity: 0.85,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section style={{ padding: '96px 1rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Bảng giá linh hoạt</h2>
              <p style={{ fontSize: '1.125rem', color: '#475569', fontWeight: 700 }}>Đầu tư nhỏ, lợi ích lớn. Chọn gói phù hợp với bạn.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', maxWidth: '1100px', margin: '0 auto' }}>
              {/* Phóng viên */}
              <div style={{ background: 'white', padding: '40px', borderRadius: '2.5rem', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Phóng viên</h3>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Báo chí</p>
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a' }}>199.000</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8' }}> ₫ / tháng</span>
                </div>
                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {[
                    'Ghi chép không giới hạn',
                    'Phỏng vấn & họp báo tự động',
                    'Nhận diện nhiều người nói',
                    'Xuất PDF, DOCX, TXT',
                    '100+ ngôn ngữ',
                  ].map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontWeight: 600, color: '#475569', marginBottom: '12px', fontSize: '0.875rem' }}>
                      <span style={{ color: '#d97706', marginTop: '2px' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNav('/register')}
                  className="pricing-btn-amber"
                  style={{ width: '100%', padding: '14px', borderRadius: '9999px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
                >
                  Đăng ký ngay
                </button>
              </div>

              {/* Chuyên viên — highlight */}
              <div style={{ background: '#0f172a', padding: '40px', borderRadius: '2.5rem', border: '1px solid #1e293b', color: 'white', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: '#1e40af', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '8px 16px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>Phổ biến nhất</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: '#1e3a5f', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Chuyên viên</h3>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doanh nghiệp</p>
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 900 }}>499.000</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}> ₫ / tháng</span>
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
                      <span style={{ color: '#60a5fa', flexShrink: 0, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNav('/register')}
                  className="pricing-btn-blue"
                  style={{ width: '100%', padding: '14px', borderRadius: '9999px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }}
                >
                  Đăng ký ngay
                </button>
              </div>

              {/* Cán bộ */}
              <div style={{ background: 'white', padding: '40px', borderRadius: '2.5rem', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Cán bộ</h3>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pháp lý</p>
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a' }}>999.000</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8' }}> ₫ / tháng</span>
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
                  className="pricing-btn-green"
                  style={{ width: '100%', padding: '14px', borderRadius: '9999px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
                >
                  Đăng ký ngay
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
                    <div style={{ width: '48px', height: '48px', background: 'rgba(99,102,241,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                    </div>
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
                        <span style={{ color: '#818cf8', flexShrink: 0, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '40px 48px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Bắt đầu từ</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>4.900.000</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginBottom: '32px' }}>₫ / tháng · tùy chỉnh theo nhu cầu</div>
                    <button
                      onClick={() => handleNav('/register')}
                      className="pricing-btn-enterprise"
                    style={{ display: 'block', width: '100%', padding: '16px 32px', fontWeight: 700, borderRadius: '9999px', cursor: 'pointer', fontSize: '1rem', marginBottom: '12px' }}
                    >
                      Liên hệ ngay
                    </button>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Phản hồi trong vòng 24 giờ</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section style={{ padding: '80px 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>Câu hỏi thường gặp</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    q: 'MOMAI hỗ trợ những định dạng file nào?',
                    a: 'MOMAI hỗ trợ MP3, MP4, WAV, M4A, MOV và nhiều định dạng âm thanh, video phổ biến khác. Bạn cũng có thể tải lên file dài đến 5 giờ.',
                  },
                  {
                    q: 'Độ chính xác của AI đạt mức nào?',
                    a: 'Hệ thống đạt độ chính xác 99%+ nhờ kết hợp các mô hình AI mới nhất cùng nền tảng huấn luyện riêng của Neurons AI, được tối ưu đặc biệt cho tiếng Việt.',
                  },
                  {
                    q: 'Tôi có thể xuất kết quả ra định dạng nào?',
                    a: 'Bạn có thể xuất ra PDF, DOCX, TXT và Sơ đồ tư duy. Các định dạng phụ đề như SRT và VTT cũng được hỗ trợ.',
                  },
                  {
                    q: 'Dữ liệu của tôi có được bảo mật không?',
                    a: 'Chúng tôi áp dụng mã hóa đầu cuối và tuân thủ các tiêu chuẩn bảo mật quốc tế. Dữ liệu của bạn không bao giờ được chia sẻ với bên thứ ba.',
                  },
                  {
                    q: 'Có thể dùng thử miễn phí không?',
                    a: 'Có. Bạn có thể đăng ký và sử dụng gói miễn phí ngay hôm nay mà không cần nhập thông tin thẻ tín dụng.',
                  },
                ].map(({ q, a }, i) => (
                  <details key={i} style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '24px 28px', cursor: 'pointer' }}>
                    <summary style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {q}
                      <span className="faq-icon" style={{ color: '#1e40af', fontSize: '1.25rem', fontWeight: 400, marginLeft: '16px', flexShrink: 0 }}>+</span>
                    </summary>
                    <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 500, lineHeight: 1.7, margin: '16px 0 0' }}>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '80px 1rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '48px', marginBottom: '64px' }}>
              {/* Brand */}
              <div style={{ gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <img src="https://neuronsai.net/assets/NAI.png" alt="NeuronsAI" style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Neurons<span style={{ color: '#1e40af' }}>AI</span></span>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b', lineHeight: 1.7, marginBottom: '20px' }}>
                  MOMAI là nền tảng AI đa năng hỗ trợ ghi chép, tổng hợp thông tin và tự động hóa công việc văn phòng. Tăng năng suất với các mô hình AI hiệu quả và quy trình làm việc tự động mới nhất.
                </p>
                {/* Social icons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { label: 'Facebook', src: '/logo-facebook.png' },
                    { label: 'Zalo', src: '/logo-zalo.png' },
                    { label: 'Viber', src: '/logo-viber.png' },
                    { label: 'YouTube', src: '/logo-ytb.png' },
                  ].map(({ label, src }) => (
                    <button key={label} title={label} aria-label={label} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={src} alt={label} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tin tức */}
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a', marginBottom: '24px' }}>Tin tức</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {['Tin khuyến mãi', 'Thông báo', 'Tin công nghệ'].map(item => (
                    <li key={item} style={{ marginBottom: '16px' }}>
                      <button style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Thông tin cần thiết */}
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a', marginBottom: '24px' }}>Thông tin cần thiết</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {['Thoả thuận sử dụng', 'Chính sách bảo mật', 'Hướng dẫn sử dụng', 'Hướng dẫn thanh toán'].map(item => (
                    <li key={item} style={{ marginBottom: '16px' }}>
                      <button style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Về chúng tôi */}
              <div>
                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0f172a', marginBottom: '24px' }}>Về chúng tôi</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {['Câu chuyện', 'Giới thiệu', 'Liên hệ'].map(item => (
                    <li key={item} style={{ marginBottom: '16px' }}>
                      <button style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button>
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
