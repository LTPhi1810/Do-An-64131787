import React, { useState, useEffect } from 'react';

function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [remember, setRemember] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetStep, setResetStep] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

  const resetForm = () => {
    setForgotMode(false);
    setResetStep('request');
    setResetEmail('');
    setResetToken('');
    setNewPassword('');
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
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
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

  const handleResetPassword = async () => {
    if (!resetEmail || !resetToken || !newPassword) {
      setMessage('Vui lòng điền đủ email, token và mật khẩu mới.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword }),
      });
      const data = await res.json();
      setIsLoading(false);
      setMessage(data.msg || 'Đã đặt lại mật khẩu.');
      if (res.ok) {
        resetForm();
      }
    } catch (err) {
      setIsLoading(false);
      setMessage('Có lỗi khi đặt lại mật khẩu.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

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
    <div className="fixed inset-0 bg-slate-100">
      <div className="absolute inset-0 bg-linear-to-br from-slate-100 via-emerald-50 to-slate-100" />
      <div className="relative mx-auto flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_32px_90px_rgba(15,23,42,0.16)] ring-1 ring-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.5fr]">
            <div className="p-7 sm:p-8 lg:p-10">
              <div className="max-w-lg">
                <div className="text-sm font-black uppercase tracking-[0.45em] text-[#00b259]">Phi Space</div>
                <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Chào mừng trở lại</h1>
                <p className="mt-3 max-w-sm text-sm text-slate-600">Vui lòng nhập thông tin của bạn để đăng nhập.</p>
              </div>

              {forgotMode ? (
                <div className="mt-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Địa chỉ email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="name@example.com"
                    />
                  </div>

                  {resetStep === 'complete' && (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Mã xác nhận</label>
                        <input
                          type="text"
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          required
                          className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          placeholder="Token từ email hoặc tự động điền"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Mật khẩu mới</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          placeholder="••••••••"
                        />
                      </div>
                    </>
                  )}

                  {message && (
                    <div className="rounded-[28px] bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                      {message}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={resetStep === 'complete' ? handleResetPassword : handleSendResetEmail}
                    className="inline-flex w-full items-center justify-center rounded-[28px] bg-[#00b259] px-6 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-700"
                  >
                    {isLoading ? 'Đang xử lý...' : resetStep === 'complete' ? 'Đặt lại mật khẩu' : 'Gửi liên kết đặt lại'}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex w-full items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Quay lại màn hình đăng nhập
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tên người dùng</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        placeholder="Tên của bạn"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Địa chỉ email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Mật khẩu</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#00b259] focus:ring-[#00b259]"
                      />
                      Ghi nhớ trong 30 ngày
                    </label>
                    <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-[#00b259] hover:text-emerald-800">
                      Quên mật khẩu
                    </button>
                  </div>

                  {message && (
                    <div className="rounded-[28px] bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-[28px] bg-[#00b259] px-6 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-700"
                  >
                    {isLogin ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                </form>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="inline-flex items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <span className="h-5 w-5 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png')] bg-cover bg-center" />
                  Đăng nhập bằng Google
                </button>
                <p className="text-center text-sm text-slate-500">
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
                  <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="font-bold text-[#00b259] hover:text-emerald-800">
                    {isLogin ? 'Đăng ký' : 'Đăng nhập'}
                  </button>
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-linear-to-br from-lime-200 via-emerald-100 to-slate-100 p-5 sm:p-6 lg:p-8">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_40%)]" />
              <div className="relative flex h-full min-h-105 items-center justify-center">
                <img src="/login.jpg" alt="Hình đăng nhập" className="absolute inset-0 h-full w-full object-cover rounded-4xl shadow-xl shadow-slate-200/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
