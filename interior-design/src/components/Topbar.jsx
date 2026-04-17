import React from 'react';

// ✅ MỚI: Thêm appState vào để Topbar biết đang ở trang nào
function Topbar({ user, onLogout, onBack, appState }) { 

  // Hàm xử lý khi bấm vào chữ PhiSpace
  const handleHomeClick = () => {

    onBack('DASHBOARD');
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 z-[200]">
      
      {/* PHẦN BÊN TRÁI: LOGO VÀ ĐIỀU HƯỚNG */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={handleHomeClick}>
        <span className="text-xl font-black text-[#00b259] hover:text-[#009b4d] transition-colors">PhiSpace</span>
        <span className="text-slate-300">/</span>
        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
          {appState === 'DASHBOARD' && 'Trang chủ'}
          {appState === 'EDITOR' && `Dự án của ${user?.username}`}
          {appState === 'ADMIN' && 'Quản lý hệ thống'}
        </span>
      </div>

      {/* PHẦN BÊN PHẢI: USER & NÚT */}
      <div className="flex items-center gap-6">
        <div className="text-right border-r border-slate-100 pr-4">
          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{user?.username}</p>
          <p className="text-[8px] font-bold text-[#00b259] uppercase tracking-tighter mt-1">Đang trực tuyến</p>
        </div>

        {user?.username === 'admin' && appState !== 'ADMIN' && (
          <button 
            onClick={() => onBack('ADMIN')} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold uppercase rounded-lg shadow-sm transition-all"
          >
            ⚙️ Quản lý hệ thống
          </button>
        )}

        <button onClick={onLogout} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-black uppercase rounded-xl transition-all shadow-sm">
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

export default Topbar;