import React, { useState, useEffect } from 'react';

function AdminDashboard({ onBack, settings, onSaveSettings }) {
  const [activeTab, setActiveTab] = useState('HOMEPAGE');
  const [localSettings, setLocalSettings] = useState(settings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    user: '',
    pass: '',
    secure: false,
    fromName: 'PhiSpace',
    googleClientId: '',
    googleClientSecret: '',
    googleCallbackUrl: 'http://localhost:5000/api/auth/google/callback',
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [focusedField, setFocusedField] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 4) return `${local[0] || ''}...@${domain}`;
    return `${local.slice(0, 4)}...${local.slice(-2)}@${domain}`;
  };

  const maskMiddle = (value, front = 4, back = 4) => {
    if (!value) return '';
    if (value.length <= front + back + 2) return value;
    return `${value.slice(0, front)}...${value.slice(-back)}`;
  };

  const getFileLabel = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === 'string') {
      if (value.startsWith('data:')) return 'File đã chọn';
      const parts = value.split('/');
      return parts[parts.length - 1] || fallback;
    }
    return fallback;
  };

  const getCategoryIcon = (cat) => {
    return localSettings.categoryIcons?.[cat] || `/icons/${cat.toLowerCase()}.png`;
  };

  const updateCategoryIcon = (cat, url) => {
    const updated = {
      ...localSettings,
      categoryIcons: {
        ...localSettings.categoryIcons,
        [cat]: url,
      },
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const confirmDelete = (type, cat, idx = null) => {
    setDeleteConfirm({ type, cat, idx });
  };

  const performDelete = () => {
    if (!deleteConfirm) return;
    const { type, cat, idx } = deleteConfirm;
    let updated = localSettings;

    if (type === 'category') {
      const newModels = { ...localSettings.models };
      delete newModels[cat];
      const newCategoryIcons = { ...localSettings.categoryIcons };
      delete newCategoryIcons[cat];
      updated = { ...localSettings, models: newModels, categoryIcons: newCategoryIcons };
    } else if (type === 'item') {
      const newItems = localSettings.models[cat].filter((_, itemIdx) => itemIdx !== idx);
      updated = { ...localSettings, models: { ...localSettings.models, [cat]: newItems } };
    }
    setLocalSettings(updated);
    onSaveSettings(updated);
    setDeleteConfirm(null);
  };

  const startEditItem = (cat, idx) => {
    const item = localSettings.models[cat][idx];
    setEditingItem({ cat, idx, data: { ...item, size: [...item.size] } });
  };

  const startAddItem = (cat) => {
    setEditingItem({ cat, idx: null, data: { name: '', path: '', icon: '', size: [1, 1, 1], scale: 1, offset: [0, 0, 0] } });
  };

  const saveEditingItem = () => {
    if (!editingItem) return;
    const { cat, idx, data } = editingItem;
    const updatedItems = [...localSettings.models[cat]];
    if (idx === null) {
      updatedItems.push({ ...data });
    } else {
      updatedItems[idx] = { ...data };
    }
    const updated = { ...localSettings, models: { ...localSettings.models, [cat]: updatedItems } };
    setLocalSettings(updated);
    onSaveSettings(updated);
    setEditingItem(null);
  };

  const cancelEditItem = () => {
    setEditingItem(null);
  };

  const updateEditingItemField = (field, value) => {
    if (!editingItem) return;
    setEditingItem(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const validateModels = (models) => {
    for (const cat in models) {
      for (const item of models[cat]) {
        if (!item.name || !item.path || !item.icon || !item.size || item.size.length !== 3) {
          return `Thiếu thông tin cho item ${item.name || 'unknown'} trong category ${cat}`;
        }
      }
    }
    return null;
  };

  const handleSave = () => {
    const errorMsg = validateModels(localSettings.models);
    if (errorMsg) {
      setMessage(errorMsg);
      setError(true);
    } else {
      onSaveSettings(localSettings);
      setMessage('Lưu thành công!');
      setError(false);
    }
  };

  const loadSmtpConfig = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/smtp-config');
      const data = await res.json();
      setSmtpConfig({
        host: data.host || '',
        port: data.port || '587',
        user: data.user || '',
        pass: data.pass || '',
        secure: data.secure || false,
        fromName: data.fromName || 'PhiSpace',
        googleClientId: data.googleClientId || '',
        googleClientSecret: data.googleClientSecret || '',
        googleCallbackUrl: data.googleCallbackUrl || 'http://localhost:5000/api/auth/google/callback',
      });
    } catch (err) {
      console.error('Cannot load SMTP config', err);
    }
  };

  const handleSaveSmtp = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig),
      });
      const data = await res.json();
      setMessage(data.msg || 'Cấu hình SMTP đã được lưu.');
      setError(false);
    } catch (err) {
      setMessage('Lỗi khi lưu cấu hình SMTP.');
      setError(true);
    }
  };

  useEffect(() => {
    loadSmtpConfig();
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleChangeSlideImage = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = localSettings.slides.map(s => s.id === id ? { ...s, url: reader.result } : s);
      setLocalSettings({ ...localSettings, slides: updatedSlides });
    };
    reader.readAsDataURL(file);
  };

  // 📸 Hàm xử lý khi chọn ảnh từ máy tính
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newSlide = {
        id: Date.now(),
        url: reader.result, // Dữ liệu ảnh dạng Base64
        visible: true
      };
      setLocalSettings({
        ...localSettings,
        slides: [...(localSettings.slides || []), newSlide]
      });
    };
    reader.readAsDataURL(file);
  };

  // 👁️ Hàm Bật/Tắt hiển thị
  const toggleVisibility = (id) => {
    const updatedSlides = localSettings.slides.map(s => 
      s.id === id ? { ...s, visible: !s.visible } : s
    );
    setLocalSettings({ ...localSettings, slides: updatedSlides });
  };

  // 🗑️ Hàm Xóa ảnh
  const deleteSlide = (id) => {
    const updatedSlides = localSettings.slides.filter(s => s.id !== id);
    setLocalSettings({ ...localSettings, slides: updatedSlides });
  };

  return (
    <div className="relative w-full bg-[#f8fafc] flex pt-16 min-h-screen">
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">Menu Quản Lý</h2>
        <TabButton active={activeTab === 'HOMEPAGE'} onClick={() => setActiveTab('HOMEPAGE')} icon="🖼️" label="Quản lý trang chủ" />
        <TabButton active={activeTab === 'SMTP'} onClick={() => setActiveTab('SMTP')} icon="📧" label="Cấu hình SMTP Email" />
        <TabButton active={activeTab === 'MODELS'} onClick={() => setActiveTab('MODELS')} icon="📦" label="Quản lý Models 3D" />
        <button onClick={onBack} className="mt-auto px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold w-full">Trở về Sảnh</button>
      </div>

      <div className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-black mb-8 text-slate-800">
          {activeTab === 'HOMEPAGE' && 'Cài đặt giao diện Trang chủ'}
        </h1>

        {message && <div className={`p-4 rounded-2xl mb-4 ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
          {activeTab === 'HOMEPAGE' && (
            <div className="space-y-10">
              {/* PHẦN QUẢN LÝ SLIDESHOW */}
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase mb-6 tracking-widest">Quản lý Slideshow</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {localSettings.slides?.map((slide) => (
                    <div key={slide.id} className="relative group rounded-3xl overflow-hidden border-2 border-slate-100 aspect-video bg-slate-50">
                      <img src={slide.url} className={`w-full h-full object-cover transition-all ${!slide.visible && 'grayscale opacity-50'}`} />
                      
                      {/* Lớp phủ điều khiển */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <button 
                          onClick={() => toggleVisibility(slide.id)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${slide.visible ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'}`}
                        >
                          {slide.visible ? 'Đang hiển thị' : 'Đã ẩn'}
                        </button>
                        <label htmlFor={`change-slide-${slide.id}`} className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer hover:bg-yellow-600">
                          Thay đổi ảnh
                        </label>
                        <input
                          id={`change-slide-${slide.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleChangeSlideImage(slide.id, e.target.files[0])}
                        />
                        <button 
                          onClick={() => deleteSlide(slide.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-red-600"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Nút Thêm ảnh mới */}
                  <label className="border-2 border-dashed border-slate-200 rounded-3xl aspect-video flex flex-col items-center justify-center text-slate-400 hover:border-[#00b259] hover:text-[#00b259] cursor-pointer transition-all">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <span className="text-3xl font-light">+</span>
                    <span className="text-[10px] font-black uppercase mt-2">Tải ảnh từ máy</span>
                  </label>
                </div>
              </div>

              {/* PHẦN BANNER TEXT */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiêu đề chính (Banner)</label>
                <input 
                  type="text" 
                  className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border outline-none focus:border-[#00b259]" 
                  value={localSettings.bannerText}
                  onChange={(e) => setLocalSettings({...localSettings, bannerText: e.target.value})}
                />
              </div>
              
              <button onClick={handleSave} className="px-10 py-4 bg-[#00b259] text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-green-100 hover:-translate-y-1 transition-all">
                Lưu tất cả thay đổi
              </button>
            </div>
          )}

          {/* NỘI DUNG TAB SMTP */}
          {activeTab === 'SMTP' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                    placeholder="587"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Email gửi</label>
                <input
                  type="text"
                  value={focusedField === 'user' ? smtpConfig.user : maskEmail(smtpConfig.user)}
                  onFocus={() => setFocusedField('user')}
                  onBlur={() => setFocusedField('')}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                  placeholder="admin@phispace.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Mật khẩu ứng dụng (App Password)</label>
                <input
                  type={focusedField === 'pass' ? 'text' : 'password'}
                  value={smtpConfig.pass}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField('')}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                  placeholder="••••••••••••"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP sử dụng SSL/TLS</label>
                  <select
                    value={smtpConfig.secure ? 'true' : 'false'}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.value === 'true' })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                  >
                    <option value="false">Không</option>
                    <option value="true">Có</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Tên người gửi</label>
                  <input
                    type="text"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                    placeholder="PhiSpace"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">Google Client ID</label>
                  <input
                    type="text"
                    value={focusedField === 'googleClientId' ? smtpConfig.googleClientId : maskMiddle(smtpConfig.googleClientId, 4, 4)}
                    onFocus={() => setFocusedField('googleClientId')}
                    onBlur={() => setFocusedField('')}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, googleClientId: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                    placeholder="Google Client ID"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Google Client Secret</label>
                  <input
                    type={focusedField === 'googleClientSecret' ? 'text' : 'password'}
                    value={smtpConfig.googleClientSecret}
                    onFocus={() => setFocusedField('googleClientSecret')}
                    onBlur={() => setFocusedField('')}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, googleClientSecret: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                    placeholder="Google Client Secret"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Google Callback URL</label>
                  <input
                    type="text"
                    value={smtpConfig.googleCallbackUrl}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, googleCallbackUrl: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none"
                    placeholder="http://localhost:5000/api/auth/google/callback"
                  />
                </div>
              </div>

              <button onClick={handleSaveSmtp} className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl">
                Cập nhật cấu hình SMTP / Google OAuth
              </button>
            </div>
          )}

          {/* NỘI DUNG TAB MODELS */}
          {activeTab === 'MODELS' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1 flex gap-4">
                  <input type="text" placeholder="Tên category mới" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 p-3 bg-slate-50 rounded-xl border outline-none" />
                  <button onClick={() => {
                    if (newCategoryName) {
                      const updated = {
                        ...localSettings,
                        models: {
                          ...localSettings.models,
                          [newCategoryName]: [],
                        },
                        categoryIcons: {
                          ...localSettings.categoryIcons,
                          [newCategoryName]: `/icons/${newCategoryName.toLowerCase()}.png`,
                        },
                      };
                      setLocalSettings(updated);
                      onSaveSettings(updated);
                      setNewCategoryName('');
                    }
                  }} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl">Thêm category</button>
                </div>
              </div>

              {Object.keys(localSettings.models).map(cat => (
                <div key={cat} className="border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    {editingCategory === cat ? (
                      <div className="flex-1 min-w-[220px]">
                        <input
                          type="text"
                          value={cat}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            const newModels = { ...localSettings.models };
                            const newCategoryIcons = { ...localSettings.categoryIcons };
                            if (newCat && newCat !== cat) {
                              newModels[newCat] = newModels[cat];
                              delete newModels[cat];
                              if (newCategoryIcons?.[cat]) {
                                newCategoryIcons[newCat] = newCategoryIcons[cat];
                                delete newCategoryIcons[cat];
                              }
                            }
                            const updated = { ...localSettings, models: newModels, categoryIcons: newCategoryIcons };
                            setLocalSettings(updated);
                            onSaveSettings(updated);
                            setEditingCategory(newCat);
                          }}
                          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <img src={getCategoryIcon(cat)} alt={`${cat} icon`} className="w-10 h-10 rounded-2xl border border-slate-200 object-contain bg-slate-50" />
                        <h3 className="font-bold text-lg">{cat}</h3>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap items-center">
                      <label htmlFor={`category-icon-${cat}`} className="px-3 py-2 bg-cyan-500 text-white rounded text-xs cursor-pointer">{localSettings.categoryIcons?.[cat] ? 'Thay icon' : 'Thêm icon'}</label>
                      <input
                        id={`category-icon-${cat}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => updateCategoryIcon(cat, reader.result);
                          reader.readAsDataURL(file);
                        }}
                      />
                      <button onClick={() => setEditingCategory(editingCategory === cat ? null : cat)} className="px-3 py-2 bg-yellow-500 text-white rounded text-xs">Sửa</button>
                      {editingCategory === cat && (
                        <button onClick={() => setEditingCategory(null)} className="px-3 py-2 bg-slate-400 text-white rounded text-xs">Hủy</button>
                      )}
                      <button onClick={() => confirmDelete('category', cat)} className="px-3 py-2 bg-red-500 text-white rounded text-xs">Xóa</button>
                      <button onClick={() => startAddItem(cat)} className="px-3 py-2 bg-green-500 text-white rounded text-xs">Thêm Item</button>
                    </div>
                  </div>

                  {editingItem && editingItem.cat === cat && (
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                        <div>
                          <div className="text-sm font-black uppercase tracking-wider text-slate-500">{editingItem.idx === null ? 'Thêm item mới' : 'Sửa item'}</div>
                          <div className="text-lg font-bold text-slate-800">{editingItem.data.name || 'Chưa đặt tên'}</div>
                        </div>
                        <button onClick={cancelEditItem} className="px-4 py-2 bg-slate-300 text-slate-700 rounded-xl text-xs font-bold">Hủy</button>
                      </div>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Tên item"
                          value={editingItem.data.name}
                          onChange={(e) => updateEditingItemField('name', e.target.value)}
                          className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">GLB</div>
                            <label className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 cursor-pointer hover:border-[#00b259]">
                              {getFileLabel(editingItem.data.path, 'Chọn file GLB')}
                              <input
                                type="file"
                                accept=".glb"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onloadend = () => updateEditingItemField('path', reader.result);
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Icon</div>
                            <label className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 cursor-pointer hover:border-[#00b259]">
                              {getFileLabel(editingItem.data.icon, 'Chọn ảnh icon')}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onloadend = () => updateEditingItemField('icon', reader.result);
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {['W', 'H', 'D'].map((label, i) => (
                            <div key={label} className="space-y-2">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</div>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder={label}
                                value={editingItem.data.size[i]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value.toString().replace(',', '.')) || 0;
                                  const nextSize = [...editingItem.data.size];
                                  nextSize[i] = value;
                                  updateEditingItemField('size', nextSize);
                                }}
                                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        <button onClick={saveEditingItem} className="w-full py-3 bg-[#00b259] text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all">Lưu Item</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {localSettings.models[cat].map((item, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain" />
                            <div>
                              <div className="font-bold">{item.name}</div>
                              <div className="text-[11px] text-slate-500">W:{item.size[0]} H:{item.size[1]} D:{item.size[2]}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEditItem(cat, idx)} className="px-3 py-2 bg-yellow-500 text-white rounded text-xs">Sửa</button>
                            <button onClick={() => confirmDelete('item', cat, idx)} className="px-3 py-2 bg-red-500 text-white rounded text-xs">Xóa</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-6 bg-orange-50 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-900">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {deleteConfirm.type === 'category' 
                    ? `Bạn chắc chắn muốn xóa category "${deleteConfirm.cat}" và tất cả item trong nó?` 
                    : `Bạn chắc chắn muốn xóa item này?`}
                </p>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <button
                  onClick={performDelete}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-2xl font-bold uppercase text-sm hover:bg-red-600 transition"
                >
                  Xóa
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full px-4 py-3 border border-slate-200 bg-white text-slate-700 rounded-2xl font-bold uppercase text-sm hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 p-4 rounded-2xl transition-all text-xs font-black uppercase tracking-tight ${active ? 'bg-[#00b259] text-white shadow-md' : 'hover:bg-slate-50 text-slate-500'}`}>
      <span className="text-lg">{icon}</span> {label}
    </button>
  );
}

export default AdminDashboard;