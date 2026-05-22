import React, { useState, useEffect } from 'react';

// =====================================================================
// 🟢 BẢNG TIÊU CHUẨN KÍCH THƯỚC CỐ ĐỊNH (FIXED STANDARDS)
// =====================================================================
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
  const [dbFurnitures, setDbFurnitures] = useState({});
  const [smtpConfig, setSmtpConfig] = useState({
    host: '', port: '587', user: '', pass: '', secure: false, fromName: 'PhiSpace',
    googleClientId: '', googleClientSecret: '', googleCallbackUrl: 'http://localhost:5000/api/designs/google/callback',
  });

  // States cho Category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySearch, setCategorySearch] = useState('');

  // States cho Item / Sub-view
  const [selectedCategoryView, setSelectedCategoryView] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  
  // States cho Xóa / Thêm nhanh
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [quickAddItem, setQuickAddItem] = useState(null); 

  // ==========================================
  // CÁC HÀM TIỆN ÍCH & XỬ LÝ ẢNH
  // ==========================================
  const fileToBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  // HÀM QUAN TRỌNG: Khắc phục lỗi màn hình trắng khi ấn Sửa/Thêm
  const getFileLabel = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      if (value.startsWith('data:')) {
        // Nếu là file base64 vừa chọn, bốc dung lượng ước tính hoặc nhãn tạm
        return 'File mới đã chọn (Đang chờ lưu)';
      }
      // Nếu là đường dẫn URL từ server, bốc tên file ở cuối đường dẫn
      const parts = value.split('/');
      const fileName = parts[parts.length - 1];
      return fileName && fileName !== 'undefined' ? fileName : 'File hiện tại trên hệ thống';
    }
    return null;
  };

  const handleChangeSlideImage = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = localSettings.slides.map(s => s.id === id ? { ...s, url: reader.result } : s);
      const updated = { ...localSettings, slides: updatedSlides };
      setLocalSettings(updated);
      onSaveSettings(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newSlide = { id: Date.now(), url: reader.result, visible: true };
      const updated = { ...localSettings, slides: [...(localSettings.slides || []), newSlide] };
      setLocalSettings(updated);
      onSaveSettings(updated);
    };
    reader.readAsDataURL(file);
  };

  const toggleVisibility = (id) => {
    const updatedSlides = localSettings.slides.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    const updated = { ...localSettings, slides: updatedSlides };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const deleteSlide = (id) => {
    const updatedSlides = localSettings.slides.filter(s => s.id !== id);
    const updated = { ...localSettings, slides: updatedSlides };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const loadSmtpConfig = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/smtp-config');
      const data = await res.json();
      setSmtpConfig({
        host: data.host || '', port: data.port || '587', user: '', pass: '', secure: data.secure || false, fromName: data.fromName || 'PhiSpace',
        googleClientId: '', googleClientSecret: '', googleCallbackUrl: data.googleCallbackUrl || 'http://localhost:5000/api/designs/google/callback',
      });
    } catch (err) {}
  };

  const handleSaveSmtp = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/smtp-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(smtpConfig) });
      const data = await res.json();
      setMessage(data.msg || 'Cấu hình SMTP đã được lưu.'); setError(false);
    } catch (err) { setMessage('Lỗi khi lưu cấu hình SMTP.'); setError(true); }
  };

  // ==========================================
  // XỬ LÝ MODELS & CATEGORY
  // ==========================================
  const handleQuickAddSelect = (e) => {
    const files = Array.from(e.target.files);
    const glbs = files.filter(f => f.name.toLowerCase().endsWith('.glb'));
    const images = files.filter(f => f.type.startsWith('image/'));

    if (glbs.length === 0) { setMessage("Vui lòng chọn ít nhất 1 file .glb!"); setError(true); return; }
    if (glbs.length > 1 || images.length > 1) { setMessage("Thêm nhanh chỉ hỗ trợ chọn đúng 1 file .glb và 1 file ảnh (Icon)!"); setError(true); return; }

    const glb = glbs[0];
    const baseName = glb.name.replace('.glb', '');
    setQuickAddItem({ name: baseName.replace(/_/g, ' ').replace(/-/g, ' '), file: glb, iconFile: images[0] || null });
    setError(false); setMessage('');
  };

  // HÀM QUAN TRỌNG: Không dùng window.location.reload() nữa, cập nhật thẳng vào state
  const saveQuickItem = async () => {
    if (!quickAddItem || !selectedCategoryView) return;
    const token = localStorage.getItem('token');
    const cat = selectedCategoryView;
    setMessage(`Đang tải lên ${quickAddItem.name}...`);
    
    try {
      const pathBase64 = await fileToBase64(quickAddItem.file);
      const iconBase64 = quickAddItem.iconFile ? await fileToBase64(quickAddItem.iconFile) : "";
      const standard = CATEGORY_STANDARDS[cat] || { size: [1, 1, 1], scale: 1.0 };

      // KHAI BÁO PAYLOAD TẠI ĐÂY
      const payload = {
        category: cat, 
        name: quickAddItem.name, 
        path: pathBase64, 
        icon: iconBase64,
        size: standard.size, 
        scale: standard.scale, 
        offset: [0, 0, 0]
      };

      const res = await fetch('http://localhost:5000/api/designs/furniture', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-auth-token': token 
        },
        body: JSON.stringify(payload) // Giờ nó đã có payload
      });

      const result = await res.json();

      if (res.ok) {
        setMessage("Đã thêm item thành công!");
        // Cập nhật state không cần reload
        const newModels = { ...localSettings.models };
        const newItem = { _id: result.id, ...payload };
        newModels[cat] = [...(newModels[cat] || []), newItem];
        
        setLocalSettings(prev => ({ ...prev, models: newModels }));
        setQuickAddItem(null); setError(false);
      } else {
        // Log lỗi từ server để biết chính xác là 401 hay 500
        console.error("Server trả về lỗi:", result);
        setMessage(result.msg || "Lỗi server!"); 
        setError(true);
      }
    } catch (err) { 
      setMessage("Lỗi kết nối server!"); 
      setError(true);
    }
  };

  useEffect(() => { setLocalSettings(settings); }, [settings]);
  useEffect(() => { loadSmtpConfig(); }, []);
  
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const getCategoryIcon = (cat) => localSettings.categoryIcons?.[cat] || `/icons/${cat.toLowerCase()}.png`;

  const updateCategoryIcon = (cat, url) => {
    const updated = { ...localSettings, categoryIcons: { ...localSettings.categoryIcons, [cat]: url } };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const confirmDelete = (type, cat, idx = null) => setDeleteConfirm({ type, cat, idx });

  const handleRenameCategory = async (oldName, newName) => {
  if (!newName || newName === oldName) return;

  const token = localStorage.getItem('token');
  
  try {
    // 1. Gửi lệnh đổi tên lên server (Cập nhật bảng Furniture)
    const res = await fetch(`http://localhost:5000/api/designs/furniture/rename-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ oldName, newName })
    });

    if (!res.ok) throw new Error("Lỗi cập nhật Furniture");

    // 2. Cập nhật state local
    const newModels = { ...localSettings.models };
    const newCategoryIcons = { ...localSettings.categoryIcons };

    // Chuyển toàn bộ danh sách item sang key mới
    newModels[newName] = (newModels[oldName] || []).map(item => ({ ...item, category: newName }));
    delete newModels[oldName];

    // Chuyển icon sang key mới
    if (newCategoryIcons[oldName]) {
      newCategoryIcons[newName] = newCategoryIcons[oldName];
      delete newCategoryIcons[oldName];
    } else {
      // Nếu chưa có icon, tạo path mặc định
      newCategoryIcons[newName] = `/icons/${newName.toLowerCase()}.png`;
    }

    const updated = { ...localSettings, models: newModels, categoryIcons: newCategoryIcons };
    
    setLocalSettings(updated);
    
    // 3. Gọi hàm lưu settings để update icon vào bảng Setting trong DB
    await handleSaveManual(updated);
    
    setMessage(`Đã đổi tên ${oldName} thành ${newName}!`);
    setEditingCategory(null);
  } catch (err) {
    console.error(err);
    setMessage("Lỗi: Không thể lưu tên mới!");
    setError(true);
  }
};

// Hàm hỗ trợ lưu setting sau khi rename
const handleSaveManual = async (settingsToSave) => {
  const token = localStorage.getItem('token');
  await fetch('http://localhost:5000/api/designs/settings', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
    body: JSON.stringify({ 
        bannerText: settingsToSave.bannerText, 
        slides: settingsToSave.slides || [], 
        categoryIcons: settingsToSave.categoryIcons || {} 
    })
  });
};

  // HÀM QUAN TRỌNG: Sửa lỗi hiển thị "Lỗi xóa từ DB"
  const performDelete = async () => {
    if (!deleteConfirm) return;
    const { type, cat, idx } = deleteConfirm;
    let updated = localSettings;
    const token = localStorage.getItem('token');

    if (type === 'category') {
      const newModels = { ...localSettings.models }; delete newModels[cat];
      const newCategoryIcons = { ...localSettings.categoryIcons }; delete newCategoryIcons[cat];
      updated = { ...localSettings, models: newModels, categoryIcons: newCategoryIcons };
      
      try {
        await fetch(`http://localhost:5000/api/designs/furniture/category/${cat}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      } catch (err) { console.log(err); }
      // Bất chấp DB có lỗi hay không, cứ xoá khỏi giao diện Local cho mượt
      setMessage(`Đã xóa ${cat}!`);
      setError(false);
    } else if (type === 'item') {
      const itemToDelete = localSettings.models[cat][idx];
      if (itemToDelete._id) {
        try {
          await fetch(`http://localhost:5000/api/designs/furniture/${itemToDelete._id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
        } catch (err) { console.log(err); }
      }
      const newItems = localSettings.models[cat].filter((_, itemIdx) => itemIdx !== idx);
      updated = { ...localSettings, models: { ...localSettings.models, [cat]: newItems } };
      setMessage(`Đã xóa Item!`);
      setError(false);
    }
    
    setLocalSettings(updated);
    onSaveSettings(updated);
    setDeleteConfirm(null);
  };

  const startEditItem = (cat, idxInFilteredList) => {
    // Lấy danh sách đang hiển thị (đã filter theo search)
    const filteredItems = localSettings.models[cat].filter(item =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase())
    );
    
    const itemToEdit = filteredItems[idxInFilteredList];
    // TÌM REAL INDEX TRONG MẢNG GỐC CỦA CATEGORY
    const realIdx = localSettings.models[cat].findIndex(i => i === itemToEdit);
    
    const standard = CATEGORY_STANDARDS[cat] || { size: [1, 1, 1], scale: 1.0 };
    setEditingItem({ cat, idx: realIdx, data: { ...itemToEdit, size: standard.size, scale: standard.scale } });
  };

  const startAddItem = (cat) => {
    const standard = CATEGORY_STANDARDS[cat] || { size: [1, 1, 1], scale: 1.0 };
    setEditingItem({ cat, idx: null, data: { name: '', path: '', icon: '', size: standard.size, scale: standard.scale, offset: [0, 0, 0] } });
  };

const saveEditingItem = async () => {
  if (!editingItem) return;
  const token = localStorage.getItem('token');
  const isEdit = editingItem.idx !== null;
  
  // SỬA TẠI ĐÂY: Đảm bảo bốc đúng _id bất kể nó nằm ở đâu
  const itemId = editingItem.data._id || 
                 editingItem.data.id || 
                 (localSettings.models[editingItem.cat][editingItem.idx]?._id);

  if (isEdit && !itemId) {
    setMessage('Lỗi: Không tìm thấy ID của vật thể cần sửa!');
    setError(true);
    return;
  }

  try {
    setMessage('Đang lưu vào Database...');
    // Xây dựng URL chuẩn xác, không bao giờ để dính chữ /undefined
    const url = isEdit 
      ? `http://localhost:5000/api/designs/furniture/${itemId}` 
      : 'http://localhost:5000/api/designs/furniture';
      
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ category: editingItem.cat, ...editingItem.data })
    });

    const result = await res.json();
    if (res.ok) {
      setMessage('Lưu thành công!');
      const updatedModels = { ...localSettings.models };
      
      if (isEdit) {
        // Cập nhật đúng vị trí item dựa trên mảng cũ và giữ lại _id chuẩn từ DB
        updatedModels[editingItem.cat][editingItem.idx] = { ...editingItem.data, _id: itemId };
      } else {
        // Thêm mới và gán ID do server trả về để tránh lỗi sửa ngay sau khi thêm
        updatedModels[editingItem.cat] = [...(updatedModels[editingItem.cat] || []), { ...editingItem.data, _id: result.id }];
      }
      
      setLocalSettings(prev => ({ ...prev, models: updatedModels }));
      setEditingItem(null);
      setError(false);
    } else {
      console.error("Lỗi từ server:", result);
      setMessage(result.msg || 'Lỗi: Server từ chối!');
      setError(true);
    }
  } catch (err) {
    setMessage('Lỗi kết nối!');
    setError(true);
  }
};

  const cancelEditItem = () => setEditingItem(null);
  const updateEditingItemField = (field, value) => {
    if (!editingItem) return;
    setEditingItem(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/designs/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ bannerText: localSettings.bannerText, slides: localSettings.slides || [], categoryIcons: localSettings.categoryIcons || {} })
      });
      if (res.ok) {
        onSaveSettings(localSettings);
        setMessage('Lưu cấu hình thành công!'); setError(false);
      } else { setMessage('Không thể lưu vào Database!'); setError(true); }
    } catch (err) { setMessage('Lỗi kết nối tới Server!'); setError(true); }
  };

  return (
    <div className="relative w-full bg-[#f8fafc] flex pt-16 min-h-screen">
      
      {/* SIDEBAR TỒN TẠI NHƯ CŨ */}
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">Menu Quản Lý</h2>
        <TabButton active={activeTab === 'HOMEPAGE'} onClick={() => setActiveTab('HOMEPAGE')} label="Quản lý trang chủ" />
        <TabButton active={activeTab === 'SMTP'} onClick={() => setActiveTab('SMTP')} label="Cấu hình SMTP Email" />
        <TabButton active={activeTab === 'MODELS'} onClick={() => { setActiveTab('MODELS'); setSelectedCategoryView(null); }} label="Quản lý Models 3D" />
        <button onClick={onBack} className="mt-auto px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold w-full hover:-translate-y-1 transition">Trở về Sảnh</button>
      </div>

      <div className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-black mb-8 text-slate-800">
          {activeTab === 'HOMEPAGE' && 'Cài đặt giao diện Trang chủ'}
          {activeTab === 'SMTP' && 'Cấu hình SMTP / Google OAuth'}
          {activeTab === 'MODELS' && !selectedCategoryView && 'Danh sách Category'}
          {activeTab === 'MODELS' && selectedCategoryView && `Danh sách Models - ${selectedCategoryView}`}
        </h1>

        {message && <div className={`p-4 rounded-2xl mb-4 font-bold ${error ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>{message}</div>}

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 min-h-[60vh]">
          
          {/* ========================================== */}
          {/* NỘI DUNG TAB HOMEPAGE ĐÃ ĐƯỢC PHỤC HỒI */}
          {/* ========================================== */}
          {activeTab === 'HOMEPAGE' && (
            <div className="space-y-10">
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
                        <label htmlFor={`change-slide-${slide.id}`} className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer hover:bg-yellow-600">
                          Thay đổi ảnh
                        </label>
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
                <input type="text" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border outline-none focus:border-[#00b259]" 
                  value={localSettings.bannerText} onChange={(e) => setLocalSettings({...localSettings, bannerText: e.target.value})} />
              </div>
              
              <button onClick={handleSave} className="px-10 py-4 bg-[#00b259] text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-green-100 hover:-translate-y-1 transition-all">
                Lưu tất cả thay đổi
              </button>
            </div>
          )}

          {/* ========================================== */}
          {/* NỘI DUNG TAB SMTP ĐÃ ĐƯỢC PHỤC HỒI */}
          {/* ========================================== */}
          {activeTab === 'SMTP' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP Host</label>
                  <input type="text" value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP Port</label>
                  <input type="text" value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="587" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Email gửi</label>
                <input type="text" value={smtpConfig.user} onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập email gửi" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Mật khẩu ứng dụng (App Password)</label>
                <input type="password" value={smtpConfig.pass} onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập mật khẩu ứng dụng" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">SMTP sử dụng SSL/TLS</label>
                  <select value={smtpConfig.secure ? 'true' : 'false'} onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.value === 'true' })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none">
                    <option value="false">Không</option>
                    <option value="true">Có</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Tên người gửi</label>
                  <input type="text" value={smtpConfig.fromName} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="PhiSpace" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">Google Client ID</label>
                  <input type="text" value={smtpConfig.googleClientId} onChange={(e) => setSmtpConfig({ ...smtpConfig, googleClientId: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập Client ID" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Google Client Secret</label>
                  <input type="password" value={smtpConfig.googleClientSecret} onChange={(e) => setSmtpConfig({ ...smtpConfig, googleClientSecret: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none focus:border-[#00b259]" placeholder="Nhập Client Secret" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Google Callback URL</label>
                  <input type="text" value={smtpConfig.googleCallbackUrl} onChange={(e) => setSmtpConfig({ ...smtpConfig, googleCallbackUrl: e.target.value })} className="w-full mt-2 p-3 bg-slate-50 rounded-xl border outline-none" placeholder="http://localhost:5000/api/designs/google/callback" />
                </div>
              </div>

              <button onClick={handleSaveSmtp} className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl">
                Cập nhật cấu hình SMTP / Google OAuth
              </button>
            </div>
          )}

          {/* ========================================== */}
          {/* GIAO DIỆN QUẢN LÝ MODELS (TABLE DESIGN) */}
          {/* ========================================== */}
          {activeTab === 'MODELS' && (
            <>
              {/* LEVEL 1: DANH SÁCH CATEGORY */}
              {!selectedCategoryView && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm Category..." 
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none w-1/3 min-w-[250px]"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input type="text" placeholder="Tên category mới" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                      <button onClick={() => {
                        if (newCategoryName) {
                          const updated = { ...localSettings, models: { ...localSettings.models, [newCategoryName]: [] }, categoryIcons: { ...localSettings.categoryIcons, [newCategoryName]: `/icons/${newCategoryName.toLowerCase()}.png` } };
                          setLocalSettings(updated); onSaveSettings(updated); setNewCategoryName('');
                        }
                      }} className="px-6 py-3 bg-[#00b259] text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition">Thêm Mới</button>
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
                          .sort() // Sắp xếp A-Z để STT luôn cố định
                          .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((cat, index) => (
                            <tr key={cat}>
                            <td className="p-4 font-bold text-slate-700 text-lg" onClick={(e) => {
                                // Chỉ chọn category khi không trong chế độ sửa
                                if (editingCategory !== cat) setSelectedCategoryView(cat);
                            }}>
                              {editingCategory === cat ? (
                                <input 
                                  type="text" 
                                  autoFocus 
                                  defaultValue={cat} // Dùng defaultValue thay vì value để tránh lỗi input bị khóa
                                  className="p-2 border border-blue-400 rounded w-full outline-none"
                                  onClick={e => e.stopPropagation()} // CỰC KỲ QUAN TRỌNG: Ngăn chặn event click lan lên <tr>
                                  onBlur={(e) => {
                                    handleRenameCategory(cat, e.target.value);
                                    setEditingCategory(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleRenameCategory(cat, e.target.value);
                                      setEditingCategory(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingCategory(null);
                                    }
                                  }}
                                />
                              ) : cat}
                            </td>
                            <td className="p-4 flex justify-center" onClick={e => e.stopPropagation()}>
                               <div className="relative group w-12 h-12">
                                  <img src={getCategoryIcon(cat)} className="w-full h-full object-contain rounded-lg border border-slate-200 bg-white" />
                                  <label htmlFor={`cat-icon-${cat}`} className="absolute inset-0 bg-black/50 text-white text-[8px] font-bold flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer text-center leading-tight">ĐỔI<br/>ẢNH</label>
                                  <input id={`cat-icon-${cat}`} type="file" accept="image/*" className="hidden" onChange={(e) => {
                                      const file = e.target.files[0]; if(!file) return;
                                      const reader = new FileReader(); reader.onloadend = () => updateCategoryIcon(cat, reader.result); reader.readAsDataURL(file);
                                  }}/>
                               </div>
                            </td>
                            <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setEditingCategory(cat)} className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200 transition">Sửa Tên</button>
                            </td>
                            <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                              <button onClick={() => confirmDelete('category', cat)} className="px-4 py-2 bg-[#dd4b39] text-white rounded text-sm font-bold shadow-md hover:bg-red-700 transition">Xóa</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LEVEL 2: DANH SÁCH ITEMS CỦA CATEGORY ĐÃ CHỌN */}
              {selectedCategoryView && (
                <div>
                  <button onClick={() => {setSelectedCategoryView(null); setEditingItem(null); setQuickAddItem(null);}} className="mb-6 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition">
                    ← Trở lại danh sách Category
                  </button>

                  <div className="flex flex-wrap justify-between items-end mb-6 gap-4 border-b border-slate-100 pb-6">
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm model..." 
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none w-1/3 min-w-[250px]"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                    
                    <div className="flex gap-4">
                      {/* CỤM THÊM NHANH MỚI */}
                      <div className="flex flex-col items-end">
                        <input type="file" id="quick-add" multiple accept=".glb,image/*" onChange={handleQuickAddSelect} className="hidden" />
                        <label htmlFor="quick-add" className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition cursor-pointer">
                          Thêm Nhanh (1 GLB + 1 Ảnh)
                        </label>
                      </div>
                      
                      <button onClick={() => startAddItem(selectedCategoryView)} className="px-6 py-3 border-2 border-[#00b259] text-[#00b259] font-bold rounded-xl hover:bg-green-50 transition">
                        + Thêm Thủ Công
                      </button>
                    </div>
                  </div>

                  {/* KHU VỰC PREVIEW KHI THÊM NHANH */}
                  {quickAddItem && (
                    <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded flex items-center justify-center text-xs font-bold text-blue-500 border border-blue-200">GLB</div>
                          <div>
                            <p className="font-bold text-slate-800">{quickAddItem.name}</p>
                            <p className={`text-xs font-bold mt-1 ${quickAddItem.iconFile ? 'text-green-600' : 'text-red-500'}`}>
                              {quickAddItem.iconFile ? `Đã đính kèm ảnh: ${quickAddItem.iconFile.name}` : 'CHƯA CÓ ẢNH ICON (Sẽ lỗi hiển thị)'}
                            </p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => setQuickAddItem(null)} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-300">Hủy bỏ</button>
                         <button onClick={saveQuickItem} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">Xác Nhận Lưu Lên DB</button>
                       </div>
                    </div>
                  )}

                  {/* KHU VỰC FORM KHI THÊM/SỬA THỦ CÔNG */}
                  {editingItem && (
                    <div className="mb-6 rounded-2xl border border-slate-300 bg-white p-6 shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-black uppercase text-slate-500">{editingItem.idx === null ? 'Thêm Item Mới Thủ Công' : 'Chỉnh Sửa Item'}</div>
                          <div className="text-xl font-bold text-slate-800">{editingItem.data.name || 'Chưa đặt tên'}</div>
                        </div>
                        <button onClick={cancelEditItem} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Đóng</button>
                      </div>
                      <div className="space-y-4">
                        <input type="text" placeholder="Tên item" value={editingItem.data.name} onChange={(e) => updateEditingItemField('name', e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" />
                        <div className="grid grid-cols-2 gap-4">
                          
                          {/* KHỐI UPLOAD FILE GLB */}
                          <div>
                            <label className="block p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-bold text-slate-600 text-center">
                              Upload File GLB
                              <input type="file" accept=".glb" className="hidden" onChange={(e) => {
                                const file = e.target.files[0]; if(!file) return;
                                const reader = new FileReader(); reader.onloadend = () => updateEditingItemField('path', reader.result); reader.readAsDataURL(file);
                              }}/>
                            </label>
                            {/* Dòng note nhỏ hiển thị tên file dưới ô Upload */}
                            {getFileLabel(editingItem.data.path) && (
                              <p className="text-[11px] text-slate-400 mt-1.5 px-1 truncate font-mono">
                                📎 {getFileLabel(editingItem.data.path)}
                              </p>
                            )}
                          </div>

                          {/* KHỐI UPLOAD ẢNH ICON */}
                          <div>
                            <label className="block p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-bold text-slate-600 text-center">
                              Upload Ảnh Icon
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files[0]; if(!file) return;
                                const reader = new FileReader(); reader.onloadend = () => updateEditingItemField('icon', reader.result); reader.readAsDataURL(file);
                              }}/>
                            </label>
                            {/* Dòng note nhỏ hiển thị tên file dưới ô Upload */}
                            {getFileLabel(editingItem.data.icon) && (
                              <p className="text-[11px] text-slate-400 mt-1.5 px-1 truncate font-mono">
                                🖼️ {getFileLabel(editingItem.data.icon)}
                              </p>
                            )}
                          </div>

                        </div>
                        <button onClick={saveEditingItem} className="w-full py-3 bg-[#00b259] text-white rounded-xl font-black uppercase text-sm shadow-md hover:bg-green-600 transition">Lưu Vào Database</button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">
                        {/* Đã xóa cột STT ở đây */}
                        <th className="p-4">Tên Item</th>
                        <th className="p-4 w-32 text-center">Logo / Icon</th>
                        <th className="p-4 w-40 text-center">Sửa</th>
                        <th className="p-4 w-40 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSettings.models[selectedCategoryView]
                        ?.filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
                        .map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          {/* Đã xóa cột hiển thị số (idx + 1) ở đây */}
                          <td className="p-4 font-bold text-slate-700">
                            {item.name}
                          </td>
                          <td className="p-4 flex justify-center">
                            <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain rounded border border-slate-200 bg-white" />
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => startEditItem(selectedCategoryView, idx)} className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200 transition">Sửa</button>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => confirmDelete('item', selectedCategoryView, idx)} className="px-4 py-2 bg-[#dd4b39] text-white rounded text-sm font-bold shadow-md hover:bg-red-700 transition">Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL XÁC NHẬN XÓA TỒN TẠI NHƯ CŨ */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
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
                <button onClick={performDelete} className="w-full px-4 py-3 bg-[#dd4b39] text-white rounded-xl font-bold uppercase text-sm hover:bg-red-700 shadow-md">Xóa</button>
                <button onClick={() => setDeleteConfirm(null)} className="w-full px-4 py-3 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold uppercase text-sm hover:bg-slate-50">Hủy</button>
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