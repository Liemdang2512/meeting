import React, { useState } from 'react';

interface HomePageProps {
  onNavigate?: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
      a: 'Chúng tôi áp dụng mã hóa AES-256 đầu cuối và tuân thủ các tiêu chuẩn bảo mật quốc tế. Dữ liệu của bạn không bao giờ được chia sẻ với bên thứ ba.',
    },
    {
      q: 'Tôi có thể hủy gói dịch vụ bất kỳ lúc nào không?',
      a: 'Có, bạn có thể hủy gói bất kỳ lúc nào mà không mất thêm chi phí. Tài khoản vẫn hoạt động cho đến hết chu kỳ thanh toán hiện tại.',
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
      icon: 'auto_mode',
      title: 'Tự động hóa 100%',
      desc: 'Loại bỏ hoàn toàn thao tác thủ công. Chỉ cần tải lên các nội dung cần tổng hợp, AI sẽ xử lý mọi khâu từ phân tách người nói đến tóm tắt ý chính và hoàn thiện quy trình theo quy chuẩn',
      isPrimary: false,
      isWide: true,
    },
    {
      icon: 'verified_user',
      title: 'Độ chính xác 98%+',
      desc: 'Ứng dụng các công nghệ AI tiên tiến cùng việc làm chủ nền tảng huấn luyện AI giúp nhận diện giọng nói tiếng Việt chuẩn xác, bất kể đặc thù vùng miền hay tiếng ồn môi trường.',
      isPrimary: true,
      isWide: false,
    },
    {
      icon: 'bolt',
      title: 'Xử lý siêu nhanh',
      desc: 'Xử lý các nội dung âm thanh, hình ảnh chỉ trong vòng vài phút. Nhận kết quả gần như tức thì với độ chính xác cao',
      isPrimary: false,
      isWide: false,
    },
    {
      icon: 'translate',
      title: 'Đa dạng ngôn ngữ',
      desc: 'Hỗ trợ hơn 100 ngôn ngữ trên thế giới, am hiểu ngôn ngữ địa phương và nhận diện ngữ cảnh thông minh.',
      isPrimary: false,
      isWide: false,
    },
    {
      icon: 'savings',
      title: 'Tiết kiệm chi phí',
      desc: 'Tối ưu hóa ngân sách, thời gian. Chỉ với chi phí nhỏ so với thuê nhân viên truyền thống hoặc các phần mềm riêng lẻ.',
      isPrimary: false,
      isWide: false,
    },
    {
      icon: 'all_inclusive',
      title: 'Không giới hạn',
      desc: 'Không giới hạn số lần sử dụng. Chuyển đổi hàng nghìn file âm thanh và video với các gói dịch vụ phù hợp.',
      isPrimary: false,
      isWide: false,
    },
    {
      icon: 'swap_horiz',
      title: 'Đa dạng',
      desc: 'Hỗ trợ chuyển đổi nhiều định dạng: MP3, MP4, WAV, M4A ... sang nội dung tổng hợp với các định dạng: PDF, docx, Sơ đồ tư duy...',
      isPrimary: false,
      isWide: false,
    },
    {
      icon: 'groups',
      title: 'Phù hợp doanh nghiệp, đội ngũ',
      desc: 'Hệ thống được vận hành theo quy trình chuẩn, phù hợp với doanh nghiệp, đội ngũ. Chia sẻ nội dung được tổng hợp tự động đến toàn bộ thành viên ngay khi cuộc họp kết thúc.',
      isPrimary: false,
      isWide: true,
    },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 glass-panel px-8 py-4 transition-all duration-300" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => handleNav('/')}
              className="text-2xl font-black tracking-tighter font-headline"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#4e45e4' }}
            >
              MoMai AI
            </button>
            <div className="hidden md:flex gap-6">
              <button onClick={() => handleNav('/')} className="font-headline text-sm font-medium tracking-tight transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4e45e4', borderBottom: '2px solid #4e45e4', paddingBottom: '4px' }}>Sản phẩm</button>
              <button onClick={() => handleNav('/')} className="font-headline text-sm font-medium tracking-tight hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f5e86' }}>Tính năng</button>
              <button onClick={() => {
                const el = document.getElementById('pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} className="font-headline text-sm font-medium tracking-tight hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f5e86' }}>Bảng giá</button>
              <button onClick={() => {
                const el = document.getElementById('faq');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} className="font-headline text-sm font-medium tracking-tight hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f5e86' }}>Q&A</button>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => handleNav('/login')} className="text-primary font-medium text-sm hover:opacity-80 transition-all" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
            <button
              onClick={() => handleNav('/register')}
              className="signature-gradient text-on-primary px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Đăng ký
            </button>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
            aria-label="Menu"
          >
            <span style={{ display: 'block', width: '22px', height: '2px', background: '#213156', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: '#213156', transition: 'all 0.2s', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: '#213156', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden" style={{ padding: '16px 32px 24px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <button onClick={() => handleNav('/')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Sản phẩm</button>
            <button onClick={() => handleNav('/')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Tính năng</button>
            <button onClick={() => {
              setMobileOpen(false);
              const el = document.getElementById('pricing');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Bảng giá</button>
            <button onClick={() => {
              setMobileOpen(false);
              const el = document.getElementById('faq');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Q&A</button>
            <button onClick={() => handleNav('/login')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
            <button
              onClick={() => handleNav('/register')}
              className="signature-gradient text-on-primary"
              style={{ marginTop: '12px', padding: '14px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Đăng ký
            </button>
          </div>
        )}
      </nav>

      <main className="pt-24">

        {/* Hero Section */}
        <section className="relative px-8 py-20 overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold mb-6">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
                <span>Thư ký AI dành cho bạn</span>
              </div>
              <h1 className="font-headline font-extrabold text-on-surface leading-tight mb-6 tracking-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1 }}>
                Biến mọi cuộc họp, trao đổi thông tin thành{' '}
                <span style={{ backgroundImage: 'linear-gradient(135deg, #4e45e4 0%, #742fe5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>tri thức</span>{' '}
                có cấu trúc.
              </h1>
              <p className="text-lg text-on-surface-variant mb-10 max-w-xl leading-relaxed">
                Tự động chuyển âm thanh, video, hình ảnh thành văn bản và tóm tắt thông tin quan trọng chỉ trong vài giây.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleNav('/register')}
                  className="signature-gradient text-on-primary rounded-full font-bold text-lg hover:opacity-90 active:scale-95 transition-all uppercase tracking-wide"
                  style={{ padding: '16px 32px', border: 'none', cursor: 'pointer', boxShadow: '0 20px 40px rgba(78,69,228,0.3)' }}
                >
                  Bắt đầu ngay
                </button>
                <button
                  onClick={() => {
                    const el = document.querySelector('iframe');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-surface-container-high text-primary rounded-full font-bold text-lg hover:bg-surface-container-highest transition-all flex items-center gap-2"
                  style={{ padding: '16px 32px', border: 'none', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Tìm hiểu thêm
                </button>
              </div>
              <div className="mt-12 flex items-center gap-4 text-sm text-on-surface-variant">
                <p>Được ủng hộ bởi: <b>500 chuyên viên, phóng viên tại Việt Nam</b></p>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="absolute rounded-full" style={{ top: '-80px', right: '-80px', width: '320px', height: '320px', background: 'rgba(78,69,228,0.1)', filter: 'blur(100px)' }} />
              <div className="absolute rounded-full" style={{ bottom: '-80px', left: '-80px', width: '320px', height: '320px', background: 'rgba(116,47,229,0.1)', filter: 'blur(100px)' }} />
              <div className="relative glass-panel p-4 shadow-2xl" style={{ borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 25px 50px rgba(78,69,228,0.1)' }}>
                <div style={{ borderRadius: '1rem', overflow: 'hidden', background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                  <iframe
                    src="https://www.youtube.com/embed/4_pk6Kiv2Uw"
                    title="MoMai AI Demo"
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                {/* Pulse indicator */}
                <div className="absolute glass-panel flex items-center gap-4" style={{ bottom: '-24px', right: '-24px', padding: '16px', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 30px rgba(78,69,228,0.15)' }}>
                  <div className="relative" style={{ width: '40px', height: '40px' }}>
                    <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(78,69,228,0.3)', animation: 'pulse 2s ease-in-out infinite' }} />
                    <div className="absolute rounded-full" style={{ inset: '8px', background: '#4e45e4' }} />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#4f5e86' }}>AI đang lắng nghe</p>
                    <p className="text-sm font-bold text-primary">02:45:12</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features / CTA — Bento Grid */}
        <section className="px-8 py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center">
              <h2 className="font-headline font-bold mb-4" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
                Ứng dụng sức mạnh của trí tuệ nhân tạo (AI) cho cá nhân
              </h2>
            </div>
            {/* Bento grid: 4 columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              {/* Card 1 — Wide (col-span-2), first feature */}
              <div className="md:col-span-2 bg-surface-container-lowest p-8 shadow-sm hover:shadow-md hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="signature-gradient w-12 h-12 flex items-center justify-center text-on-primary mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[0].icon}</span>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-3 text-on-surface">{features[0].title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{features[0].desc}</p>
              </div>

              {/* Card 2 — Primary bg */}
              <div className="bg-primary text-on-primary p-8 shadow-xl hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 flex items-center justify-center text-on-primary mb-6" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[1].icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{features[1].title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{features[1].desc}</p>
              </div>

              {/* Card 3 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-tertiary-container flex items-center justify-center text-on-tertiary-container mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[2].icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{features[2].title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{features[2].desc}</p>
              </div>

              {/* Card 4 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-secondary-container flex items-center justify-center text-on-secondary-container mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[3].icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{features[3].title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{features[3].desc}</p>
              </div>

              {/* Card 5 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[4].icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{features[4].title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{features[4].desc}</p>
              </div>

              {/* Card 6 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-secondary/10 flex items-center justify-center text-secondary mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[5].icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{features[5].title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{features[5].desc}</p>
              </div>

              {/* Card 7 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">{features[6].icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{features[6].title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{features[6].desc}</p>
              </div>

              {/* Card 8 — Wide (col-span-3), last feature with image overlay */}
              <div className="md:col-span-3 relative overflow-hidden hover:translate-y-[-4px] transition-all duration-300" style={{ borderRadius: '1.5rem', minHeight: '220px' }}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #213156 0%, #4e45e4 100%)' }} />
                <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                  <div className="w-12 h-12 flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '0.75rem' }}>
                    <span className="material-symbols-outlined text-white">{features[7].icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-2xl font-bold text-white mb-3">{features[7].title}</h3>
                    <p className="max-w-xl" style={{ color: 'rgba(255,255,255,0.8)' }}>{features[7].desc}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Trusted By */}
        <section className="px-8 py-16 bg-surface">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-10" style={{ color: '#94a3b8' }}>Được tin dùng bởi</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {[
                { src: '/logo-htp.jpg', alt: 'Saigon Hi-Tech Park' },
                { src: '/logo-tand.jpg', alt: 'Tòa Án Nhân Dân' },
                { src: '/logo-giadinh.jpg', alt: 'Gia Dinh University' },
                { src: '/logo-hiu.jpg', alt: 'HIU' },
                { src: '/logo-thethao.jpg', alt: 'Thể Thao & Văn Hóa' },
              ].map((logo, i) => (
                <div key={i} style={{ width: '160px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logo.src} alt={logo.alt} style={{ maxWidth: '140px', maxHeight: '60px', width: 'auto', height: 'auto', objectFit: 'contain', filter: 'grayscale(20%)', opacity: 0.8 }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="px-8 py-24 bg-surface">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="font-headline font-bold mb-4 uppercase tracking-wide" style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>Bảng giá linh hoạt</h2>
            <p className="text-on-surface-variant">Chọn gói dịch vụ phù hợp nhất với nhu cầu công việc của bạn</p>
          </div>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

            {/* Phóng viên */}
            <div className="bg-surface-container-low p-8 flex flex-col hover:bg-surface-container-high transition-all" style={{ borderRadius: '1.5rem' }}>
              <div className="mb-8">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Dành cho</p>
                <h3 className="text-2xl font-black uppercase tracking-wide mb-4">Phóng viên</h3>
                <p className="text-xs text-on-surface-variant mb-1">Bắt đầu từ:</p>
                <p className="font-headline font-black" style={{ fontSize: '2rem' }}>399.000<span className="text-sm font-normal text-on-surface-variant"> ₫</span></p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {['Ghi chép không giới hạn', 'Phỏng vấn & họp báo tự động', 'Nhận diện nhiều người nói', 'Xuất PDF, DOCX, TXT', '100+ ngôn ngữ'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleNav('/register')}
                className="w-full py-3 rounded-full font-bold transition-all hover:bg-primary hover:text-on-primary"
                style={{ border: '2px solid #4e45e4', color: '#4e45e4', background: 'transparent', cursor: 'pointer' }}
              >
                Đăng ký
              </button>
            </div>

            {/* Chuyên viên — Featured */}
            <div className="p-8 flex flex-col relative" style={{ background: '#213156', color: 'white', borderRadius: '1.5rem', transform: 'scale(1.05)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', zIndex: 10 }}>
              <div className="absolute signature-gradient px-4 py-1 rounded-full font-bold uppercase tracking-wider" style={{ top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', whiteSpace: 'nowrap' }}>Phổ biến nhất</div>
              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ opacity: 0.7 }}>Dành cho</p>
                <h3 className="text-2xl font-black uppercase tracking-wide mb-4">Chuyên viên</h3>
                <p className="text-xs mb-1" style={{ opacity: 0.7 }}>Bắt đầu từ:</p>
                <p className="font-headline font-black" style={{ fontSize: '2.5rem' }}>299.000<span className="text-sm font-normal" style={{ opacity: 0.7 }}> ₫</span></p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {['Không giới hạn giờ ghi âm', 'Tự động tạo biên bản họp', 'Tóm tắt AI nâng cao', 'Ưu tiên xử lý siêu tốc', 'Tích hợp lịch & email'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#deccff', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleNav('/register')}
                className="w-full py-4 rounded-full signature-gradient text-white font-bold hover:brightness-110 transition-all"
                style={{ border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(78,69,228,0.3)' }}
              >
                Đăng ký
              </button>
            </div>

            {/* Cán bộ viên chức */}
            <div className="bg-surface-container-low p-8 flex flex-col hover:bg-surface-container-high transition-all" style={{ borderRadius: '1.5rem' }}>
              <div className="mb-8">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Dành cho</p>
                <h3 className="text-xl font-black uppercase tracking-wide mb-4 leading-tight">Cán bộ viên chức</h3>
                <p className="text-xs text-on-surface-variant mb-1">Bắt đầu từ:</p>
                <p className="font-headline font-black" style={{ fontSize: '2rem' }}>499.000<span className="text-sm font-normal text-on-surface-variant"> ₫</span></p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {['Ghi chép độ chính xác cao nhất', 'Nhận diện thuật ngữ pháp lý', 'Đánh dấu thời gian từng câu', 'Mã hóa & bảo mật tối đa', 'Xuất định dạng tòa án'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleNav('/register')}
                className="w-full py-3 rounded-full font-bold transition-all hover:bg-primary hover:text-on-primary"
                style={{ border: '2px solid #4e45e4', color: '#4e45e4', background: 'transparent', cursor: 'pointer' }}
              >
                Đăng ký
              </button>
            </div>

          </div>
        </section>

        {/* Enterprise Section */}
        <section className="px-8 py-24 bg-primary text-on-primary">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="font-headline font-bold mb-6 uppercase tracking-wide" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>
                  Giải pháp dành cho doanh nghiệp
                </h2>
                <p className="text-lg mb-8 leading-relaxed" style={{ opacity: 0.9 }}>
                  Chúng tôi cung cấp giải pháp chuyên biệt cho doanh nghiệp với khả năng tích hợp API mạnh mẽ và yêu cầu độ bảo mật tuyệt đối với quy mô nhân sự lớn, nhiều phòng ban.
                </p>
                <div className="space-y-6">
                  {[
                    {
                      icon: 'api',
                      title: 'Tích hợp API',
                      desc: 'Kết nối MoMai vào hệ thống CRM hoặc ERP có sẵn hoặc xây dựng mới hệ thống.',
                    },
                    {
                      icon: 'security',
                      title: 'Bảo mật đa tầng',
                      desc: 'Tuân thủ các tiêu chuẩn bảo mật quốc tế.',
                    },
                    {
                      icon: 'storage',
                      title: 'Quản lý dữ liệu tập trung',
                      desc: 'Phân quyền chi tiết, quản lý toàn bộ đội ngũ và thông tin từ một bảng điều khiển.',
                    },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-1">{title}</h4>
                        <p style={{ opacity: 0.85 }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleNav('/register')}
                  className="mt-10 rounded-full font-bold hover:opacity-90 active:scale-95 transition-all"
                  style={{ background: 'white', color: '#4e45e4', padding: '16px 32px', border: 'none', cursor: 'pointer' }}
                >
                  Liên hệ tư vấn
                </button>
              </div>
              <div className="flex items-center justify-center">
                <div className="glass-panel p-8 rounded-2xl" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'API Calls', value: '10M+' },
                      { label: 'Uptime', value: '99.9%' },
                      { label: 'Languages', value: '100+' },
                      { label: 'Enterprises', value: '500+' },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center p-4" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
                        <p className="font-headline font-black text-3xl mb-1">{value}</p>
                        <p className="text-sm" style={{ opacity: 0.8 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="px-8 py-24 bg-surface">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-headline font-bold mb-12 text-center uppercase tracking-wide" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>Câu hỏi thường gặp</h2>
            <div className="space-y-4">
              {faqs.map(({ q, a }, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-expanded={openFaq === i}
                  className={`p-6 cursor-pointer transition-colors duration-200 ${openFaq === i ? 'bg-surface-container-high' : 'bg-surface-container-low hover:bg-surface-container-high'}`}
                  style={{ borderRadius: '1rem', outline: 'none' }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenFaq(openFaq === i ? null : i); } }}
                  onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(78,69,228,0.3)'; }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold pr-4">{q}</h4>
                    <span
                      className="material-symbols-outlined flex-shrink-0 text-primary"
                      style={{ transition: 'transform 200ms ease', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >expand_more</span>
                  </div>
                  {openFaq === i && (
                    <p className="mt-4 text-on-surface-variant text-sm leading-relaxed">{a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-16 px-8" style={{ background: '#f2f3ff', borderTop: '1px solid rgba(226,232,240,0.5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

            {/* Col 1: Brand */}
            <div>
              <h3 className="font-bold text-lg mb-4" style={{ color: '#213156' }}>Meeting Minutes AI</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#213156', opacity: 0.7, maxWidth: '280px' }}>
                Automate meeting notes - MoMai sử dụng trí tuệ nhân tạo để tích hợp công nghệ chatbot và AI Agent vào các cuộc họp. Tạo các bản tổng hợp thông tin và tóm tắt thông minh cho cá nhân, đội ngũ và tổ chức. Tích hợp với nhiều nền tảng khác.
              </p>
            </div>

            {/* Col 2: Contact */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-6" style={{ color: '#213156' }}>Liên hệ</h4>
              <div className="space-y-3 text-sm" style={{ color: '#213156', opacity: 0.8 }}>
                <p>039 4902181</p>
                <p>Địa chỉ: 68 Phố Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh</p>
                <p>Email: info@neuronsai.net</p>
              </div>
              <div className="flex gap-3 mt-4">
                {[
                  { label: 'Facebook', src: '/logo facebok.png' },
                  { label: 'Zalo', src: '/logo zalo.png' },
                  { label: 'YouTube', src: '/logo ytb.png' },
                  { label: 'Viber', src: '/viber.png' },
                ].map(({ label, src }) => (
                  <button key={label} title={label} aria-label={label} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={src} alt={label} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Col 3: Ho tro khach hang */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-6" style={{ color: '#213156' }}>Hỗ trợ khách hàng</h4>
              <ul className="space-y-3">
                {['Tài khoản', 'Chính sách thành viên', 'Chính sách thanh toán', 'Tính năng', 'Giải pháp', 'Chi phí', 'Hướng dẫn thanh toán'].map(item => (
                  <li key={item}>
                    <button onClick={() => handleNav('/')} className="text-sm hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#213156', opacity: 0.7 }}>{item}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Ve chung toi */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-6" style={{ color: '#213156' }}>Về chúng tôi</h4>
              <ul className="space-y-3">
                {['Trang chủ', 'Câu chuyện', 'Giới thiệu', 'Tin tức'].map(item => (
                  <li key={item}>
                    <button onClick={() => handleNav('/')} className="text-sm hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#213156', opacity: 0.7 }}>{item}</button>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <div className="pt-8" style={{ borderTop: '1px solid rgba(33,49,86,0.1)' }}>
            <p className="text-xs text-on-surface-variant">© 2025 MoMai by NeuronsAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
