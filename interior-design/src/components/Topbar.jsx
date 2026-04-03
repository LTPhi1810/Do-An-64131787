import React from 'react';

function Topbar({ user, onLogout }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 z-[200]">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace</span>
        <span className="text-slate-300">/</span>
        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Dự án của {user?.username}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{user?.username}</p>
          <p className="text-[9px] font-bold text-[#00b259] uppercase tracking-tighter">Đang trực tuyến</p>
        </div>
        
        <button 
          onClick={onLogout}
          className="px-4 py-2 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white text-[9px] font-black rounded-xl transition-all border border-red-100"
        >
          ĐĂNG XUẤT
        </button>
      </div>
    </div>
  );
}

export default Topbar;