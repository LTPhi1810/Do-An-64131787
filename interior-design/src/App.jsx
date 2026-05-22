import React, { useState, useRef, useEffect, Suspense, createContext, useContext, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera, useGLTF, Clone, Center } from '@react-three/drei'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import Auth from './components/Auth';
import Topbar from './components/Topbar';
import WelcomeDashboard from './components/WelcomeDashboard';
import AdminDashboard from './components/AdminDashboard';
import UnsavedChangesModal from './components/UnsavedChangesModal';

const CATEGORY_STANDARDS = {
  'Chair':       { size: [0.8, 1.0, 0.8] },
  'Bed':         { size: [1.8, 0.6, 2.0] },
  'Table':       { size: [1.6, 0.8, 0.8] },
  'Sofa':        { size: [2.2, 0.9, 0.9] }, 
  'Accessories': { size: [0.4, 0.05, 0.3] },
  'Painting':    { size: [1.2, 1.2, 0.05] }, 
  'Door':        { size: [1.2, 2.2, 0.2] },
  'Window':      { size: [1.5, 1.2, 0.2] },
};

const getStandardSize = (categoryName, originalSize) => {
  if (!categoryName) return originalSize;
  const standardKey = Object.keys(CATEGORY_STANDARDS).find(k => k.toLowerCase() === categoryName.toLowerCase());
  return standardKey ? CATEGORY_STANDARDS[standardKey].size : originalSize;
};

const getBaseCategories = () => { return {}; };

const SceneContext = createContext();

// ==========================================
// 1. COMPONENT ITEM 3D (ĐÃ TRẢ VỀ UNIFORM SCALE - KHÔNG BÓP MÉO)
// ==========================================
function Furniture({ config }) {
  const gltf = useGLTF(config.path);

  const uniformScale = useMemo(() => {
    const tempScene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(tempScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    // GIỮ NGUYÊN TỶ LỆ GỐC (Không bóp méo)
    const scaleX = config.size[0] / (size.x || 1);
    const scaleZ = config.size[2] / (size.z || 1);
    
    let finalScale = Math.min(scaleX, scaleZ);

    // Fix chặn phóng to quá đà cho Chuột/Bàn phím và Tranh
    if (config.category === 'Accessories' && finalScale > 2.5) finalScale = 2.5;
    if (config.category === 'Painting' && finalScale > 5.0) finalScale = 5.0;

    return finalScale; 
  }, [gltf.scene, config.path, config.size]);

  return (
    <group position={config.offset || [0, 0, 0]}>
      <Center top>
        <Clone object={gltf.scene} scale={uniformScale} />
      </Center>
    </group>
  );
}

// ==========================================
// 2. COMPONENT ĐỤC LỖ TƯỜNG 
// ==========================================
function CustomWall({ width, height, depth, position, rotation, holes, mode }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, height);
    s.lineTo(-width / 2, height);
    s.lineTo(-width / 2, 0);

    holes.forEach(hole => {
      const hPath = new THREE.Path();
      // Vẽ lỗ khoét ngược chiều kim đồng hồ để Three.js hiểu là đục lỗ
      hPath.moveTo(hole.x - hole.w / 2, hole.y - hole.h / 2);
      hPath.lineTo(hole.x - hole.w / 2, hole.y + hole.h / 2);
      hPath.lineTo(hole.x + hole.w / 2, hole.y + hole.h / 2);
      hPath.lineTo(hole.x + hole.w / 2, hole.y - hole.h / 2);
      hPath.lineTo(hole.x - hole.w / 2, hole.y - hole.h / 2);
      s.holes.push(hPath);
    });
    return s;
  }, [width, height, holes]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -depth / 2]}>
        <extrudeGeometry args={[shape, { depth: depth, bevelEnabled: false }]} />
        <meshStandardMaterial color="#e2e8f0" opacity={0.8} transparent={mode === '2D'} />
      </mesh>
    </group>
  );
}

function RoomWalls({ roomConfig, items, mode }) {
  // Lọc ra Cửa và Cửa sổ để làm lỗ khoét
  const holes = items.filter(it => it.type.includes('Door') || it.type.includes('Window'));

  const backHoles = holes.filter(it => Math.abs(it.position[2] + roomConfig.length / 2) < 0.2).map(it => ({ x: it.position[0], y: it.position[1], w: it.size[0], h: it.size[1] }));
  const frontHoles = holes.filter(it => Math.abs(it.position[2] - roomConfig.length / 2) < 0.2).map(it => ({ x: -it.position[0], y: it.position[1], w: it.size[0], h: it.size[1] }));
  const leftHoles = holes.filter(it => Math.abs(it.position[0] + roomConfig.width / 2) < 0.2).map(it => ({ x: it.position[2], y: it.position[1], w: it.size[0], h: it.size[1] }));
  const rightHoles = holes.filter(it => Math.abs(it.position[0] - roomConfig.width / 2) < 0.2).map(it => ({ x: -it.position[2], y: it.position[1], w: it.size[0], h: it.size[1] }));

  return (
    <group>
      {/* SỬA LỖI TƯỜNG BAY: Trả position Y về 0 */}
      <CustomWall width={roomConfig.width} height={2.5} depth={0.2} position={[0, 0, -roomConfig.length / 2]} rotation={[0, 0, 0]} holes={backHoles} mode={mode} />
      <CustomWall width={roomConfig.width} height={2.5} depth={0.2} position={[0, 0, roomConfig.length / 2]} rotation={[0, Math.PI, 0]} holes={frontHoles} mode={mode} />
      <CustomWall width={roomConfig.length} height={2.5} depth={0.2} position={[-roomConfig.width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} holes={leftHoles} mode={mode} />
      <CustomWall width={roomConfig.length} height={2.5} depth={0.2} position={[roomConfig.width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} holes={rightHoles} mode={mode} />
    </group>
  );
}

function SelectionArrows({ size }) {
  const [w, h, d] = size; const gap = 0.15; const coneRadius = 0.04; const coneHeight = 0.12;
  return (
    <group position={[0, 0.05, 0]}>
      <mesh position={[w/2 + gap, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[coneRadius, coneHeight, 16]} /><meshBasicMaterial color="#ff0000" /></mesh>
      <mesh position={[-w/2 - gap, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[coneRadius, coneHeight, 16]} /><meshBasicMaterial color="#ff0000" /></mesh>
      <mesh position={[0, 0, d/2 + gap]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[coneRadius, coneHeight, 16]} /><meshBasicMaterial color="#ff0000" /></mesh>
      <mesh position={[0, 0, -d/2 - gap]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[coneRadius, coneHeight, 16]} /><meshBasicMaterial color="#ff0000" /></mesh>
    </group>
  );
}

function MiniMap({ roomConfig, items }) {
  if (!roomConfig || !items) return <div className="w-full h-full bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-widest">File Trống</div>;
  const maxDim = Math.max(roomConfig.width, roomConfig.length);
  const scale = 200 / maxDim;
  return (
    <div className="relative bg-slate-700 mx-auto rounded-md border-2 border-slate-500 shadow-inner overflow-hidden flex items-center justify-center" style={{ width: 220, height: 220 }}>
      <div className="relative bg-[#cbd5e1]" style={{ width: roomConfig.width * scale, height: roomConfig.length * scale }}>
        {items.map(it => (
          <div key={it.id} className="absolute bg-emerald-500 rounded-[2px] shadow-sm border border-emerald-700 opacity-90"
                style={{
                  width: it.size[0] * scale, height: it.size[2] * scale,
                  left: (it.position[0] + roomConfig.width / 2 - it.size[0] / 2) * scale,
                  top: (it.position[2] + roomConfig.length / 2 - it.size[2] / 2) * scale,
                  transform: `rotate(${-it.rotation}rad)`
                }}
          />
        ))}
      </div>
    </div>
  );
}

function SaveLoadModal({ type, onClose, items, roomConfig, onLoad, onSaveSuccess }) {
  const [slots, setSlots] = useState([null, null, null, null, null]);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [status, setStatus] = useState('Đang đọc dữ liệu...');

  useEffect(() => {
    const localData = JSON.parse(localStorage.getItem('phiSpace_saves')) || [null, null, null, null, null];
    setSlots(localData);
    setStatus('Sẵn sàng (Local Database).');
  }, [type]);

  const handleSlotAction = (index) => {
    if (type === 'SAVE') {
      setStatus(`Đang lưu vào File ${index + 1}...`);
      setTimeout(() => {
        const newSlots = [...slots];
        newSlots[index] = { items, roomConfig, updatedAt: Date.now() };
        setSlots(newSlots);
        localStorage.setItem('phiSpace_saves', JSON.stringify(newSlots));
        setStatus(`Đã lưu File ${index + 1} thành công!`);
        if (onSaveSuccess) onSaveSuccess(); 
        setTimeout(onClose, 800);
      }, 500);
    } else {
      if (slots[index]) { onLoad(slots[index]); onClose(); }
    }
  };

  return (
    <div className="absolute inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700 overflow-hidden flex flex-col font-mono text-white">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="text-xl font-bold text-emerald-400">{type === 'SAVE' ? 'LƯU THIẾT KẾ VÀO BỘ NHỚ' : 'TẢI THIẾT KẾ TỪ BỘ NHỚ'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
        </div>
        <div className="flex h-[400px]">
          <div className="w-1/2 border-r border-slate-700 p-4 overflow-y-auto space-y-3">
            {slots.map((slot, i) => (
              <button key={i} onMouseEnter={() => setHoveredSlot(i)} onMouseLeave={() => setHoveredSlot(null)} onClick={() => handleSlotAction(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center
                  ${hoveredSlot === i ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}
                  ${!slot && type === 'LOAD' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:translate-x-2'}`}
                disabled={!slot && type === 'LOAD'}
              >
                <div>
                  <div className="font-bold text-lg text-emerald-300">File {i + 1}</div>
                  <div className="text-xs text-slate-400 mt-1">{slot ? `Cập nhật: ${new Date(slot.updatedAt).toLocaleString('vi-VN')}` : '--- TRỐNG ---'}</div>
                </div>
                <div className="text-xs font-bold text-slate-500">{slot ? `${slot.items.length} Items` : ''}</div>
              </button>
            ))}
          </div>
          <div className="w-1/2 p-6 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900">
            <h3 className="mb-4 text-emerald-400 font-bold uppercase tracking-widest text-xs">Preview {hoveredSlot !== null ? `File ${hoveredSlot + 1}` : ''}</h3>
            {hoveredSlot !== null ? <MiniMap roomConfig={slots[hoveredSlot]?.roomConfig} items={slots[hoveredSlot]?.items} /> : <div className="text-slate-500 text-xs">Rê chuột vào một file để xem trước</div>}
          </div>
        </div>
        <div className="p-4 bg-slate-800 text-center text-xs text-slate-400 border-t border-slate-700">Status: <span className={status.includes('Lỗi') ? 'text-red-400' : 'text-emerald-400'}>{status}</span></div>
      </div>
    </div>
  );
}

function CategoryModal({ category, items, onSelectItem, onClose }) {
  return (
    <div className="absolute inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-white">
        <div className="p-6 text-white bg-[#00b259] flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-widest">{category}</h2>
          <button onClick={onClose} className="font-bold text-white hover:text-slate-200 transition-colors text-lg p-1">✕</button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
          {items.map((item, idx) => (
            <button key={idx} onClick={() => onSelectItem(item)} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl hover:border-green-400 border border-transparent transition-all">
              <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain" />
              <span className="text-[10px] text-slate-700 font-bold uppercase text-center">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const navigate = useNavigate(); 
  const location = useLocation();
  const appState = location.pathname.includes('/admin') ? 'ADMIN' : location.pathname.includes('/editor') ? 'EDITOR' : 'DASHBOARD';

  const [mode, setMode] = useState('2D');
  const [items, setItems] = useState([]);
  const [pickedItemId, setPickedItemId] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [roomConfig, setRoomConfig] = useState({ width: 10, length: 10 });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingBackTarget, setPendingBackTarget] = useState(null);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('phiUser')));
  const [siteSettings, setSiteSettings] = useState({ 
    bannerText: "Thiết kế không gian sống", 
    slides: [], 
    models: getBaseCategories(), 
    categoryIcons: {} 
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/designs/settings');
        if (res.ok) { 
          const data = await res.json(); 
          const dbModels = data.models || {};
          
          // BƠM TỰ ĐỘNG: Gắn sẵn Door và Window vào danh sách để nó hiện trên Admin
          if (!dbModels['Door']) dbModels['Door'] = [];
          if (!dbModels['Window']) dbModels['Window'] = [];
          
          setSiteSettings(prev => ({ ...data, models: dbModels }));  
        }
      } catch (err) {}
    }; 
    loadSettings();
  }, []);

  const modelConfigs = {};
  Object.keys(siteSettings.models).forEach(cat => { 
    siteSettings.models[cat].forEach(item => { 
      modelConfigs[item.name] = { 
        ...item,
        category: cat,
        size: getStandardSize(cat, item.size)
      }; 
    }); 
  });

  const handleBackNavigation = (target) => {
    if (appState === 'EDITOR' && target !== 'EDITOR' && hasUnsavedChanges) { 
      setPendingBackTarget(target); setShowUnsavedModal(true); return; 
    }
    navigate(target === 'ADMIN' ? '/admin' : '/dashboard');
  };

  const addItem = (type, size) => {
    const id = Date.now();
    setItems([...items, { id, type, size, position: [0, 0, 0], rotation: 0 }]);
    setPickedItemId(id);
    setHasUnsavedChanges(true); 
  };

  const updateItem = (id, data) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...data } : it));
    setHasUnsavedChanges(true); 
  };

  if (!user) return <Auth onLoginSuccess={(u) => { localStorage.setItem('phiUser', JSON.stringify(u)); setUser(u); navigate('/dashboard'); }} />;

  return (
    <div className="relative w-screen h-screen bg-[#f1f5f9] flex overflow-hidden font-sans select-none">
      <Topbar user={user} appState={appState} onLogout={() => { localStorage.clear(); setUser(null); navigate('/'); }} onBack={handleBackNavigation} />
      
      {showUnsavedModal && <UnsavedChangesModal onDiscardChanges={() => { setShowUnsavedModal(false); setHasUnsavedChanges(false); setItems([]); navigate(pendingBackTarget === 'ADMIN' ? '/admin' : '/dashboard'); }} onContinueEditing={() => setShowUnsavedModal(false)} />}
      
      {modalType && <SaveLoadModal type={modalType} onClose={() => setModalType(null)} items={items} roomConfig={roomConfig} user={user} onSaveSuccess={() => setHasUnsavedChanges(false)} onLoad={(d) => { setItems(d.items); setRoomConfig(d.roomConfig); setHasUnsavedChanges(false); setModalType(null); navigate('/editor'); }} />}
      
      {showCustomModal && <CustomRoomModal config={roomConfig} setConfig={setRoomConfig} onClose={() => setShowCustomModal(false)} onConfirm={() => { setItems([]); setHasUnsavedChanges(false); navigate('/editor'); setShowCustomModal(false); }}/>}
      
      {showCategoryModal && selectedCategory && <CategoryModal category={selectedCategory} items={siteSettings.models[selectedCategory] || []} onSelectItem={(item) => { addItem(item.name, getStandardSize(selectedCategory, item.size)); setShowCategoryModal(false); }} onClose={() => setShowCategoryModal(false)} />}

      <Routes>
        <Route path="/dashboard" element={<WelcomeDashboard user={user} settings={siteSettings} onChoice={(c) => { if (c === 'CUSTOM') setShowCustomModal(true); else if (c === 'LOAD') setModalType('LOAD'); else { setItems([]); setRoomConfig({width:10,length:10}); navigate('/editor'); } }} />} />
        
        <Route path="/admin" element={user.username === 'admin' ? <AdminDashboard onBack={() => navigate('/dashboard')} settings={siteSettings} onSaveSettings={async (newSet) => { const token = localStorage.getItem('token'); const payload = { bannerText: newSet.bannerText, slides: newSet.slides, categoryIcons: newSet.categoryIcons }; try { await fetch('http://localhost:5000/api/designs/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify(payload) }); } catch (e) {} setSiteSettings(newSet); }} /> : <Navigate to="/dashboard" />} />
            
        <Route path="/editor" element={
          <>
            <div className="w-[110px] h-full bg-white border-r pt-20 z-20 shadow-2xl px-3 flex flex-col">
              <div className="flex-1 overflow-y-auto no-scrollbar pb-4 flex flex-col gap-2">
                {Object.keys(siteSettings.models).map(cat => (
                  <SidebarItem key={cat} icon={siteSettings.categoryIcons?.[cat] || `/icons/${cat.toLowerCase()}.png`} label={cat} onClick={() => {
                    if ((cat === 'Door' || cat === 'Window') && siteSettings.models[cat].length === 0) {
                      addItem(`${cat}_Standard`, CATEGORY_STANDARDS[cat].size);
                    } else {
                      setSelectedCategory(cat); setShowCategoryModal(true);
                    }
                  }} />
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-2 mb-4 pt-4 border-t border-slate-100">
                <button onClick={() => setModalType('SAVE')} className="py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:-translate-y-1 transition-transform">Lưu</button>
                <button onClick={() => setModalType('LOAD')} className="py-3 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:-translate-y-1 transition-transform">Tải</button>
              </div>
            </div>

            <div className="flex-1 h-full relative pt-16">
              <div className="absolute top-20 left-1/2 -translate-x-1/2 flex bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-1 z-20 border">
                <button onClick={() => setMode('2D')} className={`px-10 py-2.5 rounded-xl text-[10px] font-black ${mode === '2D' ? 'bg-[#00b259] text-white shadow-md' : 'text-slate-400'}`}>2D DESIGN</button>
                <button onClick={() => setMode('3D')} className={`px-10 py-2.5 rounded-xl text-[10px] font-black ${mode === '3D' ? 'bg-[#00b259] text-white shadow-md' : 'text-slate-400'}`}>3D VIEW</button>
              </div>
              
              <SceneContext.Provider value={{ updateItem, pickedItemId, setPickedItemId, mode, items, setItems, setHasUnsavedChanges, roomConfig, modelConfigs, modalType, setModalType }}>
                <Canvas shadows={false} gl={{ antialias: true, preserveDrawingBuffer: true }}><Suspense fallback={null}><SceneContent /></Suspense></Canvas>
              </SceneContext.Provider>
              
              <div className="absolute bottom-4 right-4 z-30 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white p-3.5 rounded-xl font-mono text-[10px] shadow-2xl flex flex-col gap-1.5 pointer-events-none">
                <div className="flex justify-between gap-6"><span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded shadow">R</kbd> Phím</span><span className="text-slate-300">Xoay Vật Thể</span></div>
                <div className="flex justify-between gap-6"><span><kbd className="bg-slate-700 px-1.5 py-0.5 rounded shadow">Del</kbd> / <kbd className="bg-slate-700 px-1.5 py-0.5 rounded shadow">B.Space</kbd></span><span className="text-slate-300">Xoá Vật Thể</span></div>
              </div>

            </div>
          </>
        } />
      </Routes>
    </div>
  );
}

function SceneContent() {
  const { mode, items, pickedItemId, setPickedItemId, updateItem, roomConfig, modelConfigs, setItems, setHasUnsavedChanges } = useContext(SceneContext);

  const getClampedPos = (x, z, size, rotation = 0) => { 
  const rad = Math.abs(rotation);
  const rotatedWidth = Math.abs(size[0] * Math.cos(rad)) + Math.abs(size[2] * Math.sin(rad));
  const rotatedDepth = Math.abs(size[0] * Math.sin(rad)) + Math.abs(size[2] * Math.cos(rad));
  
  const limitX = (roomConfig.width / 2) - (rotatedWidth / 2);
  const limitZ = (roomConfig.length / 2) - (rotatedDepth / 2);
  
  return [ THREE.MathUtils.clamp(x, -limitX, limitX), THREE.MathUtils.clamp(z, -limitZ, limitZ) ];
};

  const getAABB = (item, pos) => {
    const rad = Math.abs(item.rotation);
    const w = Math.abs(item.size[0] * Math.cos(rad)) + Math.abs(item.size[2] * Math.sin(rad));
    const d = Math.abs(item.size[0] * Math.sin(rad)) + Math.abs(item.size[2] * Math.cos(rad));
    return { minX: pos[0] - w/2, maxX: pos[0] + w/2, minZ: pos[2] - d/2, maxZ: pos[2] + d/2 };
  };

  const checkIntersect2D = (r1, r2) => { return (r1.maxX > r2.minX && r1.minX < r2.maxX && r1.maxZ > r2.minZ && r1.minZ < r2.maxZ); };

  const performUpdate = (id, data) => {
  const item = items.find(it => it.id === id); if (!item) return;
  let updated = { ...item, ...data };
  
  // 1. Clamping vị trí trong phòng
  const [clampedX, clampedZ] = getClampedPos(updated.position[0], updated.position[2], updated.size, updated.rotation);
  updated.position = [clampedX, updated.position[1], clampedZ];

  const currentItemCat = modelConfigs[updated.type]?.category || '';
  const isWallItem = currentItemCat === 'Painting' || updated.type.includes('Painting') || updated.type.includes('Door') || updated.type.includes('Window');

  // 2. Logic cho Accessories (Phụ kiện)
  if (currentItemCat === 'Accessories' && data.position) {
    let onTable = false;
    let tableHeight = 0;
    
    const r1 = getAABB(updated, updated.position);
    
    for (let other of items) {
      const otherCat = modelConfigs[other.type]?.category || '';
      if (otherCat === 'Table') {
        const r2 = getAABB(other, other.position);
        if (checkIntersect2D(r1, r2)) {
          onTable = true;
          // Lấy chiều cao của bàn từ cấu hình hoặc mặc định
          const tableConfig = modelConfigs[other.type];
          tableHeight = tableConfig ? tableConfig.size[1] : 0.8; 
          break; 
        }
      }
    }
    
    // Nếu nằm trên bàn, Y = chiều cao bàn, nếu không thì về mặt sàn (0)
    updated.position[1] = onTable ? tableHeight : 0;
    
  } else if (isWallItem) {
            const limitX = roomConfig.width / 2; const limitZ = roomConfig.length / 2;
            const dists = [Math.abs(updated.position[2] + limitZ), Math.abs(updated.position[2] - limitZ), Math.abs(updated.position[0] + limitX), Math.abs(updated.position[0] - limitX)];
            const minD = Math.min(...dists);
            
            // XÁC ĐỊNH LÙI: Cửa nằm giữa tường (0), Tranh dán bề mặt (-0.05)
            const isHole = updated.type.includes('Door') || updated.type.includes('Window');
            const offset = isHole ? 0 : -0.05; 
            
            let snapX = updated.position[0], snapZ = updated.position[2], autoRot = 0;
            
            if (minD === dists[0]) { snapZ = -limitZ - offset; autoRot = 0; } 
            else if (minD === dists[1]) { snapZ = limitZ + offset; autoRot = Math.PI; } 
            else if (minD === dists[2]) { snapX = -limitX - offset; autoRot = Math.PI / 2; } 
            else if (minD === dists[3]) { snapX = limitX + offset; autoRot = -Math.PI / 2; }

            let snapY = 1.2; 
            if (updated.type.includes('Door')) snapY = 1.1; // Cửa giữa chạm đất
            else if (updated.type.includes('Window')) snapY = 1.2; // Cửa sổ

            updated.position = [snapX, snapY, snapZ]; updated.rotation = autoRot;
          }
    updateItem(id, updated);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode === '2D' && pickedItemId) {
        if (e.key.toLowerCase() === 'r') {
          const it = items.find(i => i.id === pickedItemId);
          if (it && !it.type.includes('Painting')) performUpdate(pickedItemId, { rotation: it.rotation + Math.PI / 2 }); 
        }
        if (e.key === 'Backspace' || e.key === 'Delete') { 
          setItems(prev => prev.filter(it => it.id !== pickedItemId)); 
          setPickedItemId(null); 
          setHasUnsavedChanges(true); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, pickedItemId, items]);

  return (
    <>
      {mode === '2D' ? <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={60} /> : <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 15, 10]} intensity={1.5} shadows={false} />

      <group onPointerMove={(e) => pickedItemId && mode === '2D' && performUpdate(pickedItemId, { position: [e.point.x, items.find(it=>it.id===pickedItemId).position[1], e.point.z] })}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow={false} onClick={() => setPickedItemId(null)}><planeGeometry args={[roomConfig.width, roomConfig.length]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} sectionColor="#cbd5e1" cellColor="#e2e8f0" fadeDistance={150} />
        
        {items.map(item => {
          const currentConfig = modelConfigs[item.type] || item;
          const renderSize = currentConfig.size || item.size;

          return (
            <group key={item.id} position={item.position} rotation-y={item.rotation} onClick={(e) => { e.stopPropagation(); if(mode === '2D') setPickedItemId(item.id === pickedItemId ? null : item.id); }}>
              {modelConfigs[item.type] ? (
                <Suspense fallback={null}>
                  <Furniture config={currentConfig} />
                </Suspense>
              ) : (
                <mesh position={[0, item.type.includes('Door') || item.type.includes('Window') ? 0 : renderSize[1] / 2, 0]} receiveShadow={false} castShadow={false}>
                  <boxGeometry args={renderSize} />
                  {/* TRONG SUỐT ĐỂ NHÌN XUYÊN LỖ TRONG 3D, CÒN 2D LÀM MỜ ĐỂ CLICK CHUỘT DỄ DÀNG */}
                  <meshStandardMaterial 
                    color={item.type.includes('Door') ? "#5c3a21" : item.type.includes('Window') ? "#87ceeb" : "#10b981"} 
                    transparent={true} 
                    opacity={mode === '2D' ? 0.4 : 0.0} 
                  />
                </mesh>
              )}
              {pickedItemId === item.id && <SelectionArrows size={renderSize} />}
            </group>
          );
        })}

        {/* THAY THẾ TƯỜNG BẰNG HỆ THỐNG ĐỤC LỖ MỚI */}
        <RoomWalls roomConfig={roomConfig} items={items} mode={mode} />

      </group>
      <OrbitControls enableRotate={mode === '3D'} rotateSpeed={0.3} maxPolarAngle={Math.PI / 2 - 0.1} />
    </>
  );
}

function SidebarItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 w-full active:scale-95 transition-all shrink-0">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-transparent shadow-sm flex items-center justify-center p-2"><img src={icon} alt={label} className="w-full h-full object-contain" /></div>
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-4">{label}</span>
    </button>
  );
}

function CustomRoomModal({ config, setConfig, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 flex gap-10">
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-black mb-6">KÍCH THƯỚC PHÒNG</h2>
          <div>
            <label className="text-[10px] font-black text-slate-400">RỘNG (m)</label>
            <input type="number" value={config.width} onChange={(e) => setConfig({...config, width: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 rounded-2xl border" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400">DÀI (m)</label>
            <input type="number" value={config.length} onChange={(e) => setConfig({...config, length: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 rounded-2xl border" />
          </div>
          <button onClick={onConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">XÁC NHẬN</button><button onClick={onClose} className="w-full py-2 text-slate-400 font-bold text-[10px]">HỦY</button>
        </div>
        <div className="w-64 h-64 bg-slate-100 rounded-[30px] flex items-center justify-center border-2 border-dashed"><div style={{ width: `${config.width * 10}px`, height: `${config.length * 10}px`, maxWidth:'80%', maxHeight:'80%' }} className="bg-[#00b259] rounded-lg shadow-lg flex items-center justify-center text-white text-[10px] font-black">{config.width}x{config.length}m</div></div>
      </div>
    </div>
  );
}

export default function App() { return <Router><MainApp /></Router>; }