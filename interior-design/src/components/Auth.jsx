import React, { useState, useEffect } from 'react';

// BẢNG ĐIỂM CHUẨN PROFESSIONAL: 0 -> 5
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
    if (strength === 1) return 'bg-rose-500';     // Rất yếu
    if (strength === 2) return 'bg-orange-500';   // Yếu
    if (strength === 3) return 'bg-yellow-400';   // Trung bình
    if (strength === 4) return 'bg-emerald-400';  // Mạnh
    if (strength === 5) return 'bg-emerald-600';  // Rất mạnh
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
      {/* Đã chia thành 5 vạch */}
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

function Auth({ onLoginSuccess, settings }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [remember, setRemember] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetStep, setResetStep] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('googleToken');
    const googleEmail = params.get('googleEmail');
    const googleName = params.get('googleName');
    const error = params.get('googleError');
    const incomingResetToken = params.get('resetToken');
    const incomingResetEmail = params.get('resetEmail');

    if (googleToken && googleEmail && googleName) {
      const user = { username: decodeURIComponent(googleName), email: decodeURIComponent(googleEmail) };
      localStorage.setItem('token', googleToken);
      localStorage.setItem('phiUser', JSON.stringify(user));
      onLoginSuccess(user);
      return;
    }

    if (incomingResetToken && incomingResetEmail) {
      setForgotMode(true);
      setResetStep('complete');
      setResetToken(incomingResetToken);
      setResetEmail(decodeURIComponent(incomingResetEmail));
      setMessage('Nhập mật khẩu mới để hoàn tất đặt lại mật khẩu.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
      setMessage('Đăng nhập Google không thành công. Vui lòng thử lại.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onLoginSuccess]);

  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu nhập lại không khớp!');
    } else {
      setPasswordError('');
    }
  }, [newPassword, confirmPassword]);

  const resetForm = () => {
    setForgotMode(false);
    setResetStep('request');
    setResetEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setMessage('');
  };

  const handleForgotPassword = () => {
    setForgotMode(true);
    setResetStep('request');
    setResetEmail(formData.email);
    setMessage('');
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail) {
      setMessage('Vui lòng nhập email để gửi liên kết đặt lại mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      setMessage(data.msg || 'Yêu cầu đã được gửi.');
      setIsLoading(false);
      if (res.ok) {
        setResetStep('sent');
      }
    } catch (err) {
      setIsLoading(false);
      setMessage('Không thể gửi yêu cầu, vui lòng thử lại sau.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setMessage('Vui lòng nhập đầy đủ mật khẩu mới!'); return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu không khớp, vui lòng kiểm tra lại.'); return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword }),
      });
      const data = await res.json();
      setIsLoading(false);
      setMessage(data.msg || 'Đã đặt lại mật khẩu.');
      if (res.ok) {
        setTimeout(resetForm, 2000);
      }
    } catch (err) {
      setIsLoading(false);
      setMessage('Có lỗi khi đặt lại mật khẩu.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    if (!isLogin && !formData.username.trim()) {
      setMessage('Vui lòng nhập Tên người dùng!'); return;
    }
    if (!formData.email.trim()) {
      setMessage('Vui lòng nhập Email!'); return;
    }
    if (!formData.password) {
      setMessage('Vui lòng nhập Mật khẩu!'); return;
    }

    const endpoint = isLogin ? 'login' : 'register';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('phiUser', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setMessage(data.msg || 'Có lỗi xảy ra!');
      }
    } catch (err) {
      setMessage('Không kết nối được tới Server PhiSpace!');
    }
  };

  return (
    // Đã xóa overflow-y-auto để chặn scrollbar
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-linear-to-br from-slate-100 via-emerald-50 to-slate-100" />
      <div className="relative mx-auto flex w-full justify-center px-4">
        
        {/* Thu hẹp padding (p-8 -> p-6) để form gọn hơn */}
        <div className="w-full max-w-md rounded-[32px] bg-white/95 backdrop-blur-xl shadow-[0_32px_90px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/50 p-6 sm:p-8 transition-all">
          
          <div className="text-center mb-5">
            <div className="inline-block text-xs font-black uppercase tracking-[0.45em] text-[#00b259] bg-emerald-50 px-3 py-1 rounded-full mb-2">
              Phi Space
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {forgotMode ? 'Khôi phục mật khẩu' : isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {forgotMode ? 'Điền mật khẩu mới của bạn bên dưới.' : 'Vui lòng nhập thông tin của bạn để tiếp tục.'}
            </p>
          </div>

          {forgotMode ? (
            <form noValidate onSubmit={resetStep === 'complete' ? handleResetPassword : (e) => { e.preventDefault(); handleSendResetEmail(); }} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Địa chỉ email</label>
                <input
                  type="email"
                  value={resetEmail}
                  readOnly={resetStep === 'complete'}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 outline-none transition cursor-not-allowed"
                />
              </div>

              {resetStep === 'complete' && (
                <>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="••••••••"
                    />
                    <PasswordStrengthBar password={newPassword} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Nhập lại mật khẩu mới</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-2xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${passwordError ? 'border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
                      placeholder="••••••••"
                    />
                    {passwordError && (
                      <p className="mt-1 ml-2 text-[10px] font-bold text-rose-600 uppercase tracking-wider">{passwordError}</p>
                    )}
                  </div>
                </>
              )}

              {message && !passwordError && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (resetStep === 'complete' && !!passwordError)}
                className="inline-flex w-full mt-2 items-center justify-center rounded-2xl bg-[#00b259] px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : resetStep === 'complete' ? 'Cập nhật mật khẩu' : 'Gửi liên kết đặt lại'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex w-full mt-2 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Quay lại màn hình đăng nhập
              </button>
            </form>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="space-y-3.5">
              {!isLogin && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Tên người dùng</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Tên của bạn"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Địa chỉ email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Mật khẩu</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="••••••••"
                />
                {!isLogin && <PasswordStrengthBar password={formData.password} />}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#00b259] focus:ring-[#00b259]"
                  />
                  Ghi nhớ 30 ngày
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-[#00b259] hover:text-emerald-800 transition">
                  Quên mật khẩu?
                </button>
              </div>

              {message && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="inline-flex w-full mt-2 items-center justify-center rounded-2xl bg-[#00b259] px-6 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
              >
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </form>
          )}

          <div className="mt-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-slate-400">Hoặc</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <span className="h-4 w-4 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png')] bg-cover bg-center" />
              Đăng nhập Google
            </button>
            
            <p className="text-center text-xs text-slate-500 pt-1">
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
              <button type="button" onClick={() => { setForgotMode(false); setIsLogin(!isLogin); setMessage(''); setFormData({...formData, password: ''}); }} className="font-bold text-[#00b259] hover:text-emerald-800 transition">
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Auth;