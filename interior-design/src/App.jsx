import React, { useState, useRef, useEffect, Suspense, createContext, useContext } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera, useGLTF, Clone, Center } from '@react-three/drei'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import Auth from './components/Auth';
import Topbar from './components/Topbar';
import WelcomeDashboard from './components/WelcomeDashboard';
import AdminDashboard from './components/AdminDashboard';
import UnsavedChangesModal from './components/UnsavedChangesModal';

// =====================================================================
// 🟢 KHU VỰC 1: CẤU HÌNH & THÔNG SỐ
// =====================================================================
const CATEGORIES = {
  'Chair': [
    { name: 'Chair', path: '/models/chair.glb', scale: 0.8, offset: [0, 0, 0], icon: '/icons/chair.png', size: [0.8, 1.2, 0.8] }
  ],
  'Bed': [
    { name: 'Bed', path: '/models/bed.glb', scale: 0.008, offset: [0, 0, 0], icon: '/icons/bed.png', size: [1.8, 0.6, 3.4] }
  ],
  'Table': [
    { name: 'Table', path: '/models/table.glb', scale: 1.0, offset: [0, 0, 0], icon: '/icons/table.png', size: [2.2, 0.7, 1.3] }
  ],
  'Sofa': [
    { name: 'Sofa', path: '/models/sofa.glb', scale: 0.5, offset: [0, 0, 0], icon: '/icons/sofa.png', size: [0.8, 0.8, 0.8] }
  ],
  'Laptop': [
    { name: 'Laptop', path: '/models/laptop.glb', scale: 1.2, offset: [0, 0, 0], icon: '/icons/laptop.png', size: [0.4, 0.02, 0.3] }
  ],
  'Painting': [
    { name: 'Painting', path: '/models/painting.glb', scale: 0.5, offset: [0, 0, 0], icon: '/icons/painting.png', size: [1.2, 0.8, 0.05] }
  ],
};

const MODEL_CONFIGS = {};
Object.keys(CATEGORIES).forEach(cat => {
  CATEGORIES[cat].forEach(item => {
    MODEL_CONFIGS[item.name] = item;
  });
});

const MODELS_3D_LIST = Object.keys(MODEL_CONFIGS);
const SceneContext = createContext();

// =====================================================================
// 🟢 KHU VỰC 2: COMPONENTS PHỤ (Furniture, Arrows, Modal)
// =====================================================================
function Furniture({ config }) {
  const gltf = useGLTF(config.path); 
  return (
    <group scale={config.scale} position={config.offset}>
      <Center top><Clone object={gltf.scene} castShadow receiveShadow /></Center>
    </group>
  );
}

function SelectionArrows({ size }) {
  const [w, h, d] = size;
  const gap = 0.5; 
  return (
    <group position={[0, 0.1, 0]}>
      <mesh position={[w/2 + gap, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.1, 0.3, 32]} /><meshBasicMaterial color="#ff0000" /></mesh>
      <mesh position={[-w/2 - gap, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.1, 0.3, 32]} /><meshBasicMaterial color="#ff0000" /></mesh>
      <mesh position={[0, 0, d/2 + gap]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.1, 0.3, 32]} /><meshBasicMaterial color="#ff0000" /></mesh>
      <mesh position={[0, 0, -d/2 - gap]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.1, 0.3, 32]} /><meshBasicMaterial color="#ff0000" /></mesh>
    </group>
  );
}

function SaveLoadModal({ type, onClose, items, onLoad, user }) {
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    if (!user) return;
    const loaded = [];
    for (let i = 1; i <= 5; i++) {
      const key = `phiSpace_${user.id}_Slot_${i}`; 
      const data = localStorage.getItem(key);
      loaded.push(data ? JSON.parse(data) : null);
    }
    setSlots(loaded);
  }, [type, user.id]);

  const handleAction = (index) => {
    const key = `phiSpace_${user.id}_Slot_${index + 1}`;
    if (type === 'SAVE') {
      const data = { date: new Date().toLocaleString('vi-VN'), count: items.length, items };
      localStorage.setItem(key, JSON.stringify(data));
      setSlots(prev => { const s = [...prev]; s[index] = data; return s; });
    } else if (slots[index]) {
      onLoad(slots[index].items);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden border border-white">
        <div className={`p-6 text-white flex justify-between items-center ${type === 'SAVE' ? 'bg-[#00b259]' : 'bg-slate-800'}`}>
          <h2 className="text-xs font-black uppercase tracking-widest">{type === 'SAVE' ? 'Lưu thiết kế' : 'Tải thiết kế'}</h2>
          <button onClick={onClose} className="font-bold font-mono">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {slots.map((slot, i) => (
            <div key={i} onClick={() => handleAction(i)} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-green-400 cursor-pointer transition-all">
              <div className="font-black text-slate-700 text-[10px]">SLOT {i+1} - {slot ? slot.date : 'Slot trống'}</div>
            </div>
          ))}
        </div>
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
          <button onClick={onClose} className="font-bold font-mono">✕</button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          {items.map(item => (
            <button key={item.name} onClick={() => onSelectItem(item)} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl hover:border-green-400 border border-transparent transition-all">
              <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain" />
              <span className="text-[10px] text-slate-700 font-bold uppercase">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// 🟢 KHU VỰC 3: LÕI ĐIỀU HƯỚNG VÀ LOGIC CHÍNH
// =====================================================================
function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định appState dựa trên URL hiện tại
  const appState = location.pathname.includes('/admin') ? 'ADMIN' : 
                   location.pathname.includes('/editor') ? 'EDITOR' : 'DASHBOARD';

  const [mode, setMode] = useState('2D');
  const [items, setItems] = useState([]);
  const [pickedItemId, setPickedItemId] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [roomConfig, setRoomConfig] = useState({ width: 10, length: 10 });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingBackTarget, setPendingBackTarget] = useState(null);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('phiUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem('phiSettings');
    const defaultSettings = {
      bannerText: "Thiết kế không gian sống mơ ước",
      slides: [],
      models: CATEGORIES,
      categoryIcons: {
        Chair: '/icons/chair.png',
        Bed: '/icons/bed.png',
        Table: '/icons/table.png',
        Sofa: '/icons/sofa.png',
        Laptop: '/icons/laptop.png',
        Painting: '/icons/painting.png',
      }
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const models = siteSettings.models;
  const modelConfigs = {};
  Object.keys(models).forEach(cat => {
    models[cat].forEach(item => {
      modelConfigs[item.name] = item;
    });
  });

  const handleChoice = (type) => {
    if (type === 'BASIC') {
      setItems([]); 
      setRoomConfig({ width: 10, length: 10 }); 
      navigate('/editor');
    } else if (type === 'LOAD') {
      setModalType('LOAD'); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('phiUser'); 
    setUser(null); 
    setItems([]); 
    navigate('/');
  };

  const getTargetPath = (target) => target === 'ADMIN' ? '/admin' : '/dashboard';

  const handleBackNavigation = (target) => {
    if (appState === 'EDITOR' && target !== 'EDITOR' && items.length > 0) {
      setPendingBackTarget(target);
      setShowUnsavedModal(true);
      return;
    }
    navigate(getTargetPath(target));
  };

  const discardUnsavedChanges = () => {
    setShowUnsavedModal(false);
    setPendingBackTarget(null);
    setItems([]);
    navigate(getTargetPath(pendingBackTarget || 'DASHBOARD'));
  };

  const addItem = (type, color, size) => {
    const id = Date.now();
    let posY = MODELS_3D_LIST.includes(type) ? 0 : size[1] / 2;
    setItems([...items, { id, type, color, size, position: [0, posY, 0], rotation: 0 }]);
    setPickedItemId(id);
  };

  const updateItem = (id, data) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...data } : it));
  };

  // Màn hình đăng nhập nếu chưa có User
  if (!user) {
    return <Auth onLoginSuccess={(userData) => { 
      localStorage.setItem('phiUser', JSON.stringify(userData)); 
      setUser(userData); 
      navigate('/dashboard'); 
    }} />;
  }

  return (
    <div className="relative w-screen h-screen bg-[#f1f5f9] flex overflow-hidden font-sans select-none">
      <Topbar 
        user={user} 
        appState={appState} 
        onLogout={handleLogout} 
        onBack={handleBackNavigation} 
      />

      {showUnsavedModal && (
        <UnsavedChangesModal
          onDiscardChanges={discardUnsavedChanges}
          onContinueEditing={() => {
            setShowUnsavedModal(false);
            setPendingBackTarget(null);
          }}
        />
      )}

      {modalType && (
        <SaveLoadModal 
          type={modalType} 
          onClose={() => setModalType(null)} 
          items={items} 
          user={user}
          onLoad={(loadedItems) => {
            setItems(loadedItems);
            setModalType(null); 
            navigate('/editor');
          }} 
        />
      )}

      {showCustomModal && (
        <CustomRoomModal config={roomConfig} setConfig={setRoomConfig} onClose={() => setShowCustomModal(false)} onConfirm={() => {
          setItems([]); navigate('/editor'); setShowCustomModal(false);
        }}/>
      )}

      {showCategoryModal && selectedCategory && (
        <CategoryModal 
          category={selectedCategory} 
          items={siteSettings.models[selectedCategory] || []} 
          onSelectItem={(item) => { 
            addItem(item.name, '#10b981', item.size); 
            setShowCategoryModal(false); 
          }} 
          onClose={() => setShowCategoryModal(false)} 
        />
      )}

      <Routes>
        <Route path="/dashboard" element={
          <WelcomeDashboard user={user} settings={siteSettings} onChoice={(choice) => {
            if (choice === 'CUSTOM') setShowCustomModal(true);
            else handleChoice(choice);
          }} />
        } />

        <Route path="/admin" element={
          user.username === 'admin' ? (
            <AdminDashboard 
              onBack={() => navigate('/dashboard')} 
              settings={siteSettings} 
              onSaveSettings={(newSettings) => {
                setSiteSettings(newSettings);
                localStorage.setItem('phiSettings', JSON.stringify(newSettings));
              }}
            />
          ) : <Navigate to="/dashboard" />
        } />

        <Route path="/editor" element={
          <>
            <div className="w-[110px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-8 pt-20 z-20 shadow-2xl shrink-0">
              <div className="flex flex-col gap-6 w-full px-3">
                {Object.keys(siteSettings.models).map(cat => (
                  <SidebarItem
                    key={cat}
                    icon={siteSettings.categoryIcons?.[cat] || `/icons/${cat.toLowerCase()}.png`}
                    label={cat}
                    onClick={() => { setSelectedCategory(cat); setShowCategoryModal(true); }}
                  />
                ))}
              </div>
              <div className="mt-auto w-full px-3 flex flex-col gap-2">
                <button onClick={() => setModalType('SAVE')} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase">Lưu</button>
                <button onClick={() => setModalType('LOAD')} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase">Tải</button>
              </div>
            </div>
            <div className="flex-1 h-full relative pt-16">
              <div className="absolute top-20 left-1/2 -translate-x-1/2 flex bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-1 z-20 border border-white/50">
                <button onClick={() => setMode('2D')} className={`px-10 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === '2D' ? 'bg-[#00b259] text-white shadow-lg' : 'text-slate-400'}`}>2D DESIGN</button>
                <button onClick={() => setMode('3D')} className={`px-10 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === '3D' ? 'bg-[#00b259] text-white shadow-lg' : 'text-slate-400'}`}>3D VIEW</button>
              </div>
              <SceneContext.Provider value={{ updateItem, pickedItemId, setPickedItemId, mode, items, setItems, roomConfig, modelConfigs }}>
                <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
                  <Suspense fallback={null}> <SceneContent /> </Suspense>
                </Canvas>
              </SceneContext.Provider>
            </div>
          </>
        } />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  );
}

// =====================================================================
// 🟢 KHU VỰC 4:SceneContent & VẬT LÝ
// =====================================================================
function SceneContent() {
  const controlsRef = useRef();
  const { mode, items, pickedItemId, setPickedItemId, updateItem, setItems, roomConfig, modelConfigs } = useContext(SceneContext);
  
  const getClampedPos = (x, z, size, rotation = 0, type) => { 
    const rad = Math.abs(rotation);
    const rotatedWidth = Math.abs(size[0] * Math.cos(rad)) + Math.abs(size[2] * Math.sin(rad));
    const rotatedDepth = Math.abs(size[0] * Math.sin(rad)) + Math.abs(size[2] * Math.cos(rad));
    const limitX = (roomConfig.width / 2) - (rotatedWidth / 2) - 0.01;
    const limitZ = (roomConfig.length / 2) - (rotatedDepth / 2) - 0.01;
    if (type === 'Laptop') return [THREE.MathUtils.clamp(x, -limitX, limitX), 0.95, THREE.MathUtils.clamp(z, -limitZ, limitZ)];
    return [THREE.MathUtils.clamp(x, -limitX, limitX), 0, THREE.MathUtils.clamp(z, -limitZ, limitZ)];
  };

  const checkCollision = (itemId, newPos, itemSize, itemRot, allItems) => {
    const rad1 = Math.abs(itemRot);
    const w1 = Math.abs(itemSize[0] * Math.cos(rad1)) + Math.abs(itemSize[2] * Math.sin(rad1));
    const d1 = Math.abs(itemSize[0] * Math.sin(rad1)) + Math.abs(itemSize[2] * Math.cos(rad1));
    const r1 = { minX: newPos[0]-w1/2, maxX: newPos[0]+w1/2, minZ: newPos[2]-d1/2, maxZ: newPos[2]+d1/2 };
    for (let other of allItems) {
      if (other.id === itemId || ['Laptop', 'Painting'].includes(other.type)) continue;
      const rad2 = Math.abs(other.rotation);
      const w2 = Math.abs(other.size[0] * Math.cos(rad2)) + Math.abs(other.size[2] * Math.sin(rad2));
      const d2 = Math.abs(other.size[0] * Math.sin(rad2)) + Math.abs(other.size[2] * Math.cos(rad2));
      const r2 = { minX: other.position[0]-w2/2, maxX: other.position[0]+w2/2, minZ: other.position[2]-d2/2, maxZ: other.position[2]+d2/2 };
      if (r1.maxX > r2.minX && r1.minX < r2.maxX && r1.maxZ > r2.minZ && r1.minZ < r2.maxZ) return true;
    }
    return false;
  };

  const performUpdate = (id, data) => {
    const item = items.find(it => it.id === id);
    if (!item) return;
    let updated = { ...item, ...data };
    if (updated.type === 'Painting') {
        const limitX = roomConfig.width / 2; const limitZ = roomConfig.length / 2;
        const dists = [Math.abs(updated.position[2] + limitZ), Math.abs(updated.position[2] - limitZ), Math.abs(updated.position[0] + limitX), Math.abs(updated.position[0] - limitX)];
        const minD = Math.min(...dists);
        let snapX = updated.position[0], snapZ = updated.position[2], autoRot = 0;
        if (minD === dists[0]) { snapZ = -limitZ + 0.05; autoRot = 0; }
        else if (minD === dists[1]) { snapZ = limitZ - 0.05; autoRot = Math.PI; }
        else if (minD === dists[2]) { snapX = -limitX + 0.05; autoRot = Math.PI / 2; }
        else if (minD === dists[3]) { snapX = limitX - 0.05; autoRot = -Math.PI / 2; }
        updated.position = [snapX, 1.5, snapZ]; updated.rotation = autoRot;
    } else {
        updated.position = getClampedPos(updated.position[0], updated.position[2], updated.size, updated.rotation, updated.type);
        if (data.position && checkCollision(id, updated.position, updated.size, updated.rotation, items)) return; 
    }
    updateItem(id, updated);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode === '2D' && pickedItemId) {
        if (e.key.toLowerCase() === 'r') {
          const it = items.find(i => i.id === pickedItemId);
          if (it && it.type !== 'Painting') performUpdate(pickedItemId, { rotation: it.rotation + Math.PI / 2 });
        }
        if (e.key === 'Backspace') { setItems(prev => prev.filter(it => it.id !== pickedItemId)); setPickedItemId(null); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, pickedItemId, items]);

  useFrame(() => controlsRef.current && controlsRef.current.update());

  return (
    <>
      {mode === '2D' ? <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={60} /> : <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 15, 10]} castShadow intensity={1.5} />
      <group onPointerMove={(e) => pickedItemId && mode === '2D' && performUpdate(pickedItemId, { position: [e.point.x, 0, e.point.z] })}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow onClick={() => setPickedItemId(null)}>
          <planeGeometry args={[roomConfig.width, roomConfig.length]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} sectionColor="#cbd5e1" cellColor="#e2e8f0" fadeDistance={150} />
        {items.map(item => (
          <group key={item.id} position={item.position} rotation-y={item.rotation} onClick={(e) => { e.stopPropagation(); if(mode === '2D') setPickedItemId(item.id === pickedItemId ? null : item.id); }}>
            {Object.keys(modelConfigs).includes(item.type) ? <Suspense fallback={null}><Furniture config={modelConfigs[item.type]} /></Suspense> : <mesh castShadow receiveShadow><boxGeometry args={item.size} /><meshStandardMaterial color={item.color} /></mesh>}
            {pickedItemId === item.id && <SelectionArrows size={item.size} />}
          </group>
        ))}
        <group>
          <mesh position={[0, 1.25, -roomConfig.length / 2 - 0.1]}><boxGeometry args={[roomConfig.width + 0.4, 2.5, 0.2]} /><meshStandardMaterial color="#e2e8f0" opacity={0.8} transparent={mode==='2D'} /></mesh>
          <mesh position={[0, 1.25, roomConfig.length / 2 + 0.1]}><boxGeometry args={[roomConfig.width + 0.4, 2.5, 0.2]} /><meshStandardMaterial color="#e2e8f0" opacity={0.8} transparent={mode==='2D'} /></mesh>
          <mesh position={[-roomConfig.width / 2 - 0.1, 1.25, 0]}><boxGeometry args={[0.2, 2.5, roomConfig.length]} /><meshStandardMaterial color="#e2e8f0" opacity={0.8} transparent={mode==='2D'} /></mesh>
          <mesh position={[roomConfig.width / 2 + 0.1, 1.25, 0]}><boxGeometry args={[0.2, 2.5, roomConfig.length]} /><meshStandardMaterial color="#e2e8f0" opacity={0.8} transparent={mode==='2D'} /></mesh>
        </group>
      </group>
      <OrbitControls ref={controlsRef} enableRotate={mode === '3D'} rotateSpeed={0.3} maxPolarAngle={Math.PI / 2 - 0.1} />
    </>
  );
}

function SidebarItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group w-full px-2 active:scale-95 transition-all">
      <div className="p-2 w-12 h-12 bg-slate-50 rounded-2xl border border-transparent group-hover:border-green-200 shadow-sm transition-all overflow-hidden flex items-center justify-center">
        <img src={icon} alt={label} className="w-full h-full object-contain" />
      </div>
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{label}</span>
    </button>
  );
}

function CustomRoomModal({ config, setConfig, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 flex gap-10">
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-black mb-6">KÍCH THƯỚC CĂN PHÒNG</h2>
          <div><label className="text-[10px] font-black text-slate-400">RỘNG (m)</label><input type="number" value={config.width} onChange={(e) => setConfig({...config, width: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl outline-none border" /></div>
          <div><label className="text-[10px] font-black text-slate-400">DÀI (m)</label><input type="number" value={config.length} onChange={(e) => setConfig({...config, length: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl outline-none border" /></div>
          <button onClick={onConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">XÁC NHẬN</button>
          <button onClick={onClose} className="w-full py-2 text-slate-400 font-bold text-[10px]">QUAY LẠI</button>
        </div>
        <div className="w-64 h-64 bg-slate-100 rounded-[30px] flex items-center justify-center border-2 border-dashed border-slate-200">
          <div style={{ width: `${config.width * 10}px`, height: `${config.length * 10}px`, maxWidth: '80%', maxHeight: '80%' }} className="bg-[#00b259] rounded-lg shadow-lg flex items-center justify-center text-white text-[10px] font-black"> {config.width}m x {config.length}m </div>
        </div>
      </div>
    </div>
  );
}

// Preload models
Object.keys(CATEGORIES).forEach(cat => CATEGORIES[cat].forEach(item => useGLTF.preload(item.path)));

// ✅ XUẤT RA APP CHÍNH
export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}