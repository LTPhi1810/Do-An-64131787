import React, { useState, useEffect, useRef } from 'react';

const timeAgo = (dateInput) => {
  const date = new Date(dateInput);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vài giây trước";
};

// Cập nhật tính điểm (0 -> 5)
const getPasswordStrength = (pass) => {
  if (!pass) return 0;
  let score = 0; 
  if (pass.length >= 8) score += 1; 
  if (pass.length >= 12) score += 1; 
  if (/[A-Z]/.test(pass)) score += 1; 
  if (/[0-9]/.test(pass)) score += 1; 
  if (/[^A-Za-z0-9]/.test(pass)) score += 1; 
  return score;
};

const PasswordStrengthBar = ({ password }) => {
  const strength = getPasswordStrength(password);
  
  const getStrengthColor = () => {
    if (strength === 1) return 'bg-rose-500';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-yellow-400';
    if (strength === 4) return 'bg-emerald-400';
    if (strength === 5) return 'bg-emerald-600';
    return 'bg-slate-200';
  };

  const getStrengthText = () => {
    if (!password) return 'Nhập mật khẩu';
    if (strength <= 1) return 'Rất yếu';
    if (strength === 2) return 'Yếu';
    if (strength === 3) return 'Trung bình';
    if (strength === 4) return 'Mạnh';
    if (strength === 5) return 'Rất mạnh';
  };

  return (
    <div className="mt-2 px-1">
      <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
        <div className={`h-full flex-1 transition-colors duration-300 ${strength >= 1 ? getStrengthColor() : 'bg-transparent'}`}></div>
        <div className={`h-full flex-1 transition-colors duration-300 ${strength >= 2 ? getStrengthColor() : 'bg-transparent'}`}></div>
        <div className={`h-full flex-1 transition-colors duration-300 ${strength >= 3 ? getStrengthColor() : 'bg-transparent'}`}></div>
        <div className={`h-full flex-1 transition-colors duration-300 ${strength >= 4 ? getStrengthColor() : 'bg-transparent'}`}></div>
        <div className={`h-full flex-1 transition-colors duration-300 ${strength >= 5 ? getStrengthColor() : 'bg-transparent'}`}></div>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-wider mt-1.5 text-right ${strength >= 4 ? 'text-[#00b259]' : strength === 3 ? 'text-yellow-600' : 'text-slate-400'}`}>
        {getStrengthText()}
      </p>
    </div>
  );
};

function Topbar({ user, onLogout, onBack, appState }) { 
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNoti, setShowNoti] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [showProfile, setShowProfile] = useState(false);
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passMsg, setPassMsg] = useState('');
  
  const [hasPassword, setHasPassword] = useState(true);

  const dropdownRef = useRef(null);
  const notiRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/notifications'); 
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
      if (notiRef.current && !notiRef.current.contains(event.target)) setShowNoti(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async () => {
    try {
      await fetch('${import.meta.env.VITE_API_URL}/api/notifications/read-all', { method: 'PUT' });
      fetchNotifications();
    } catch (error) {}
  };

  const handleOpenProfile = async () => {
    setShowProfile(true); 
    setShowDropdown(false); 
    setPassMsg('');
    setPassForm({ oldPass: '', newPass: '', confirmPass: '' });
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/user-status/${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setHasPassword(data.hasPassword);
      }
    } catch (error) {
      setHasPassword(true);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (hasPassword && !passForm.oldPass) {
      setPassMsg('Vui lòng nhập mật khẩu hiện tại!'); return;
    }
    if (!passForm.newPass) {
      setPassMsg('Vui lòng nhập mật khẩu mới!'); return;
    }
    if (!passForm.confirmPass) {
      setPassMsg('Vui lòng xác nhận mật khẩu mới!'); return;
    }
    if (passForm.newPass !== passForm.confirmPass) {
      setPassMsg('Mật khẩu nhập lại không khớp!'); return;
    }

    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, oldPassword: passForm.oldPass, newPassword: passForm.newPass })
      });
      const data = await res.json();
      if (res.ok) {
        setPassMsg('Cập nhật mật khẩu thành công!');
        setHasPassword(true);
        setTimeout(() => { setShowProfile(false); setPassForm({ oldPass: '', newPass: '', confirmPass: '' }); }, 2000);
      } else {
        setPassMsg(data.msg || 'Có lỗi xảy ra!');
      }
    } catch (error) { setPassMsg('Lỗi kết nối Server!'); }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 z-[200]">
        
        {/* LOGO */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onBack('DASHBOARD')}>
          <span className="text-xl font-black text-[#00b259] hover:text-[#009b4d] transition-colors">PhiSpace</span>
          <span className="text-slate-300">/</span>
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
            {appState === 'DASHBOARD' && 'Trang chủ'}
            {appState === 'EDITOR' && `Dự án của ${user?.username}`}
            {appState === 'ADMIN' && 'Quản lý hệ thống'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* NÚT THÔNG BÁO (CHUÔNG) */}
          {(user?.role === 'admin' || user?.username === 'admin') && (
            <div className="relative" ref={notiRef}>
              <button onClick={() => setShowNoti(!showNoti)} className="relative p-2 text-slate-400 hover:text-[#00b259] transition-colors bg-slate-50 hover:bg-green-50 rounded-full border border-slate-100 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
              </button>

              {showNoti && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform origin-top-right transition-all">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Thông báo hệ thống</h3>
                    {unreadCount > 0 && <span onClick={handleMarkAsRead} className="text-[9px] text-[#00b259] cursor-pointer hover:underline font-bold">Đánh dấu đã đọc</span>}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-center text-slate-400 py-6 font-bold">Không có thông báo nào.</p>
                    ) : (
                      notifications.map(noti => (
                        <div key={noti._id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${noti.isRead ? 'opacity-60' : 'bg-green-50/30'}`}>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{noti.message}</p>
                          <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase">{timeAgo(noti.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(user?.role === 'admin' || user?.username === 'admin') && appState !== 'ADMIN' && (
            <button onClick={() => onBack('ADMIN')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold uppercase rounded-lg shadow-sm mr-2">⚙️ Quản lý hệ thống</button>
          )}

          {/* DROPDOWN USER INFO */}
          <div className="relative pl-4 border-l border-slate-100" ref={dropdownRef}>
            <div className="flex items-center gap-3 cursor-pointer group p-1.5 pr-3 rounded-full hover:bg-slate-50 transition-colors" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-800 uppercase leading-none group-hover:text-[#00b259]">{user?.username}</p>
                <p className="text-[8px] font-bold text-[#00b259] uppercase tracking-tighter mt-1">{user?.username === 'admin' ? 'SUPER ADMIN' : user?.role === 'admin' ? 'Quyền Quản Trị' : 'Đang trực tuyến'}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-3 h-3 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-2 flex flex-col">
                  <button 
                    onClick={handleOpenProfile}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#00b259] rounded-xl flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    Thông tin cá nhân
                  </button>
                  <button onClick={onLogout} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL THÔNG TIN CÁ NHÂN */}
      {showProfile && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#00b259] p-6 text-white relative flex justify-center items-center">
              <h2 className="text-sm font-black uppercase tracking-widest text-center">Hồ sơ cá nhân</h2>
              <button onClick={() => setShowProfile(false)} className="text-white hover:rotate-90 transition-transform font-bold text-xl absolute right-6 top-1/2 -translate-y-1/2">✕</button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tên đăng nhập</label>
                  <p className="text-sm font-bold text-slate-800 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100">{user?.username}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email đăng ký</label>
                  <p className="text-sm font-bold text-slate-800 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 truncate">{user?.email || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <form noValidate onSubmit={handleChangePassword}>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest mb-4">
                  {hasPassword ? 'Đổi mật khẩu bảo mật' : 'Tạo mật khẩu bảo mật'}
                </h3>
                
                {!hasPassword && (
                  <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-[11px] font-bold leading-relaxed shadow-sm">
                    Bạn đang đăng nhập bằng Google. <br/>
                    Bạn có thể tạo mật khẩu để đăng nhập bằng email trong tương lai.
                  </div>
                )}

                <div className="space-y-3">
                  {hasPassword && (
                    <input type="password" placeholder="Nhập mật khẩu hiện tại" value={passForm.oldPass} onChange={e => setPassForm({...passForm, oldPass: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259] transition text-sm font-bold" />
                  )}
                  
                  <div>
                    <input type="password" placeholder="Mật khẩu mới" value={passForm.newPass} onChange={e => setPassForm({...passForm, newPass: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259] transition text-sm font-bold" />
                    <PasswordStrengthBar password={passForm.newPass} />
                  </div>

                  <input type="password" placeholder="Xác nhận mật khẩu mới" value={passForm.confirmPass} onChange={e => setPassForm({...passForm, confirmPass: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259] transition text-sm font-bold" />
                </div>
                
                {passMsg && <p className={`mt-4 text-xs font-bold text-center ${passMsg.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>{passMsg}</p>}

                <div className="mt-8 flex gap-4">
                  <button type="button" onClick={() => setShowProfile(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-slate-200 transition">Hủy bỏ</button>
                  <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:-translate-y-1 transition shadow-lg">Lưu mật khẩu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Topbar;