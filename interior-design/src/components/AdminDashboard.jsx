import React, { useState, useEffect } from 'react';

const CATEGORY_STANDARDS = {
  'Chair':    { size: [1.0, 1.0, 1.0], scale: 1.0 },
  'Bed':      { size: [1.8, 0.6, 2.2], scale: 1.0 },
  'Table':    { size: [1.6, 0.8, 1.0], scale: 1.0 },
  'Sofa':     { size: [2.0, 0.8, 0.9], scale: 1.0 },
  'Accessories':   { size: [0.6, 0.05, 0.45], scale: 1.0 },
  'Painting': { size: [1.0, 1.0, 0.05], scale: 1.0 },
};

function AdminDashboard({ onBack, settings, onSaveSettings }) {
  const [activeTab, setActiveTab] = useState('HOMEPAGE');
  const [localSettings, setLocalSettings] = useState(settings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: '', port: '587', user: '', pass: '', secure: false, fromName: 'PhiSpace',
    googleClientId: '', googleClientSecret: '', googleCallbackUrl: `${import.meta.env.VITE_API_URL}/api/designs/google/callback`,
  });

  // State Quản lý Model / Category
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryView, setSelectedCategoryView] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  
  // MODALS STATE
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ name: '', icon: null });
  
  const [editCategoryObj, setEditCategoryObj] = useState(null); // { oldName: '', newName: '', newIcon: null }
  const [editingItem, setEditingItem] = useState(null);
  const [quickAddItem, setQuickAddItem] = useState(null); 
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // State Quản lý User
  const [usersList, setUsersList] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [editUserObj, setEditUserObj] = useState(null); // Modal Edit User
  const [adminForcePass, setAdminForcePass] = useState({ pass: '', confirm: '' });

  const getFileLabel = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      if (value.startsWith('data:')) return 'Ảnh mới (Chờ lưu)';
      const parts = value.split('/');
      const fileName = parts[parts.length - 1];
      return fileName && fileName !== 'undefined' ? fileName : 'Ảnh hiện tại trên DB';
    }
    return null;
  };

  // Các hàm tiện ích Slideshow & SMTP
const handleChangeSlideImage = (id, file) => {
    if (!file) return; const reader = new FileReader();
    reader.onloadend = () => {
      const updated = { ...localSettings, slides: localSettings.slides.map(s => s.id === id ? { ...s, url: reader.result } : s) };
      setLocalSettings(updated); 
    }; reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onloadend = () => {
      const updated = { ...localSettings, slides: [...(localSettings.slides || []), { id: Date.now(), url: reader.result, visible: true }] };
      setLocalSettings(updated); 
    }; reader.readAsDataURL(file);
  };

  const toggleVisibility = (id) => {
    const updated = { ...localSettings, slides: localSettings.slides.map(s => s.id === id ? { ...s, visible: !s.visible } : s) };
    setLocalSettings(updated); 
  };

  const deleteSlide = (id) => {
    const updated = { ...localSettings, slides: localSettings.slides.filter(s => s.id !== id) };
    setLocalSettings(updated); 
  };

  const loadSmtpConfig = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/smtp-config`);
      const data = await res.json();
      setSmtpConfig({
        host: data.host || '', port: data.port || '587', user: '', pass: '', secure: data.secure || false, fromName: data.fromName || 'PhiSpace',
        googleClientId: '', googleClientSecret: '', googleCallbackUrl: data.googleCallbackUrl || `${import.meta.env.VITE_API_URL}/api/designs/google/callback`,
      });
    } catch (err) {}
  };

  const handleSaveSmtp = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/smtp-config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(smtpConfig) });
      const data = await res.json();
      setMessage(data.msg || 'Cấu hình SMTP đã được lưu.'); setError(false);
    } catch (err) { setMessage('Lỗi khi lưu cấu hình SMTP.'); setError(true); }
  };

  // Quản lý Users API
  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users`, { headers: { 'x-auth-token': token } });
      if (res.ok) { const data = await res.json(); setUsersList(data); }
    } catch (err) {}
  };

  useEffect(() => { setLocalSettings(settings); }, [settings]);
  useEffect(() => { loadSmtpConfig(); loadUsers(); }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify(newUserForm) });
      const data = await res.json();
      if (res.ok) {
        setMessage("Tạo người dùng thành công!"); setShowAddUser(false); setNewUserForm({ username: '', email: '', password: '', role: 'user' }); loadUsers();
      } else { setMessage(data.msg || "Lỗi tạo tài khoản!"); setError(true); }
    } catch (e) { setMessage("Lỗi mạng!"); setError(true); }
  };

  const handleUpdateUser = async () => {
    if (!editUserObj) return;
    if (adminForcePass.pass !== adminForcePass.confirm) {
      setMessage("Mật khẩu ép đổi không khớp!"); setError(true); return;
    }
    try {
      const token = localStorage.getItem('token');
      const payload = {
        username: editUserObj.username,
        email: editUserObj.email,
        role: editUserObj.role,
        password: adminForcePass.pass // Nếu mảng rỗng, backend sẽ tự động bỏ qua
      };
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users/${editUserObj._id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      
      if (res.ok) { 
        setMessage("Cập nhật toàn diện thành công!"); loadUsers(); setEditUserObj(null); setAdminForcePass({ pass: '', confirm: ''}); setError(false);
      } else { setMessage(data.msg || "Lỗi cập nhật!"); setError(true); }
    } catch (e) { setMessage("Lỗi mạng!"); setError(true); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Xóa vĩnh viễn tài khoản này?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users/${userId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      if (res.ok) { setMessage("Đã xóa User thành công!"); loadUsers(); } else { setMessage("Lỗi không thể xóa!"); setError(true); }
    } catch (e) { setMessage("Lỗi kết nối!"); setError(true); }
  };

  // Quản lý Models & Category
  const getCategoryIcon = (cat) => localSettings.categoryIcons?.[cat] || `/icons/${cat.toLowerCase()}.png`;

  const handleAddCategory = () => {
    if (!newCatForm.name) { setMessage("Vui lòng nhập tên Category!"); setError(true); return; }
    const updated = { 
      ...localSettings, 
      models: { ...localSettings.models, [newCatForm.name]: [] }, 
      categoryIcons: { ...localSettings.categoryIcons, [newCatForm.name]: newCatForm.icon || `/icons/${newCatForm.name.toLowerCase()}.png` } 
    };
    setLocalSettings(updated); onSaveSettings(updated); 
    setNewCatForm({ name: '', icon: null }); setShowAddCategoryModal(false); setMessage("Đã thêm danh mục mới!"); setError(false);
  };

  const handleSaveEditCategory = async () => {
    if (!editCategoryObj.newName) return;
    const { oldName, newName, newIcon } = editCategoryObj;
    const token = localStorage.getItem('token');
    
    // Nếu có đổi tên thì gọi API rename
    if (newName !== oldName) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/designs/furniture/rename-category`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ oldName, newName }) });
        if (!res.ok) throw new Error("Lỗi cập nhật API");
      } catch (err) { setMessage("Lỗi: Không thể lưu tên mới!"); setError(true); return; }
    }

    const newModels = { ...localSettings.models };
    const newCategoryIcons = { ...localSettings.categoryIcons };
    
    if (newName !== oldName) {
      newModels[newName] = (newModels[oldName] || []).map(item => ({ ...item, category: newName }));
      delete newModels[oldName];
      newCategoryIcons[newName] = newIcon || newCategoryIcons[oldName] || `/icons/${newName.toLowerCase()}.png`;
      delete newCategoryIcons[oldName];
    } else {
      if (newIcon) newCategoryIcons[oldName] = newIcon;
    }

    const updated = { ...localSettings, models: newModels, categoryIcons: newCategoryIcons };
    setLocalSettings(updated); await handleSaveManual(updated);
    setMessage(`Đã cập nhật Category thành công!`); setEditCategoryObj(null); setError(false);
  };

  const confirmDelete = (type, cat, idx = null) => setDeleteConfirm({ type, cat, idx });

  const performDelete = async () => {
    if (!deleteConfirm) return;
    const { type, cat, idx } = deleteConfirm;
    let updated = localSettings;
    const token = localStorage.getItem('token');

    if (type === 'category') {
      const newModels = { ...localSettings.models }; delete newModels[cat];
      const newCategoryIcons = { ...localSettings.categoryIcons }; delete newCategoryIcons[cat];
      updated = { ...localSettings, models: newModels, categoryIcons: newCategoryIcons };
      try { await fetch(`${import.meta.env.VITE_API_URL}/api/designs/furniture/category/${cat}`, { method: 'DELETE', headers: { 'x-auth-token': token } }); } catch (err) {}
      setMessage(`Đã xóa ${cat}!`); setError(false);
    } else if (type === 'item') {
      const itemToDelete = localSettings.models[cat][idx];
      if (itemToDelete._id) {
        try { await fetch(`${import.meta.env.VITE_API_URL}/api/designs/furniture/${itemToDelete._id}`, { method: 'DELETE', headers: { 'x-auth-token': token } }); } catch (err) {}
      }
      const newItems = localSettings.models[cat].filter((_, itemIdx) => itemIdx !== idx);
      updated = { ...localSettings, models: { ...localSettings.models, [cat]: newItems } };
      setMessage(`Đã xóa Item!`); setError(false);
    }
    setLocalSettings(updated); onSaveSettings(updated); setDeleteConfirm(null);
  };

  // Quản lý Items
  const handleQuickAddSelect = (e) => {
    const files = Array.from(e.target.files);
    const glbs = files.filter(f => f.name.toLowerCase().endsWith('.glb'));
    const images = files.filter(f => f.type.startsWith('image/'));

    if (glbs.length === 0) { setMessage("Vui lòng chọn ít nhất 1 file .glb!"); setError(true); return; }
    if (glbs.length > 1 || images.length > 1) { setMessage("Thêm Model chỉ hỗ trợ chọn đúng 1 file .glb và 1 file ảnh (Icon)!"); setError(true); return; }

    const glb = glbs[0]; const baseName = glb.name.replace('.glb', '');
    setQuickAddItem({ name: baseName.replace(/_/g, ' ').replace(/-/g, ' '), file: glb, iconFile: images[0] || null });
    setError(false); setMessage('');
  };

  const saveQuickItem = async () => {
    if (!quickAddItem || !selectedCategoryView) return;
    const token = localStorage.getItem('token');
    const cat = selectedCategoryView;
    setMessage(`Đang tải lên ${quickAddItem.name}...`);
    try {
      const standard = CATEGORY_STANDARDS[cat] || { size: [1, 1, 1], scale: 1.0 };
      const formData = new FormData();
      formData.append('category', cat); formData.append('name', quickAddItem.name);
      formData.append('size', JSON.stringify(standard.size)); formData.append('scale', standard.scale);
      formData.append('offset', JSON.stringify([0, 0, 0])); formData.append('file', quickAddItem.file);
      if (quickAddItem.iconFile) formData.append('iconFile', quickAddItem.iconFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/designs/furniture`, { method: 'POST', headers: { 'x-auth-token': token }, body: formData });
      if (res.ok) {
        setMessage("Đã thêm item thành công!");
        const reloadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/designs/settings`);
        const reloadData = await reloadRes.json();
        setLocalSettings(prev => ({ ...prev, models: reloadData.models || {} }));
        setQuickAddItem(null); setError(false);
      } else { setMessage("Lỗi server!"); setError(true); }
    } catch (err) { setMessage("Lỗi kết nối server!"); setError(true); }
  };

  const saveEditingItem = async () => {
    if (!editingItem) return;
    const token = localStorage.getItem('token');
    const itemId = editingItem.data._id || editingItem.data.id || (localSettings.models[editingItem.cat][editingItem.idx]?._id);

    try {
      setMessage('Đang lưu vào Database...');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/designs/furniture/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ category: editingItem.cat, ...editingItem.data }) });
      const result = await res.json();
      if (res.ok) {
        setMessage('Lưu thành công!');
        const updatedModels = { ...localSettings.models };
        updatedModels[editingItem.cat][editingItem.idx] = { ...editingItem.data, _id: itemId };
        setLocalSettings(prev => ({ ...prev, models: updatedModels }));
        setEditingItem(null); setError(false);
      } else { setMessage(result.msg || 'Lỗi: Server từ chối!'); setError(true); }
    } catch (err) { setMessage('Lỗi kết nối!'); setError(true); }
  };

  const handleSaveManual = async (settingsToSave) => {
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/designs/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ bannerText: settingsToSave.bannerText, slides: settingsToSave.slides || [], categoryIcons: settingsToSave.categoryIcons || {} }) });
  };

  const handleSave = () => {
    try {
      // Hàm onSaveSettings truyền từ App.js đã có sẵn lệnh fetch API, nên ta chỉ việc gọi ra.
      onSaveSettings(localSettings); 
      setMessage('Lưu cấu hình giao diện thành công!'); 
      setError(false); 
    } catch (err) { 
      setMessage('Không thể lưu dữ liệu!'); 
      setError(true); 
    }
  };

  return (
    <div className="relative w-full bg-[#f8fafc] flex pt-16 min-h-screen">
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">Menu Quản Lý</h2>
        <TabButton active={activeTab === 'HOMEPAGE'} onClick={() => setActiveTab('HOMEPAGE')} label="Quản lý Giao diện" />
        <TabButton active={activeTab === 'SMTP'} onClick={() => setActiveTab('SMTP')} label="Cấu hình SMTP Email" />
        <TabButton active={activeTab === 'MODELS'} onClick={() => { setActiveTab('MODELS'); setSelectedCategoryView(null); }} label="Quản lý Models 3D" />
        <TabButton active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} label="Quản lý Người dùng" />
        <button onClick={onBack} className="mt-auto px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold w-full hover:-translate-y-1 transition">Trở về Sảnh</button>
      </div>

      <div className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-black mb-8 text-slate-800">
          {activeTab === 'HOMEPAGE' && 'Cài đặt giao diện Trang chủ'}
          {activeTab === 'SMTP' && 'Cấu hình SMTP / Google OAuth'}
          {activeTab === 'MODELS' && !selectedCategoryView && 'Quản lý Models 3D'}
          {activeTab === 'MODELS' && selectedCategoryView && `Danh sách Models - ${selectedCategoryView}`}
          {activeTab === 'USERS' && 'Quản lý Tài khoản người dùng'}
        </h1>

        {message && (
          <div className={`fixed top-8 right-8 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-bold border backdrop-blur-md transition-all animate-bounce ${error ? 'bg-red-100 text-red-700 border-red-300' : 'bg-[#00b259] text-white border-[#00b259]'}`}>
            {message}
          </div>
        )}

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 min-h-[60vh]">
          {activeTab === 'HOMEPAGE' && (
            <div className="space-y-10">
              {/* SLIDES VÀ BANNER... */}
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase mb-6 tracking-widest">Quản lý Slideshow</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {localSettings.slides?.map((slide) => (
                    <div key={slide.id} className="relative group rounded-3xl overflow-hidden border-2 border-slate-100 aspect-video bg-slate-50">
                      <img src={slide.url} className={`w-full h-full object-cover transition-all ${!slide.visible && 'grayscale opacity-50'}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <button onClick={() => toggleVisibility(slide.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${slide.visible ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'}`}>
                          {slide.visible ? 'Đang hiển thị' : 'Đã ẩn'}
                        </button>
                        <label htmlFor={`change-slide-${slide.id}`} className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer hover:bg-yellow-600">Thay đổi ảnh</label>
                        <input id={`change-slide-${slide.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleChangeSlideImage(slide.id, e.target.files[0])} />
                        <button onClick={() => deleteSlide(slide.id)} className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-red-600">Xóa ảnh</button>
                      </div>
                    </div>
                  ))}
                  <label className="border-2 border-dashed border-slate-200 rounded-3xl aspect-video flex flex-col items-center justify-center text-slate-400 hover:border-[#00b259] hover:text-[#00b259] cursor-pointer transition-all">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <span className="text-3xl font-light">+</span>
                    <span className="text-[10px] font-black uppercase mt-2">Tải ảnh từ máy</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiêu đề chính (Banner)</label>
                <input type="text" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border outline-none focus:border-[#00b259]" value={localSettings.bannerText} onChange={(e) => setLocalSettings({...localSettings, bannerText: e.target.value})} />
              </div>
              <button onClick={handleSave} className="px-10 py-4 bg-[#00b259] text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-green-100 hover:-translate-y-1 transition-all">Lưu tất cả thay đổi</button>
            </div>
          )}

          {activeTab === 'SMTP' && (
            <div className="space-y-6">
              {/* FORM SMTP GIỮ NGUYÊN... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500">SMTP Host</label><input type="text" value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="smtp.gmail.com" /></div>
                <div><label className="text-xs font-bold text-slate-500">SMTP Port</label><input type="text" value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="587" /></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500">Email gửi</label><input type="text" value={smtpConfig.user} onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập email gửi" /></div>
              <div><label className="text-xs font-bold text-slate-500">Mật khẩu ứng dụng (App Password)</label><input type="password" value={smtpConfig.pass} onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập mật khẩu ứng dụng" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP sử dụng SSL/TLS</label>
                  <select value={smtpConfig.secure ? 'true' : 'false'} onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.value === 'true' })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none">
                    <option value="false">Không</option><option value="true">Có</option>
                  </select>
                </div>
                <div><label className="text-xs font-bold text-slate-500">Tên người gửi</label><input type="text" value={smtpConfig.fromName} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="PhiSpace" /></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div><label className="text-xs font-bold text-slate-500">Google Client ID</label><input type="text" value={smtpConfig.googleClientId} onChange={(e) => setSmtpConfig({ ...smtpConfig, googleClientId: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập Client ID" /></div>
                <div><label className="text-xs font-bold text-slate-500">Google Client Secret</label><input type="password" value={smtpConfig.googleClientSecret} onChange={(e) => setSmtpConfig({ ...smtpConfig, googleClientSecret: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập Client Secret" /></div>
                <div><label className="text-xs font-bold text-slate-500">Google Callback URL</label><input type="text" value={smtpConfig.googleCallbackUrl} onChange={(e) => setSmtpConfig({ ...smtpConfig, googleCallbackUrl: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder={`${import.meta.env.VITE_API_URL}/api/designs/google/callback`} /></div>
              </div>
              <button onClick={handleSaveSmtp} className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl">Cập nhật cấu hình SMTP / Google OAuth</button>
            </div>
          )}

          {activeTab === 'MODELS' && (
            <>
              {/* GIAO DIỆN CATEGORY TỔNG BÊN NGOÀI */}
              {!selectedCategoryView && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Danh sách Models</h3>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <input 
                          type="text" placeholder="Tìm kiếm Category..." 
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#00b259] transition-colors"
                          value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                      </div>
                      
                      <button onClick={() => setShowAddCategoryModal(true)} className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition whitespace-nowrap">
                        + Thêm Category
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4">Tên / Category</th>
                          <th className="p-4 w-32 text-center">Logo / Icon</th>
                          <th className="p-4 w-40 text-center">Hành Động</th>
                          <th className="p-4 w-40 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(localSettings.models)
                          .sort()
                          .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((cat) => {
                            const isSystemCategory = cat.toLowerCase() === 'door' || cat.toLowerCase() === 'window';
                            return (
                              <tr key={cat} className={`border-b border-slate-100 transition-colors ${isSystemCategory ? 'bg-slate-50/40 select-none' : 'hover:bg-slate-50/50'}`}>
                                <td 
                                  className={`p-4 font-bold text-lg transition-all ${isSystemCategory ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer hover:text-[#00b259]'}`} 
                                  onClick={() => { if (!isSystemCategory) setSelectedCategoryView(cat); }}
                                >
                                  <div className="flex items-center gap-2">
                                    {cat}
                                    {isSystemCategory && <span className="text-[9px] font-black tracking-wider bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md uppercase">System</span>}
                                  </div>
                                </td>
                                <td className="p-4 flex justify-center">
                                  <div className="w-12 h-12"><img src={getCategoryIcon(cat)} className="w-full h-full object-contain rounded-lg border border-slate-200 bg-white" /></div>
                                </td>
                                <td className="p-4 text-center">
                                  {isSystemCategory ? (
                                    <button disabled className="px-4 py-2 border border-slate-200 bg-slate-100 text-slate-300 rounded-xl text-xs font-bold cursor-not-allowed">Khóa</button>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setEditCategoryObj({ oldName: cat, newName: cat, newIcon: null }); }} className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-bold shadow-sm hover:bg-yellow-50 hover:text-yellow-600 transition">Chỉnh Sửa</button>
                                  )}
                                </td>
                                <td className="p-4 text-center">
                                  {isSystemCategory ? (
                                    <span className="text-xs font-bold text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg select-none">Hệ thống bảo vệ</span>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); confirmDelete('category', cat); }} className="px-4 py-2 bg-[#dd4b39] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition-all">Xóa</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GIAO DIỆN BÊN TRONG CATEGORY VIEW */}
              {selectedCategoryView && (
                <div>
                  <button onClick={() => { setSelectedCategoryView(null); }} className="mb-6 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
                    ← Trở lại danh mục lớn
                  </button>

                  <div className="flex flex-wrap justify-between items-end mb-6 gap-4 border-b border-slate-100 pb-6">
                    <div className="relative w-full md:w-64">
                      <input 
                        type="text" placeholder="Tìm kiếm model trong danh mục..." 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#00b259] transition-colors"
                        value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex flex-col items-end">
                        <input type="file" id="quick-add" multiple accept=".glb,image/*" onChange={handleQuickAddSelect} className="hidden" />
                        <label htmlFor="quick-add" className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition cursor-pointer">
                          + Thêm Model Mới
                        </label>
                      </div>
                    </div>
                  </div>

                  {quickAddItem && (
                    <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 shrink-0 bg-white rounded-xl flex items-center justify-center text-xs font-bold text-blue-500 border border-blue-200">GLB</div>
                          <div className="flex-1 max-w-sm">
                            <input 
                                type="text" value={quickAddItem.name} onChange={(e) => setQuickAddItem({...quickAddItem, name: e.target.value})}
                                className="font-bold text-slate-800 bg-transparent border-b-2 border-blue-400 outline-none w-full pb-1 focus:border-blue-600"
                                placeholder="Nhập tên cho Model..." autoFocus
                            />
                            <p className={`text-[10px] font-bold mt-2 ${quickAddItem.iconFile ? 'text-green-600' : 'text-red-500'}`}>
                              {quickAddItem.iconFile ? `Đã đính kèm ảnh: ${quickAddItem.iconFile.name}` : 'CHƯA CÓ ẢNH ICON (Bắt buộc phải có ảnh)'}
                            </p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => setQuickAddItem(null)} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-300 transition">Hủy bỏ</button>
                         <button onClick={saveQuickItem} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition">Lưu Lên Server</button>
                       </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-slate-200 mt-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4 w-1/2">Tên Item</th>
                          <th className="p-4 w-1/4 text-center">Logo / Icon</th>
                          <th className="p-4 w-1/4 text-center">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localSettings.models[selectedCategoryView]?.filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase())).map((item, idx) => {
                          const realIdx = localSettings.models[selectedCategoryView].indexOf(item);
                          return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                              <td className="p-4 font-bold text-slate-700">{item.name}</td>
                              <td className="p-4 flex justify-center">
                                <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-white" />
                              </td>
                              <td className="p-4 text-center">
                                {/* Căn giữa tuyệt đối các nút hành động */}
                                <div className="flex justify-center items-center gap-2 min-h-[52px]">
                                  <button onClick={() => {
                                    const standard = CATEGORY_STANDARDS[selectedCategoryView] || { size: [1, 1, 1], scale: 1.0 };
                                    setEditingItem({ cat: selectedCategoryView, idx: realIdx, data: { ...item, size: standard.size, scale: standard.scale } });
                                  }} className="px-4 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-bold shadow-sm hover:bg-yellow-50 hover:text-yellow-600 transition">Sửa</button>
                                  <button onClick={() => confirmDelete('item', selectedCategoryView, idx)} className="px-4 py-1.5 bg-[#dd4b39] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition">Xóa</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'USERS' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Danh sách tài khoản hệ thống</h3>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <input 
                      type="text" placeholder="Tìm kiếm tài khoản..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[#00b259] transition-colors"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  </div>
                  
                  <button onClick={() => setShowAddUser(true)} className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition whitespace-nowrap">
                    + Thêm Tài Khoản
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                      <th className="p-4">Tài Khoản (Username)</th>
                      <th className="p-4 text-center">Vai Trò (Role)</th>
                      <th className="p-4 w-48 text-center">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length > 0 ? usersList.filter(u => u.username.toLowerCase().includes(userSearchTerm.toLowerCase())).map((u) => (
                      <tr key={u._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-700">{u.username}</td>
                        <td className="p-4 text-center">
                          {u.username === 'admin' ? (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border border-purple-200">
                              SUPER ADMIN
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-md text-[10px] font-black uppercase tracking-wider border border-rose-200">
                              ADMIN
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                              USER
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center flex justify-center gap-2 items-center min-h-[52px]">
                          {u.username === 'admin' ? (
                            <span className="text-xs font-bold text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg">Hệ thống bảo vệ</span>
                          ) : (
                            <>
                              <button onClick={() => setEditUserObj(u)} className="px-4 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-bold shadow-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all">Chỉnh Sửa</button>
                              <button onClick={() => handleDeleteUser(u._id)} className="px-4 py-1.5 bg-[#dd4b39] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition-all">Xóa</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="3" className="p-8 text-center text-slate-400 font-bold">Chưa tải được dữ liệu User hoặc Không tìm thấy tài khoản!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ===================== CÁC MODALS POPUP TRẢI DÀI ========================= */}
        {/* ========================================================================= */}

        {/* 1. MODAL THÊM USER MỚI */}
        {showAddUser && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
             <form onSubmit={handleCreateUser} className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-200">
                <h3 className="text-xl font-black mb-6 text-slate-800 uppercase tracking-widest text-center">Tạo Tài Khoản Mới</h3>
                <div className="space-y-4">
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase">Tên đăng nhập</label><input type="text" required value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259]" /></div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase">Email</label><input type="email" required value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259]" /></div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase">Mật khẩu</label><input type="password" required value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259]" /></div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cấp quyền</label>
                    <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:border-[#00b259]">
                      <option value="user">USER (Người Dùng)</option><option value="admin">ADMIN (Quản Trị)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                   <button type="button" onClick={()=>setShowAddUser(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy</button>
                   <button type="submit" className="flex-1 py-3 bg-[#00b259] text-white rounded-xl font-bold shadow-lg hover:-translate-y-1 transition">Tạo Nhanh</button>
                </div>
             </form>
          </div>
        )}

        {/* 2. MODAL SỬA USER */}
        {editUserObj && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 my-8">
                  <div className="bg-[#00b259] p-5 text-white relative flex items-center justify-center shrink-0">
                    <h2 className="text-sm font-black uppercase tracking-widest text-center w-full">Chỉnh sửa hồ sơ</h2>
                    <button onClick={()=>{setEditUserObj(null); setAdminForcePass({pass:'', confirm:''})}} className="font-bold text-xl absolute right-6">✕</button>
                  </div>
                
                <div className="p-6 space-y-4">
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tên tài khoản</label>
                      <input type="text" value={editUserObj.username} onChange={e => setEditUserObj({...editUserObj, username: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:border-[#00b259] transition" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email liên kết</label>
                      <input type="text" value={editUserObj.email} onChange={e => setEditUserObj({...editUserObj, email: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:border-[#00b259] transition" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phân quyền (Role)</label>
                      <select value={editUserObj.role} onChange={e => setEditUserObj({...editUserObj, role: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:border-[#00b259] cursor-pointer">
                        <option value="user">USER (Người Dùng)</option>
                        <option value="admin">ADMIN (Quản Trị Viên)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase text-rose-500 tracking-widest mb-2.5">Khu vực ép đổi mật khẩu</h4>
                    <div className="space-y-2.5">
                      <input type="text" placeholder="Mật khẩu mới..." value={adminForcePass.pass} onChange={e => setAdminForcePass({...adminForcePass, pass: e.target.value})} className="w-full p-3 bg-rose-50/50 border border-rose-100 rounded-xl outline-none text-sm font-bold focus:border-rose-400 placeholder:text-rose-300" />
                      <input type="text" placeholder="Nhập lại mật khẩu..." value={adminForcePass.confirm} onChange={e => setAdminForcePass({...adminForcePass, confirm: e.target.value})} className="w-full p-3 bg-rose-50/50 border border-rose-100 rounded-xl outline-none text-sm font-bold focus:border-rose-400 placeholder:text-rose-300" />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2 mt-2">
                    <button onClick={()=>{setEditUserObj(null); setAdminForcePass({pass:'', confirm:''})}} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-slate-200 transition">Hủy bỏ</button>
                    <button onClick={handleUpdateUser} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs hover:-translate-y-1 transition shadow-md">Lưu cập nhật</button>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* 3. MODAL THÊM CATEGORY MỚI */}
        {showAddCategoryModal && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-200">
              <h3 className="text-xl font-black mb-6 text-slate-800 uppercase tracking-widest text-center">Thêm Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tên Category Mới</label>
                  <input type="text" placeholder="VD: Table, Sofa..." value={newCatForm.name} onChange={(e) => setNewCatForm({...newCatForm, name: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259] text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ảnh Icon Category (Không bắt buộc)</label>
                  <label className="block p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-bold text-slate-600 text-center transition">
                    Upload Ảnh
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files[0]; if(!file) return;
                      const reader = new FileReader(); reader.onloadend = () => setNewCatForm({...newCatForm, icon: reader.result}); reader.readAsDataURL(file);
                    }}/>
                  </label>
                  {newCatForm.icon && <img src={newCatForm.icon} className="mt-2 h-16 object-contain rounded-lg border border-slate-200" />}
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                 <button onClick={()=>{setShowAddCategoryModal(false); setNewCatForm({name:'', icon:null});}} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy bỏ</button>
                 <button onClick={handleAddCategory} className="flex-1 py-3 bg-[#00b259] text-white rounded-xl font-bold shadow-lg hover:-translate-y-1 transition">Tạo Category</button>
              </div>
            </div>
          </div>
        )}

        {/* 4. MODAL SỬA TÊN/ẢNH CATEGORY */}
        {editCategoryObj && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-200">
              <h3 className="text-xl font-black mb-6 text-slate-800 uppercase tracking-widest text-center">Chỉnh Sửa Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tên Category</label>
                  <input type="text" value={editCategoryObj.newName} onChange={(e) => setEditCategoryObj({...editCategoryObj, newName: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259] text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cập nhật ảnh Icon</label>
                  <div className="flex gap-4 items-center">
                    <img src={editCategoryObj.newIcon || getCategoryIcon(editCategoryObj.oldName)} className="w-16 h-16 object-contain rounded-xl border border-slate-200" />
                    <label className="flex-1 p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-bold text-slate-600 text-center transition">
                      Đổi Ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files[0]; if(!file) return;
                        const reader = new FileReader(); reader.onloadend = () => setEditCategoryObj({...editCategoryObj, newIcon: reader.result}); reader.readAsDataURL(file);
                      }}/>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                 <button onClick={()=>setEditCategoryObj(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Hủy bỏ</button>
                 <button onClick={handleSaveEditCategory} className="flex-1 py-3 bg-[#00b259] text-white rounded-xl font-bold shadow-lg hover:-translate-y-1 transition">Lưu Thay Đổi</button>
              </div>
            </div>
          </div>
        )}

        {/* 5. MODAL SỬA ITEM (MODEL 3D) */}
{/* 5. MODAL SỬA ITEM (MODEL 3D) */}
        {editingItem && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl border border-slate-200">
              <h3 className="text-xl font-black mb-6 text-slate-800 uppercase tracking-widest text-center">Chỉnh Sửa Model</h3>
              
              <div className="space-y-6">
                {/* Hàng 1: Tên Model */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tên Model</label>
                  <input type="text" value={editingItem.data.name} onChange={(e) => setEditingItem(prev => ({...prev, data: {...prev.data, name: e.target.value}}))} className="w-full mt-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00b259] text-sm font-bold transition" />
                </div>
                
                {/* Hàng 2: File GLB */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Cập nhật file 3D (.GLB)</label>
                  <label className="block p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-bold text-slate-600 text-center transition">
                    Tải lên file GLB mới
                    <input type="file" accept=".glb" className="hidden" onChange={(e) => {
                      const file = e.target.files[0]; if(!file) return;
                      const reader = new FileReader(); reader.onloadend = () => setEditingItem(prev => ({...prev, data: {...prev.data, path: reader.result}})); reader.readAsDataURL(file);
                    }}/>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2 px-1 truncate font-mono">📎 {getFileLabel(editingItem.data.path)}</p>
                </div>

                {/* Hàng 3: Ảnh Icon kèm Preview to rõ ràng */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Cập nhật ảnh Icon đại diện</label>
                  <div className="flex gap-4 items-center">
                    {/* Hiển thị ảnh to như bên Category */}
                    <img src={editingItem.data.icon} alt="icon preview" className="w-20 h-20 object-contain rounded-xl border border-slate-200 bg-slate-50 p-2" />
                    
                    <div className="flex-1">
                      <label className="block p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-bold text-slate-600 text-center transition">
                        Đổi Ảnh Mới
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files[0]; if(!file) return;
                          const reader = new FileReader(); reader.onloadend = () => setEditingItem(prev => ({...prev, data: {...prev.data, icon: reader.result}})); reader.readAsDataURL(file);
                        }}/>
                      </label>
                      <p className="text-[10px] text-slate-400 mt-2 px-1 truncate font-mono">🖼️ {getFileLabel(editingItem.data.icon)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                 <button onClick={()=>setEditingItem(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-slate-200 transition">Hủy bỏ</button>
                 <button onClick={saveEditingItem} className="flex-1 py-3.5 bg-[#00b259] text-white rounded-xl font-black uppercase text-xs hover:-translate-y-1 transition shadow-lg">Lưu Vào Database</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN XÓA (Giữ nguyên) */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-6 bg-red-50 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-900">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {deleteConfirm.type === 'category' 
                    ? `Bạn chắc chắn muốn xóa "${deleteConfirm.cat}" và tất cả item trong đó?` 
                    : `Bạn chắc chắn muốn xóa item này khỏi Database?`}
                </p>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <button onClick={performDelete} className="w-full px-4 py-3 bg-[#dd4b39] text-white rounded-xl font-bold uppercase text-sm hover:bg-red-700 shadow-md transition-all">Xác nhận Xóa</button>
                <button onClick={() => setDeleteConfirm(null)} className="w-full px-4 py-3 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold uppercase text-sm hover:bg-slate-50 transition-all">Hủy</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`flex items-center p-4 rounded-xl transition-all text-xs font-black uppercase tracking-tight ${active ? 'bg-[#00b259] text-white shadow-md' : 'hover:bg-slate-50 text-slate-500 border border-transparent hover:border-slate-200'}`}>
      {label}
    </button>
  );
}

export default AdminDashboard;