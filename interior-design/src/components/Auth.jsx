import React, { useState } from 'react';

function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true); // Toggle giữa Đăng nhập & Đăng ký
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'login' : 'register';
    
    try {
      const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

    if (res.ok) {
        // 🛑 CHỈNH LẠI DÒNG NÀY:
        // Không phân biệt isLogin nữa, cứ thành công là lưu token và vào App
        localStorage.setItem('token', data.token); 
        onLoginSuccess(data.user); 
        } else {
        setMessage(data.msg || 'Có lỗi xảy ra!');
        }
    } catch (err) {
      setMessage('Không kết nối được tới Server PhiSpace!');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white/20">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-[#00b259] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg mx-auto mb-6">PS</div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
            {isLogin ? 'Chào mừng!' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-slate-400 text-xs mt-2 font-medium">Khám phá không gian sáng tạo cùng PhiSpace</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
          {!isLogin && (
            <input 
              type="text" placeholder="Tên của bạn" required
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none transition-all text-sm"
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          )}
          <input 
            type="email" placeholder="Email đăng nhập" required
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none transition-all text-sm"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input 
            type="password" placeholder="Mật khẩu" required
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none transition-all text-sm"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          {message && <p className="text-center text-[10px] font-bold text-red-500 uppercase italic">{message}</p>}

          <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-[#00b259] transition-all mt-2">
            {isLogin ? 'ĐĂNG NHẬP NGAY' : 'HOÀN TẤT ĐĂNG KÝ'}
          </button>

          <p className="text-center text-[11px] text-slate-500 mt-4">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã là thành viên?'}
            <span onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="ml-2 text-[#00b259] font-black cursor-pointer hover:underline">
              {isLogin ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP'}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Auth;