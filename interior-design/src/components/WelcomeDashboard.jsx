import React, { useState, useEffect } from 'react';
import Footer from './Footer';

function WelcomeDashboard({ onChoice, user, settings }) {
  // 📸 Lọc ra các ảnh được Admin cho phép hiển thị
  const activeSlides = settings?.slides?.filter(s => s.visible) || [];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  return (
    // 🛑 SỬA LẠI DÒNG NÀY ĐỂ LĂN CHUỘT ĐƯỢC:
    <div className="fixed inset-0 z-[150] bg-white overflow-y-auto flex flex-col pt-24">
      
      {/* 1. HERO SECTION */}
      <div className="max-w-4xl mx-auto text-center px-6 mt-10 mb-16">
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-6">
          {settings?.bannerText} {/* Lấy Text từ cài đặt */}
        </h1>
        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">
          Xin chào, <b className="text-slate-800 uppercase">{user?.username || 'Bạn'}</b>! Thiết kế phòng 3D trực quan chỉ trong vài phút.
        </p>
        <button onClick={() => onChoice('BASIC')} className="bg-[#00b259] text-white font-bold text-lg px-10 py-5 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          Bắt đầu thiết kế miễn phí
        </button>
      </div>

      {/* 📸 2. SLIDESHOW SECTION (Mới thêm) */}
      {activeSlides.length > 0 && (
        <div className="max-w-4xl mx-auto w-full px-6 mb-20">
          <div className="relative h-[240px] md:h-[320px] rounded-[36px] overflow-hidden shadow-2xl group bg-slate-100">
            {activeSlides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
              >
                <img src={slide.url} className="w-full h-full object-contain" alt="Slide" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            ))}
            
            {/* Nút chấm điều hướng (Chỉ hiện nếu có > 1 ảnh) */}
            {activeSlides.length > 1 && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
                {activeSlides.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all ${i === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-2'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CARDS SECTION */}
      <div className="max-w-6xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <ActionCard image="/icons/painting.png" title="Tự vẽ Layout" desc="Tùy chỉnh kích thước căn phòng theo ý muốn." onClick={() => onChoice('CUSTOM')} />
        <ActionCard image="/icons/sofa.png" title="Phòng tiêu chuẩn" desc="Bắt đầu với căn phòng vuông vắn 10x10m." onClick={() => onChoice('BASIC')} />
        <ActionCard image="/icons/laptop.png" title="Dự án đã lưu" desc="Mở lại những kiệt tác bạn đã thực hiện." onClick={() => onChoice('LOAD')} />
      </div>

      <Footer />
    </div>
  );
}

// Giữ nguyên component ActionCard của bạn...
function ActionCard({ image, title, desc, onClick }) {
  return (
    <div className="group bg-white rounded-[32px] p-8 border-2 border-slate-100 hover:border-[#00b259]/30 transition-all cursor-pointer flex flex-col h-full hover:shadow-2xl" onClick={onClick}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-black text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-500 text-sm font-medium">{desc}</p>
      </div>
      <div className="flex-1 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 min-h-[160px] group-hover:bg-[#00b259]/5 transition-colors">
        <img src={image} alt={title} className="w-20 h-20 object-contain group-hover:scale-110 transition-all duration-500" />
      </div>
      <button className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#00b259] text-slate-400 group-hover:text-white flex items-center justify-center ml-auto transition-colors font-bold">→</button>
    </div>
  );
}

export default WelcomeDashboard;