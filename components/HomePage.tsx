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
              <button onClick={() => handleNav('/')} className="font-headline text-sm font-medium tracking-tight transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4e45e4', borderBottom: '2px solid #4e45e4', paddingBottom: '4px' }}>Tính năng</button>
              <button onClick={() => handleNav('/pricing')} className="font-headline text-sm font-medium tracking-tight hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f5e86' }}>Bảng giá</button>
              <button onClick={() => handleNav('/')} className="font-headline text-sm font-medium tracking-tight hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f5e86' }}>Giải pháp</button>
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
              Bắt đầu miễn phí
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
            <button onClick={() => handleNav('/pricing')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Bảng giá</button>
            <button onClick={() => handleNav('/login')} style={{ textAlign: 'left', padding: '12px 0', fontSize: '1rem', fontWeight: 600, color: '#4f5e86', background: 'none', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
            <button
              onClick={() => handleNav('/register')}
              className="signature-gradient text-on-primary"
              style={{ marginTop: '12px', padding: '14px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Đăng ký miễn phí
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
                <span>Mới: Nâng cấp AI v4.0</span>
              </div>
              <h1 className="font-headline font-extrabold text-on-surface leading-tight mb-6 tracking-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1 }}>
                Thư ký AI <br />
                <span style={{ backgroundImage: 'linear-gradient(135deg, #4e45e4 0%, #742fe5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>24/7 của bạn</span>
              </h1>
              <p className="text-lg text-on-surface-variant mb-10 max-w-xl leading-relaxed">
                Biến mọi cuộc họp và tệp âm thanh thành tri thức có cấu trúc. Tự động ghi âm, chuyển văn bản và tóm tắt thông tin quan trọng chỉ trong vài giây.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleNav('/register')}
                  className="signature-gradient text-on-primary rounded-full font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
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
                  Xem demo
                </button>
              </div>
              <div className="mt-12 flex items-center gap-4 text-sm text-on-surface-variant">
                <div className="flex" style={{ marginRight: '4px' }}>
                  {[
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBzQk2QdCz6R5Se0_o6c6fboycicPCKUFeq7s48E3bmPIY_amsh4mmb_5UlgCZj-7UpruygA8JE97MUrxPLObQ5G48hwzicNBknz6xP4qFP9qbXjYvywBvkOlwlkTixUHaSK2codhoLT26yt23ZV1SlkiJlmC6w1tEGhkcHUAJ-4fMkiXXERQJ0R9emh77FNdc0eKIZgMIw-yQLO0PSFeXk9UUswTqi9S_-lKJqhwej7ZaKMxh4q97s4rsJbsjdrMGRmx8yEbEdzg-s',
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBXGg8JXGlQ19jqp9k71fNZB0yYXBsfVOWw9oFPVs0whMIwc4lmLYzjw0W-MD7d2s0Z_AOoQvYcz7u7dcUiRc8GA2EXgb6Bws_BwbKBIsAOvZgwgUhfzTes0AZVgr3M7qK9ThiRKgPu8BtdOWgY7WdLJfkH3vE6Gs2o-QuwKExFcJ14WolLeCwaMQrj4OoM2nE-hMgLypeRGqWx2H6rJwnkEUuunAevAekp5EkPVLfENDc36hvRzj4m2qNgzoX3oB63H70GFVhn0K37',
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuARqeoJlP0FUZZXavakmw87aorzJh9XDjw-mvYDx6GDt-mgwkwBHMnSIb0uwDd92vfR_DUs6rgohCTdXK2N9E5gF6vTyIyX6LfZs_BRK0cs58Y2DpM0w9q5H4BCHPSNM2LE07_Cm7PtkR6csy5gP1C5pxWoFQokhaxPPH4L1YNm-B7Aamf6KDGlK99suwuygUKK7MmlqMa9174_mEnytKoybMHpG_1iHINjMbZz0wD0mIhFq7ojp8yfaA-npi4a1iIoiKtDtEMpQar9',
                  ].map((src, i) => (
                    <img key={i} src={src} className="rounded-full border-2 border-surface object-cover" style={{ width: '40px', height: '40px', marginLeft: i === 0 ? 0 : '-12px' }} alt="" role="presentation" />
                  ))}
                </div>
                <p>Được tin dùng bởi <b>50,000+</b> chuyên gia toàn cầu</p>
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
                    <div className="absolute inset-0 rounded-full pulse-aura" style={{ background: 'rgba(78,69,228,0.3)' }} />
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

        {/* Bento Grid — Sức mạnh AI */}
        <section className="px-8 py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="font-headline font-bold mb-4" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>Sức mạnh của trí tuệ nhân tạo</h2>
              <p className="text-on-surface-variant max-w-2xl">Trải nghiệm quy trình làm việc không gián đoạn với hệ thống tự động hóa tối ưu nhất hiện nay.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              {/* Card 1 — Wide */}
              <div className="md:col-span-2 bg-surface-container-lowest p-8 shadow-sm hover:shadow-md transition-shadow" style={{ borderRadius: '1.5rem' }}>
                <div className="signature-gradient w-12 h-12 flex items-center justify-center text-on-primary mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-3 text-on-surface">Tự động hóa 100%</h3>
                <p className="text-on-surface-variant leading-relaxed">Loại bỏ hoàn toàn thao tác thủ công. Chỉ cần tải lên hoặc ghi âm trực tiếp, AI sẽ xử lý mọi khâu từ phân tách người nói đến tóm tắt ý chính.</p>
              </div>

              {/* Card 2 — Primary */}
              <div className="bg-primary text-on-primary p-8 shadow-xl" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 flex items-center justify-center text-on-primary mb-6" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">Độ chính xác 99%+</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>Thuật toán Deep Learning tiên tiến giúp nhận diện giọng nói tiếng Việt chuẩn xác, bất kể vùng miền hay tiếng ồn môi trường.</p>
              </div>

              {/* Card 3 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-tertiary-container flex items-center justify-center text-on-tertiary-container mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">speed</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">Siêu nhanh</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Xử lý 1 giờ âm thanh chỉ trong vòng chưa đầy 2 phút. Nhận kết quả gần như tức thì.</p>
              </div>

              {/* Card 4 */}
              <div className="bg-surface-container-lowest p-8 shadow-sm" style={{ borderRadius: '1.5rem' }}>
                <div className="w-12 h-12 bg-secondary-container flex items-center justify-center text-on-secondary-container mb-6" style={{ borderRadius: '0.75rem' }}>
                  <span className="material-symbols-outlined">language</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">100+ Ngôn ngữ</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Hỗ trợ đa ngôn ngữ, dịch thuật trực tiếp và nhận diện ngữ cảnh thông minh.</p>
              </div>

              {/* Card 5 — Image overlay */}
              <div className="md:col-span-3 relative overflow-hidden" style={{ borderRadius: '1.5rem', height: '300px' }}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtKK_YVacBPXhjswgmTb96XBYRblMAR5_tlqHqLU-FRazp2Z2yqPsbtxHoiSwmjWJnCgOyK64wmUYsxitRRb6sp2QH4IGv95NSOlMR-zSt8Cyy7dSuFxMcHtCTdSI5iaF9AjlfaiH3besgIwxluPgOJgHOxfVz19j1qhZQOat3oZ_1yjWFPvURAxPFXqmdI6Rr0BbngLDBWcTvxJLkcH1uRMh8aQh3zSo2E7muuPuTU4stybPsx0s8q_l5oUYCvzuyqsl_jXjvcdLP"
                  alt="Team collaboration"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-center p-12" style={{ background: 'linear-gradient(to right, rgba(33,49,86,0.9), transparent)' }}>
                  <h3 className="font-headline text-3xl font-bold text-white mb-4">Gắn kết đội ngũ</h3>
                  <p className="max-w-md" style={{ color: 'rgba(255,255,255,0.7)' }}>Chia sẻ biên bản họp tự động đến toàn bộ thành viên ngay khi cuộc họp kết thúc. Giữ mọi người trên cùng một trang.</p>
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
        <section className="px-8 py-24 bg-surface">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="font-headline font-bold mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>Bảng giá linh hoạt</h2>
            <p className="text-on-surface-variant">Chọn gói dịch vụ phù hợp nhất với nhu cầu công việc của bạn</p>
          </div>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

            {/* Phóng viên */}
            <div className="bg-surface-container-low p-8 flex flex-col hover:bg-surface-container-high transition-all" style={{ borderRadius: '1.5rem' }}>
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Phóng viên</h3>
                <p className="font-headline font-black" style={{ fontSize: '2rem' }}>399.000<span className="text-sm font-normal text-on-surface-variant"> ₫/tháng</span></p>
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
                Chọn gói này
              </button>
            </div>

            {/* Chuyên viên — Featured */}
            <div className="p-8 flex flex-col relative" style={{ background: '#213156', color: 'white', borderRadius: '1.5rem', transform: 'scale(1.05)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', zIndex: 10 }}>
              <div className="absolute signature-gradient px-4 py-1 rounded-full font-bold uppercase tracking-wider" style={{ top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', whiteSpace: 'nowrap' }}>Phổ biến nhất</div>
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Chuyên viên</h3>
                <p className="font-headline font-black" style={{ fontSize: '2.5rem' }}>299.000<span className="text-sm font-normal" style={{ opacity: 0.7 }}> ₫/tháng</span></p>
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
                Đăng ký ngay
              </button>
            </div>

            {/* Cán bộ */}
            <div className="bg-surface-container-low p-8 flex flex-col hover:bg-surface-container-high transition-all" style={{ borderRadius: '1.5rem' }}>
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Cán bộ</h3>
                <p className="font-headline font-black" style={{ fontSize: '2rem' }}>499.000<span className="text-sm font-normal text-on-surface-variant"> ₫/tháng</span></p>
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
                Chọn gói này
              </button>
            </div>

          </div>
        </section>

        {/* Why MoMai Section */}
        <section className="px-8 py-24 bg-surface-container-low" style={{ borderTop: '1px solid #e2e8f0' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline font-bold mb-4" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>Tại sao chọn MoMai?</h2>
              <p className="text-on-surface-variant text-lg">Được xây dựng cho từng ngành nghề cụ thể</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4e45e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  ),
                  title: 'Tự động hoá 100%',
                  desc: 'Giảm thiểu 95% các tác vụ thủ công. AI tự động thực hiện các thao tác theo quy trình chuẩn giúp bạn có thêm nhiều thời gian.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4e45e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                  ),
                  title: 'Không giới hạn',
                  desc: 'Không giới hạn số lần sử dụng. Chuyển đổi hàng nghìn file âm thanh và video với các gói dịch vụ phù hợp.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f5e86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  ),
                  title: 'Tiết kiệm chi phí',
                  desc: 'Tối ưu hóa ngân sách, thời gian cho bạn. Chỉ với chi phí nhỏ so với thuê nhân viên truyền thống hoặc các phần mềm riêng lẻ.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4e45e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                  ),
                  title: 'Độ chính xác 99%+',
                  desc: 'Được ứng dụng bởi các mô hình AI mới nhất cùng nền tảng huấn luyện AI riêng do Neurons AI xây dựng cho kết quả chính xác cao nhất.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4e45e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  ),
                  title: 'Xử lý siêu nhanh',
                  desc: 'Ghi chép và tổng hợp hàng giờ âm thanh và video chỉ trong vài phút.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f5e86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  ),
                  title: '100+ ngôn ngữ',
                  desc: 'Hỗ trợ Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Nhật và hơn 100 ngôn ngữ khác trên toàn thế giới.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f5e86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  ),
                  title: 'Hỗ trợ nhiều định dạng',
                  desc: 'Tải lên file dài đến 5 giờ. Hỗ trợ MP3, MP4, WAV, M4A và nhiều định dạng khác.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f5e86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  ),
                  title: 'Hỗ trợ nhiều lựa chọn',
                  desc: 'Nền tảng cho phép lựa chọn định dạng sau khi tổng hợp: PDF, DOCX, Sơ đồ tư duy...',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex flex-col gap-4">
                  <div className="w-12 h-12 bg-surface-container-highest flex items-center justify-center flex-shrink-0" style={{ borderRadius: '12px' }}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-on-surface" style={{ fontSize: '1.05rem' }}>{title}</h3>
                  <p className="text-on-surface-variant leading-relaxed" style={{ fontSize: '0.9rem' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise Section */}
        <section className="px-8 py-24 bg-surface-container-highest">
          <div className="max-w-7xl mx-auto glass-panel overflow-hidden shadow-xl" style={{ borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.4)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-12 md:p-20">
                <h2 className="font-headline font-bold mb-6" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>Giải pháp tùy chỉnh cho tổ chức</h2>
                <p className="text-on-surface-variant text-lg mb-8 leading-relaxed">
                  Chúng tôi cung cấp khả năng tích hợp API mạnh mẽ và giải pháp triển khai tại chỗ (On-premise) cho các doanh nghiệp yêu cầu độ bảo mật tuyệt đối và quy mô lớn.
                </p>
                <div className="space-y-6">
                  {[
                    { icon: 'api', title: 'Tích hợp API mượt mà', desc: 'Kết nối MoMai AI vào hệ thống CRM hoặc ERP có sẵn của bạn.' },
                    { icon: 'security', title: 'Bảo mật đa tầng', desc: 'Mã hóa AES-256 và tuân thủ các tiêu chuẩn bảo mật quốc tế.' },
                    { icon: 'groups', title: 'Quản lý nhóm tập trung', desc: 'Phân quyền chi tiết, quản lý toàn bộ team từ một bảng điều khiển.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex gap-4">
                      <div className="bg-surface-container-lowest p-3 shadow-sm flex-shrink-0" style={{ borderRadius: '0.75rem' }}>
                        <span className="material-symbols-outlined text-primary">{icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">{title}</h4>
                        <p className="text-sm text-on-surface-variant">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleNav('/register')}
                  className="mt-12 rounded-full font-bold hover:opacity-90 transition-all"
                  style={{ background: '#213156', color: 'white', padding: '16px 32px', border: 'none', cursor: 'pointer' }}
                >
                  Liên hệ tư vấn doanh nghiệp
                </button>
              </div>
              <div className="relative min-h-80">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfhayhjxTXJcMqVFNqU1xqWyqbv18ziJ9L7flq3RfdBTuv-b2thlKudJLI22IhC_FXoK-U6Lxl1Q9lBv6iDN74AUWRC1QgY-R1hsM8yfKPwOmdX-tuT9CDPYLbgLaKhqsgrOpWlzTeVoCnsNNPFvJs-mQ9y8j3aT8ocNyLaRcUI0TESbUKB7hwg8L-Dmx0wtXpCYAdRlXSOv2Ltal0zMG2-pExw5icMYTumTztpd3NnSKKnY7J09s3nA9SKiU6faDTdsnNxCu_tUIx"
                  alt="Enterprise security"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: 'rgba(78,69,228,0.2)' }} />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-8 py-24 bg-surface">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-headline font-bold mb-12 text-center" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>Câu hỏi thường gặp</h2>
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
      <footer className="py-12 px-8" style={{ background: '#f8fafc', borderTop: '1px solid rgba(226,232,240,0.5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="https://neuronsai.net/assets/NAI.png" alt="NeuronsAI" style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />
                <span className="font-bold text-lg" style={{ color: '#0f172a' }}>Neurons<span style={{ color: '#4e45e4' }}>AI</span></span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6" style={{ maxWidth: '320px' }}>
                MOMAI là nền tảng AI đa năng hỗ trợ ghi chép, tổng hợp thông tin và tự động hóa công việc văn phòng với các mô hình AI hiệu quả nhất hiện nay.
              </p>
              <div className="flex gap-3">
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

            {/* Links */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-6" style={{ color: '#0f172a' }}>Sản phẩm</h4>
              <ul className="space-y-3">
                {['Tính năng', 'Bảng giá', 'Giải pháp doanh nghiệp', 'API'].map(item => (
                  <li key={item}><button onClick={() => handleNav('/')} className="text-sm text-on-surface-variant hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-6" style={{ color: '#0f172a' }}>Hỗ trợ</h4>
              <ul className="space-y-3">
                {['Về chúng tôi', 'Chính sách bảo mật', 'Điều khoản dịch vụ', 'Trung tâm hỗ trợ'].map(item => (
                  <li key={item}><button onClick={() => handleNav('/')} className="text-sm text-on-surface-variant hover:text-primary transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item}</button></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8" style={{ borderTop: '1px solid #e2e8f0' }}>
            <p className="text-xs text-on-surface-variant">© 2025 MoMai AI by NeuronsAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
