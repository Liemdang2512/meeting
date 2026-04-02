import React, { useState, useEffect } from 'react';

interface HomePageProps {
  onNavigate?: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeSection, setActiveSection] = useState<string>('main-content');

  useEffect(() => {
    const sectionIds = ['main-content', 'features', 'pricing', 'faq'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNav = (path: string) => {
    setMobileOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const faqs = [
    {
      q: 'MoMai AI có hỗ trợ nhận diện tiếng Việt tốt không?',
      a: 'Có, MoMai AI được tối ưu hóa đặc biệt cho tiếng Việt với khả năng nhận diện đa vùng miền (Bắc, Trung, Nam) và xử lý tốt các từ mượn chuyên ngành.',
    },
    {
      q: 'Dữ liệu của tôi có được bảo mật không?',
      a: 'Tất cả dữ liệu được mã hóa SSL/TLS 1.3 và tự động xóa sau khi xử lý trừ khi người dùng chọn lưu trữ trên đám mây bảo mật của chúng tôi.',
    },
    {
      q: 'Tôi có thể hủy gói dịch vụ bất kỳ lúc nào không?',
      a: 'Hoàn toàn được. Bạn có thể quản lý và hủy gia hạn ngay trong mục cài đặt tài khoản mà không có bất kỳ cam kết ràng buộc nào.',
    },
    {
      q: 'Hệ thống có thể phân biệt được bao nhiêu người nói?',
      a: 'MoMai AI có thể phân biệt và gán nhãn lên đến 10 người nói trong cùng một cuộc họp. Tính năng diarization (phân tách giọng nói) hoạt động tự động.',
    },
    {
      q: 'MOMAI hỗ trợ những định dạng file nào?',
      a: 'MOMAI hỗ trợ MP3, MP4, WAV, M4A, MOV và nhiều định dạng âm thanh, video phổ biến khác. Bạn cũng có thể tải lên file dài đến 5 giờ.',
    },
  ];

  const features = [
    {
      icon: 'smart_toy',
      title: 'Tự động hoá 100%',
      desc: 'Loại bỏ hoàn toàn thao tác thủ công. Chỉ cần tải lên các nội dung cần tổng hợp, AI sẽ xử lý mọi khâu từ phân tách người nói đến tóm tắt ý chính và hoàn thiện quy trình theo quy chuẩn.',
      isPrimary: false,
    },
    {
      icon: 'verified',
      title: 'Độ chính xác 98%+',
      desc: 'Ứng dụng các công nghệ AI tiên tiến cùng việc làm chủ nền tảng huấn luyện AI giúp nhận diện giọng nói tiếng Việt chuẩn xác, bất kể đặc thù vùng miền hay tiếng ồn môi trường.',
      isPrimary: true,
    },
    {
      icon: 'bolt',
      title: 'Xử lý siêu nhanh',
      desc: 'Xử lý các nội dung âm thanh, hình ảnh chỉ trong vòng vài phút. Nhận kết quả gần như tức thì với độ chính xác cao.',
      isPrimary: false,
    },
    {
      icon: 'language',
      title: 'Đa dạng ngôn ngữ',
      desc: 'Hỗ trợ hơn 100 ngôn ngữ trên thế giới, am hiểu ngôn ngữ địa phương và nhận diện ngữ cảnh thông minh.',
      isPrimary: false,
    },
    {
      icon: 'account_balance_wallet',
      title: 'Tiết kiệm chi phí',
      desc: 'Tối ưu hóa ngân sách, thời gian. Chỉ với chi phí nhỏ so với thuê nhân viên truyền thống hoặc các phần mềm riêng lẻ.',
      isPrimary: false,
    },
    {
      icon: 'all_inclusive',
      title: 'Không giới hạn',
      desc: 'Không giới hạn số lần sử dụng. Chuyển đổi hàng nghìn file âm thanh và video với các gói dịch vụ phù hợp.',
      isPrimary: false,
    },
    {
      icon: 'description',
      title: 'Đa dạng định dạng',
      desc: 'Hỗ trợ chuyển đổi nhiều định dạng: MP3, MP4, WAV, M4A... sang nội dung tổng hợp với các định dạng: PDF, docx, Sơ đồ tư duy...',
      isPrimary: false,
    },
    {
      icon: 'groups',
      title: 'Phù hợp doanh nghiệp, đội ngũ',
      desc: 'Hệ thống được vận hành theo quy trình chuẩn, phù hợp với doanh nghiệp, đội ngũ. Chia sẻ nội dung được tổng hợp tự động đến toàn bộ thành viên ngay khi cuộc họp kết thúc.',
      isPrimary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:text-primary focus:font-bold focus:ring-2 focus:ring-primary">Bỏ qua điều hướng</a>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="grid grid-cols-3 items-center w-full px-10 py-4 max-w-[1440px] mx-auto">

          {/* Logo — trái */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="flex items-center gap-3 w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
          >
            {/* App icon */}
            <img 
              src="https://neuronsai.net/assets/NAI.png" 
              alt="MOMAI Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-sm font-bold text-on-background tracking-tight whitespace-nowrap font-headline">
              Meeting Minute AI
            </span>
          </button>

          {/* Nav links — giữa */}
          <div className="hidden md:flex items-center justify-center gap-8">
            {([
              { label: 'Sản phẩm', section: 'main-content' },
              { label: 'Tính năng', section: 'features' },
              { label: 'Bảng giá', section: 'pricing' },
              { label: 'Q&A', section: 'faq' },
            ] as { label: string; section: string }[]).map(({ label, section }) => {
              const isActive = activeSection === section;
              return (
                <button
                  key={section}
                  onClick={() => scrollTo(section)}
                  aria-current={isActive ? 'true' : undefined}
                  className="text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #4E45E4' : '2px solid transparent',
                    paddingBottom: '3px',
                    cursor: 'pointer',
                    color: isActive ? '#4E45E4' : '#464555',
                  }}
                >{label}</button>
              );
            })}
          </div>

          {/* CTA + Hamburger — phải */}
          <div className="flex items-center justify-end gap-4">
            {/* Desktop */}
            <button
              onClick={() => handleNav('/login')}
              className="hidden md:block text-sm font-semibold text-[#464555] hover:text-[#4E45E4] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-3 py-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >Đăng nhập</button>
            <button
              onClick={() => handleNav('/register')}
              className="hidden md:block text-sm font-bold text-white px-6 py-2.5 rounded-full signature-gradient hover:opacity-90 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Đăng ký
            </button>
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              onClick={() => setMobileOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              aria-label="Menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#213156', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#213156', transition: 'all 0.2s', opacity: mobileOpen ? 0 : 1 }} />
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#213156', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
            </button>
          </div>

        </div>{/* end grid */}

        {/* Mobile drawer */}
        {mobileOpen && (
          <div id="mobile-menu" className="md:hidden bg-white border-t border-gray-100" style={{ padding: '16px 32px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button onClick={() => handleNav('/')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Sản phẩm</button>
            <button onClick={() => { setMobileOpen(false); const el = document.getElementById('features'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Tính năng</button>
            <button onClick={() => { setMobileOpen(false); const el = document.getElementById('pricing'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Bảng giá</button>
            <button onClick={() => { setMobileOpen(false); const el = document.getElementById('faq'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Q&A</button>
            <button onClick={() => handleNav('/login')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
            <button
              onClick={() => handleNav('/register')}
              className="signature-gradient text-white"
              style={{ marginTop: '12px', padding: '14px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Đăng ký
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header id="main-content" className="relative pt-28 lg:pt-48 pb-16 lg:pb-32 overflow-hidden" style={{ background: 'linear-gradient(160deg, #f5f3ff 0%, #faf8ff 40%, #ede9fe 100%)' }}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div style={{ position: 'absolute', top: '10%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(78,69,228,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', top: '30%', right: '-8%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(116,47,229,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        </div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 z-10">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8 signature-gradient shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1, 'wght' 400" }}>workspace_premium</span>
              <span className="text-xs font-body font-semibold uppercase tracking-[0.15em] text-white">Được ủng hộ bởi: <strong className="font-extrabold">500+</strong> chuyên viên, phóng viên tại Việt Nam</span>
            </div>
            <h1 className="font-headline font-extrabold leading-[1.1] text-on-background tracking-tighter mb-8" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
              Thư ký AI dành cho bạn
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed mb-12 max-w-2xl">
              Biến mọi cuộc họp, trao đổi thông tin thành <span style={{ background: 'linear-gradient(135deg, #4e45e4 0%, #742fe5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>tri thức</span> có cấu trúc. Tự động chuyển âm thanh, video, hình ảnh thành văn bản và tóm tắt thông tin quan trọng chỉ trong vài giây.
            </p>
            <div className="flex flex-wrap gap-6">
              <button
                onClick={() => handleNav('/register')}
                className="signature-gradient text-on-primary rounded-full font-bold text-lg hover:opacity-90 transition-opacity duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ padding: '20px 40px', border: 'none', cursor: 'pointer', boxShadow: '0 20px 50px rgba(52,36,205,0.3)' }}
              >
                BẮT ĐẦU NGAY
              </button>
              <button
                onClick={() => { const el = document.getElementById('demo-video'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                className="flex items-center gap-3 bg-surface-container-highest text-primary rounded-full font-bold text-lg hover:bg-surface-container transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ padding: '20px 40px', border: 'none', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>play_arrow</span>
                Tìm hiểu thêm (video)
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            <div className="relative z-10 bg-white/70 backdrop-blur-2xl p-4 rounded-xl" style={{ boxShadow: '0 0 40px rgba(113, 42, 226, 0.05)' }}>
              <div id="demo-video" className="aspect-video w-full relative overflow-hidden rounded-lg shadow-2xl" style={{ background: '#000' }}>
                <iframe
                  src="https://www.youtube.com/embed/4_pk6Kiv2Uw"
                  title="MoMai AI Demo"
                  loading="lazy"
                  style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="absolute bg-primary text-on-primary px-4 py-2.5 lg:px-5 lg:py-3 rounded-xl shadow-lg" style={{ bottom: '-12px', right: '8px' }}>
                <div className="text-xl lg:text-2xl font-bold font-headline leading-tight">98%+</div>
                <div className="text-[10px] font-body uppercase tracking-wider" style={{ opacity: 0.7 }}>Độ chính xác</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Social Proof */}
      <section className="relative -mt-2 py-6 lg:py-8 overflow-hidden" style={{ background: '#ede9fe' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 relative z-10">
          <h2 className="text-center text-[11px] font-body font-semibold uppercase tracking-[0.24em] mb-6 text-on-surface-variant">ĐƯỢC TIN DÙNG BỞI</h2>
          <div className="flex flex-wrap justify-center items-center gap-4 lg:gap-6">
            {[
              { src: '/logo-shtp.png', alt: 'Saigon Hi-Tech Park' },
              { src: '/logo-tand.png', alt: 'Tòa Án Nhân Dân' },
              { src: '/logo-ghu.png', alt: 'Gia Dinh University' },
              { src: '/logo-hiu.png', alt: 'HIU' },
              { src: '/logo-ttvh.png', alt: 'Thể Thao & Văn Hóa' },
            ].map((logo, i) => (
              <div
                key={i}
                className="h-20 w-[160px] lg:w-[180px] rounded-xl bg-white/55 border border-white/50 flex items-center justify-center px-4"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="max-h-[4.5rem] w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-8 lg:py-16 bg-surface">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white signature-gradient mb-6">
              Tính năng nổi bật
            </div>
            <h2 className="font-headline font-extrabold leading-tight text-on-background" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Ứng dụng sức mạnh của trí tuệ nhân tạo (AI)<br className="hidden lg:block" /> cho cá nhân &amp; doanh nghiệp
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`p-8 rounded-2xl transition-all duration-200 group ${
                  f.isPrimary
                    ? 'signature-gradient shadow-[0_24px_60px_rgba(78,69,228,0.35)] hover:shadow-[0_32px_72px_rgba(78,69,228,0.45)] hover:-translate-y-1'
                    : 'bg-surface-container-low/40 hover:bg-surface-container-low hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${f.isPrimary ? 'bg-white/20' : 'bg-white/80 backdrop-blur shadow-sm'}`}>
                  <span className={`material-symbols-outlined font-light text-2xl ${f.isPrimary ? 'text-white' : 'text-primary'}`}>{f.icon}</span>
                </div>
                <h3 className={`text-lg font-bold mb-3 ${f.isPrimary ? 'text-white' : ''}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${f.isPrimary ? 'text-white/80' : 'text-on-surface-variant'}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-8 lg:py-16 bg-surface-container-low" style={{ borderRadius: '3rem 3rem 0 0' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12">
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white signature-gradient mb-6">
              Bảng giá
            </div>
            <h2 className="font-headline font-extrabold mb-4 uppercase" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>BẢNG GIÁ LINH HOẠT</h2>
            <p className="text-on-surface-variant text-lg">Chọn gói dịch vụ phù hợp nhất với nhu cầu công việc của bạn</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

            {/* Phóng viên */}
            <div className="bg-surface-container-lowest p-10 rounded-xl flex flex-col items-center text-center hover:shadow-xl hover:border-primary/20 border border-transparent transition-all duration-200" style={{ boxShadow: '0 16px 48px rgba(31,47,84,0.06)' }}>
              <div className="text-xs font-body font-semibold text-outline uppercase tracking-widest mb-4">Dành cho nhà báo</div>
              <h3 className="font-body font-bold mb-2 text-on-surface" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>PHÓNG VIÊN</h3>
              <div className="mb-8">
                <span className="text-xs text-on-surface-variant font-body">Bắt đầu từ:</span>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-4xl font-extrabold font-headline text-primary">399.000đ</span>
                </div>
              </div>
              <div className="mb-10 flex-grow w-full flex justify-center">
                <ul className="space-y-4 inline-block text-left">
                  {['Ghi chép không giới hạn', 'Phỏng vấn & họp báo tự động', 'Nhận diện nhiều người nói', 'Xuất PDF, DOCX, TXT', '100+ ngôn ngữ'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm font-body text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary shrink-0 mt-0.5" style={{ fontSize: '18px', fontVariationSettings: "'wght' 300" }}>done_all</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleNav('/register')}
                className="w-full py-4 rounded-full font-semibold font-body text-white signature-gradient hover:opacity-90 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                ĐĂNG KÝ NGAY
              </button>
            </div>

            {/* Chuyên viên — Featured */}
            <div className="bg-white p-10 rounded-xl flex flex-col items-center text-center relative z-10 border-2 border-primary/10 hover:shadow-2xl transition-all duration-200 md:scale-105" style={{ boxShadow: '0 32px 80px rgba(52,36,205,0.12)' }}>
              <div className="absolute signature-gradient text-white px-6 py-1 rounded-full text-xs font-semibold font-body uppercase tracking-wider" style={{ top: '-16px', left: '50%', transform: 'translateX(-50%)' }}>Phổ biến nhất</div>
              <div className="text-xs font-body font-semibold text-primary uppercase tracking-widest mb-4">Dành cho văn phòng</div>
              <h3 className="font-body font-bold mb-2 text-on-surface" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>CHUYÊN VIÊN</h3>
              <div className="mb-8">
                <span className="text-xs text-on-surface-variant font-body">Bắt đầu từ:</span>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-4xl font-extrabold font-headline text-primary">299.000đ</span>
                </div>
              </div>
              <div className="mb-10 flex-grow w-full flex justify-center">
                <ul className="space-y-4 inline-block text-left">
                  {['Không giới hạn giờ ghi âm', 'Tự động tạo biên bản họp', 'Tóm tắt AI nâng cao', 'Ưu tiên xử lý siêu tốc', 'Tích hợp lịch & email'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm font-body text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary shrink-0 mt-0.5" style={{ fontSize: '18px', fontVariationSettings: "'wght' 300" }}>done_all</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleNav('/register')}
                className="w-full py-4 rounded-full signature-gradient text-white font-semibold font-body hover:opacity-90 transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                ĐĂNG KÝ NGAY
              </button>
            </div>

            {/* Cán bộ viên chức */}
            <div className="bg-surface-container-lowest p-10 rounded-xl flex flex-col items-center text-center hover:shadow-xl hover:border-primary/20 border border-transparent transition-all duration-200" style={{ boxShadow: '0 16px 48px rgba(31,47,84,0.06)' }}>
              <div className="text-xs font-body font-semibold text-outline uppercase tracking-widest mb-4">Dành cho nhà nước</div>
              <h3 className="font-body font-bold mb-2 text-on-surface" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>CÁN BỘ VIÊN CHỨC</h3>
              <div className="mb-8">
                <span className="text-xs text-on-surface-variant font-body">Bắt đầu từ:</span>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-4xl font-extrabold font-headline text-primary">499.000đ</span>
                </div>
              </div>
              <div className="mb-10 flex-grow w-full flex justify-center">
                <ul className="space-y-4 inline-block text-left">
                  {['Ghi chép độ chính xác cao nhất', 'Nhận diện thuật ngữ pháp lý', 'Đánh dấu thời gian từng câu', 'Mã hóa & bảo mật tối đa', 'Xuất định dạng tòa án'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm font-body text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary shrink-0 mt-0.5" style={{ fontSize: '18px', fontVariationSettings: "'wght' 300" }}>done_all</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleNav('/register')}
                className="w-full py-4 rounded-full font-semibold font-body text-white signature-gradient hover:opacity-90 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                ĐĂNG KÝ NGAY
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Business Solutions */}
      <section className="py-8 lg:py-12 overflow-hidden lg:min-h-[calc(100vh-80px)] lg:flex lg:items-center">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12">
          <div className="bg-[#1f2f54] rounded-xl p-16 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
              <div>
                <h2 className="font-headline text-white font-extrabold mb-8 uppercase" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>GIẢI PHÁP DÀNH CHO DOANH NGHIỆP</h2>
                <p className="text-primary-fixed-dim text-lg leading-relaxed mb-12">
                  Chúng tôi cung cấp giải pháp chuyên biệt cho doanh nghiệp với khả năng tích hợp API mạnh mẽ và yêu cầu độ bảo mật tuyệt đối với quy mô nhân sự lớn, nhiều phòng ban.
                </p>
                <div className="space-y-8">
                  {[
                    { icon: 'hub', title: 'Tích hợp API', desc: 'Kết nối MoMai vào hệ thống CRM hoặc ERP có sẵn hoặc xây dựng mới hệ thống.' },
                    { icon: 'encrypted', title: 'Bảo mật đa tầng', desc: 'Tuân thủ các tiêu chuẩn bảo mật quốc tế.' },
                    { icon: 'storage', title: 'Quản lý dữ liệu tập trung', desc: 'Phân quyền chi tiết, quản lý toàn bộ đội ngũ và thông tin từ một bảng điều khiển.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex gap-6 items-start">
                      <div className="p-4 rounded-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                        <span className="material-symbols-outlined text-white font-light">{icon}</span>
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-xl mb-2">{title}</h4>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleNav('/register')}
                  className="mt-12 rounded-full font-bold hover:opacity-90 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f2f54]"
                  style={{ background: 'white', color: '#4e45e4', padding: '16px 32px', border: 'none', cursor: 'pointer' }}
                >
                  Liên hệ tư vấn
                </button>
              </div>
              <div className="hidden lg:flex items-center justify-center">
                <img src="/enterprise-illustration.png" alt="Giải pháp doanh nghiệp" className="max-h-[480px] w-auto object-contain rounded-2xl" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))' }} />
              </div>
            </div>
            <div className="absolute rounded-full" style={{ top: '-96px', right: '-96px', width: '384px', height: '384px', background: '#3424cd', filter: 'blur(120px)', opacity: 0.2 }} />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-8 lg:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-center font-headline font-extrabold text-on-background mb-10 lg:mb-14" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Câu hỏi thường gặp
          </h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }, i) => (
              <div
                key={i}
                className="rounded-2xl border overflow-hidden transition-colors duration-200 cursor-pointer"
                style={{
                  borderColor: openFaq === i ? '#c4bff5' : '#e8e8f0',
                  background: openFaq === i ? '#f0effc' : '#ffffff',
                }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <button
                  type="button"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  className="w-full text-left px-6 py-5 lg:px-8 lg:py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-medium text-sm lg:text-base text-on-background">{q}</span>
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-shrink-0 text-primary"
                      style={{
                        width: '20px',
                        height: '20px',
                        transition: 'transform 250ms ease',
                        transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  style={{
                    display: 'grid',
                    gridTemplateRows: openFaq === i ? '1fr' : '0fr',
                    transition: 'grid-template-rows 250ms ease',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <p className="px-6 pb-6 lg:px-8 lg:pb-7 text-sm lg:text-base text-on-surface-variant leading-relaxed">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full mt-20" style={{ background: '#f2f3ff', borderRadius: '3rem 3rem 0 0' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 px-4 sm:px-6 md:px-10 lg:px-16 py-12 lg:py-20 max-w-[1440px] mx-auto">

          {/* Col 1 — Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img 
                src="https://neuronsai.net/assets/NAI.png" 
                alt="MOMAI Logo" 
                className="w-10 h-10 object-contain"
              />
              <span className="text-base font-bold" style={{ color: '#1f2f54' }}>Meeting Minute AI</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              MoMai sử dụng trí tuệ nhân tạo để tích hợp công nghệ chatbot và AI Agent vào các cuộc họp. Tạo các bản tổng hợp thông tin và tóm tắt thông minh cho cá nhân, đội ngũ và tổ chức.
            </p>
          </div>

          {/* Col 2 — Liên hệ */}
          <div className="space-y-6">
            <h5 className="font-bold text-on-surface">Liên hệ</h5>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Địa chỉ: 68 Phố Nguyễn Huệ, Phường Sài Gòn, TP. HCM<br />
              Điện thoại: 039 4902181<br />
              Email: info@neuronsai.net
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Facebook', src: '/logo-facebook.png' },
                { label: 'Zalo', src: '/logo-zalo.png' },
                { label: 'YouTube', src: '/logo-ytb.png' },
                { label: 'Viber', src: '/logo-viber.png' },
              ].map(({ label, src }) => (
                <button
                  key={label}
                  title={label}
                  aria-label={label}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                  style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'transparent', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                >
                  <img src={src} alt={label} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%' }} />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 items-center pt-2">
              {['Visa', 'Mastercard', 'MoMo', 'VNPay'].map(method => (
                <span key={method} className="text-sm text-on-surface-variant px-3 py-1 rounded-full bg-surface-container">{method}</span>
              ))}
            </div>
          </div>

          {/* Col 3 — Hỗ trợ khách hàng */}
          <div className="space-y-4">
            <h5 className="font-bold text-on-surface">Hỗ trợ khách hàng</h5>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              {['Tài khoản', 'Chính sách thành viên', 'Chính sách thanh toán', 'Tính năng', 'Giải pháp', 'Chi phí', 'Hướng dẫn thanh toán'].map(item => (
                <li key={item}>
                  <button
                    onClick={() => handleNav('/')}
                    className="hover:text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:underline"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Về chúng tôi */}
          <div className="space-y-4">
            <h5 className="font-bold text-on-surface">Về chúng tôi</h5>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              {['Trang chủ', 'Câu chuyện', 'Giới thiệu', 'Tin tức'].map(item => (
                <li key={item}>
                  <button
                    onClick={() => handleNav('/')}
                    className="hover:text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:underline"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >{item}</button>
                </li>
              ))}
            </ul>
            <div className="pt-6">
              <p className="text-xs text-on-surface-variant">© 2025 MoMai by NeuronsAI. All rights reserved.</p>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
