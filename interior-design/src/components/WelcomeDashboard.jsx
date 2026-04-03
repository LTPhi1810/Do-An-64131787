import React from 'react';

function WelcomeDashboard({ onChoice, user }) { // Thêm user vào đây
  return (
    // 🛑 CHỈNH: Thêm pt-20 (padding top) để không bị Topbar che
    <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex flex-col items-center justify-center p-6 pt-20">
      
      {/* Trang trí thêm một chút cho đỡ vô hồn */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>

      <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
        <div className="inline-block px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-4">
          Hệ thống đã sẵn sàng
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
          XIN CHÀO, <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">{user?.username || 'PHI'}</span>!
        </h1>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Kiến tạo không gian sống mơ ước cùng PhiSpace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {/* Các Option giữ nguyên logic như cũ nhưng Phi có thể đổi màu/icon cho tươi hơn */}
        <OptionCard 
          icon="🎨" color="bg-green-50" 
          title="TỰ VẼ LAYOUT" 
          desc="Tự do định hình kích thước phòng theo ý muốn."
          onClick={() => onChoice('CUSTOM')} 
        />
        <OptionCard 
          icon="🧊" color="bg-blue-50" 
          title="PHÒNG TIÊU CHUẨN" 
          desc="Bắt đầu ngay với căn phòng 10x10m cơ bản."
          onClick={() => onChoice('BASIC')} 
        />
        <OptionCard 
          icon="📂" color="bg-orange-50" 
          title="DỰ ÁN ĐÃ LƯU" 
          desc="Tiếp tục chỉnh sửa các bản vẽ của riêng bạn."
          onClick={() => onChoice('LOAD')} 
        />
      </div>
    </div>
  );
}

// Component phụ để code trông gọn hơn
function OptionCard({ icon, title, desc, onClick, color }) {
  return (
    <div onClick={onClick} className="group bg-white p-10 rounded-[40px] shadow-sm hover:shadow-2xl border border-slate-100 hover:border-green-400 transition-all cursor-pointer">
      <div className={`w-16 h-16 ${color} rounded-2xl mb-6 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner`}>
        {icon}
      </div>
      <h3 className="font-black text-slate-800 mb-2 uppercase text-sm tracking-tight">{title}</h3>
      <p className="text-slate-400 text-[11px] font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

export default WelcomeDashboard;