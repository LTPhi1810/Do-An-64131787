import React, { useState, useEffect } from 'react';
import Footer from './Footer';

function WelcomeDashboard({ onChoice, user, settings }) {
  const activeSlides = settings?.slides?.filter(s => s.visible) || [];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 overflow-y-auto flex flex-col">
      
      {/* HERO SECTION */}
      <section className="relative w-full h-[65vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        
        {/* Layer Background Ảnh */}
        <div className="absolute inset-0 z-0 bg-slate-900">
          {activeSlides.length > 0 && activeSlides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out transform ${
                  index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                }`}
              >
                <img src={slide.url} className="w-full h-full object-cover opacity-90" alt="Interior Background" />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            ))}
        </div>

        {/* Gradient Layer */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-slate-50 to-transparent z-10" />

        {/* Layer Chữ & Nút bấm */}
        <div className="relative z-20 max-w-5xl mx-auto text-center px-6 -mt-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6 drop-shadow-lg leading-[1.2]">
            {settings?.bannerText || "Thiết kế không gian sống nhanh chóng!"}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium drop-shadow-md">
            Xin chào, <span className="text-[#00b259] font-bold uppercase">{user?.username || 'Bạn'}</span>! 
            Thiết kế phòng 3D trực quan chỉ trong vài phút.
          </p>
          <button 
            onClick={() => onChoice('BASIC')} 
            className="bg-[#00b259] text-white font-bold text-lg md:text-xl px-10 py-5 rounded-full shadow-[0_10px_30px_rgba(0,178,89,0.3)] hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95"
          >
            Bắt đầu thiết kế miễn phí
          </button>
        </div>

        {/* Slide Indicators */}
        {activeSlides.length > 1 && (
          <div className="absolute bottom-20 flex gap-2 z-20">
            {activeSlides.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-[#00b259]' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        )}
      </section>

      {/* CARDS SECTION - Đã giảm pb-20 xuống pb-8 (hoặc pb-4) để thu hẹp khoảng dưới */}
      <section className="relative z-30 -mt-24 max-w-6xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-8">
        <ActionCard 
          image="/icons/painting.png" 
          title="Tự vẽ Layout" 
          desc="Tùy chỉnh kích thước căn phòng theo ý đồ riêng của bạn." 
          onClick={() => onChoice('CUSTOM')} 
        />
        <ActionCard 
          image="/icons/sofa.png" 
          title="Phòng tiêu chuẩn" 
          desc="Bắt đầu ngay với các mẫu phòng phổ biến 10x10m." 
          onClick={() => onChoice('BASIC')} 
        />
        <ActionCard 
          image="/icons/laptop.png" 
          title="Dự án đã lưu" 
          desc="Tiếp tục hoàn thiện những kiệt tác bạn đang thực hiện." 
          onClick={() => onChoice('LOAD')} 
        />
      </section>

      {/* Đã bỏ mt-auto hoặc thay bằng mt-0 nếu Footer tự có margin trên */}
      <div className="mt-0">
        <Footer />
      </div>
    </div>
  );
}

function ActionCard({ image, title, desc, onClick }) {
  return (
    <div 
      className="group bg-white rounded-3xl p-8 shadow-lg border border-slate-100 hover:border-[#00b259]/30 transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-2 hover:shadow-2xl" 
      onClick={onClick}
    >
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed">{desc}</p>
      </div>
      <div className="flex-1 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 min-h-[150px] group-hover:bg-[#00b259]/5 transition-colors duration-500">
        <img src={image} alt={title} className="w-20 h-20 md:w-24 md:h-24 object-contain group-hover:scale-110 transition-transform duration-500" />
      </div>
      <button className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-[#00b259] text-slate-400 group-hover:text-white flex items-center justify-center ml-auto transition-all duration-300">
        <span className="text-xl font-bold">→</span>
      </button>
    </div>
  );
}

export default WelcomeDashboard;