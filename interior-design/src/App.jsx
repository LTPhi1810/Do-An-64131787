import React, { useState, useRef, useEffect, Suspense, createContext, useContext } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera, useGLTF, Clone, Center } from '@react-three/drei'

// =====================================================================
// 1. CẤU HÌNH & THÔNG SỐ 
// =====================================================================
const MODEL_CONFIGS = {
  'Chair': { path: '/models/chair.glb', scale: 0.8, offset: [0, 0, 0] },
  'Bed':   { path: '/models/bed.glb',   scale: 0.008, offset: [0, 0, 0] }, 
  'Table': { path: '/models/table.glb', scale: 1.0, offset: [0, 0, 0] },
  'Sofa':  { path: '/models/sofa.glb',  scale: 0.5, offset: [0, 0, 0] }, 
};

const MODELS_3D_LIST = Object.keys(MODEL_CONFIGS);
const snapValue = (val, s = 0.05) => Math.round(val / s) * s;
const ROOM_LIMIT = 5.0; 

const SceneContext = createContext();

// =====================================================================
// 2. COMPONENTS PHỤ (FURNITURE, GIZMO)
// =====================================================================

function Furniture({ type }) {
  const config = MODEL_CONFIGS[type] || MODEL_CONFIGS['Chair'];
  const gltf = useGLTF(config.path); 
  return (
    <group scale={config.scale} position={config.offset}>
      <Center top><Clone object={gltf.scene} castShadow receiveShadow /></Center>
    </group>
  );
}

function SelectionArrows({ size }) {
  const [w, h, d] = size;
  // ĐẨY GAP RA XA HƠN ĐỂ KHÔNG BỊ GIƯỜNG NUỐT MẤT 2 ĐẦU
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

function SaveLoadModal({ type, onClose, items, onLoad }) {
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    const loaded = [];
    for (let i = 1; i <= 5; i++) {
      const data = localStorage.getItem(`phiSpace_Slot_${i}`);
      loaded.push(data ? JSON.parse(data) : null);
    }
    setSlots(loaded);
  }, [type]);

  const handleAction = (index) => {
    const key = `phiSpace_Slot_${index + 1}`;
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
    <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
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

// =====================================================================
// 3. BỘ NÃO TỔNG CHỈ HUY (APP COMPONENT)
// =====================================================================
function App() {
  const [mode, setMode] = useState('2D');
  const [items, setItems] = useState([]);
  const [pickedItemId, setPickedItemId] = useState(null);
  const [modalType, setModalType] = useState(null);

  const addItem = (type, color, size) => {
    const id = Date.now();
    const posY = MODELS_3D_LIST.includes(type) ? 0 : size[1] / 2;
    setItems([...items, { id, type, color, size, position: [0, posY, 0], rotation: 0 }]);
    setPickedItemId(id);
  };

  const updateItem = (id, data) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...data } : it));
  };

  return (
    <div className="relative w-screen h-screen bg-[#f1f5f9] flex overflow-hidden font-sans select-none" 
         onContextMenu={e => e.preventDefault()}>
      
      {modalType && <SaveLoadModal type={modalType} onClose={() => setModalType(null)} items={items} onLoad={setItems} />}

      <div className="w-[110px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-8 z-20 shadow-2xl">
        <div className="w-14 h-14 bg-[#00b259] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg mb-10">PS</div>
        
        <div className="flex flex-col gap-6 w-full px-3">
          <SidebarItem icon="/icons/chair.png" label="Ghế" onClick={() => addItem('Chair', '#10b981', [0.8, 1.2, 0.8])} />
          
          {/* TĂNG CHIỀU DÀI HITBOX LÊN 3.4 ĐỂ CHẶN TƯỜNG SỚM HƠN (CHỐNG GLITCH) VÀ BAO TRỌN GIƯỜNG */}
          <SidebarItem icon="/icons/bed.png" label="Giường" onClick={() => addItem('Bed', '#3b82f6', [1.8, 0.6, 3.4])} />
          
          <SidebarItem icon="/icons/table.png" label="Bàn" onClick={() => addItem('Table', '#f59e0b', [2.2, 0.7, 1.3])} />
          <SidebarItem icon="/icons/sofa.png" label="Sofa" onClick={() => addItem('Sofa', '#f43f5e', [0.8, 0.8, 0.8])} />
        </div>
        
        <div className="mt-auto w-full px-3 flex flex-col gap-2">
          <button onClick={() => setModalType('SAVE')} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold">LƯU</button>
          <button onClick={() => setModalType('LOAD')} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold">TẢI</button>
        </div>
      </div>

      <div className="flex-1 h-full relative">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-1 z-20 border border-white/50">
          <button onClick={() => setMode('2D')} className={`px-10 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === '2D' ? 'bg-[#00b259] text-white shadow-lg' : 'text-slate-400'}`}>2D DESIGN</button>
          <button onClick={() => setMode('3D')} className={`px-10 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === '3D' ? 'bg-[#00b259] text-white shadow-lg' : 'text-slate-400'}`}>3D VIEW</button>
        </div>

        <div className="absolute bottom-8 right-8 bg-slate-900/80 backdrop-blur-md text-white p-4 rounded-[24px] z-50 text-[10px] font-bold shadow-2xl flex flex-col gap-2 border border-white/10 pointer-events-none">
          <div className="flex items-center gap-3"><span className="bg-green-400/20 px-1.5 py-0.5 rounded text-[8px] text-green-400">R</span> XOAY VẬT THỂ</div>
          <div className="flex items-center gap-3"><span className="bg-red-400/20 px-1.5 py-0.5 rounded text-[8px] text-red-400">Backspace</span> XÓA VẬT THỂ</div>
        </div>

        <SceneContext.Provider value={{ updateItem, pickedItemId, setPickedItemId, mode, items, setItems }}>
          <Canvas shadows gl={{ antialias: true }}>
            <Suspense fallback={null}> 
              <SceneContent />
            </Suspense>
          </Canvas>
        </SceneContext.Provider>
      </div>
    </div>
  );
}

// KHÔNG GIAN ẢO (SCENECONTENT)
function SceneContent() {
  const controlsRef = useRef();
  const { mode, items, pickedItemId, setPickedItemId, updateItem, setItems } = useContext(SceneContext);
  const { scene } = useThree();

  const getClampedPos = (x, z, size, rotation = 0) => {
    const rad = Math.abs(rotation);
    const rotatedWidth = Math.abs(size[0] * Math.cos(rad)) + Math.abs(size[2] * Math.sin(rad));
    const rotatedDepth = Math.abs(size[0] * Math.sin(rad)) + Math.abs(size[2] * Math.cos(rad));
    
    const limitX = ROOM_LIMIT - (rotatedWidth / 2) - 0.01;
    const limitZ = ROOM_LIMIT - (rotatedDepth / 2) - 0.01;

    return [THREE.MathUtils.clamp(x, -limitX, limitX), 0, THREE.MathUtils.clamp(z, -limitZ, limitZ)];
  };

  const checkCollision = (itemId, newPos, itemSize, itemRot, allItems) => {
    const rad1 = Math.abs(itemRot);
    const w1 = Math.abs(itemSize[0] * Math.cos(rad1)) + Math.abs(itemSize[2] * Math.sin(rad1));
    const d1 = Math.abs(itemSize[0] * Math.sin(rad1)) + Math.abs(itemSize[2] * Math.cos(rad1));
    const r1 = { minX: newPos[0]-w1/2, maxX: newPos[0]+w1/2, minZ: newPos[2]-d1/2, maxZ: newPos[2]+d1/2 };

    for (let other of allItems) {
      if (other.id === itemId) continue;
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
    
    const updated = { ...item, ...data };
    const clampedPos = getClampedPos(updated.position[0], updated.position[2], updated.size, updated.rotation);
    
    if (data.position && checkCollision(id, clampedPos, updated.size, updated.rotation, items)) {
        return; 
    }
    
    updateItem(id, { ...updated, position: clampedPos });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode === '2D' && pickedItemId) {
        if (e.key.toLowerCase() === 'r') {
          const it = items.find(i => i.id === pickedItemId);
          if (it) performUpdate(pickedItemId, { rotation: it.rotation + Math.PI / 2 });
        }
        if (e.key === 'Backspace') {
          setItems(prev => prev.filter(it => it.id !== pickedItemId));
          setPickedItemId(null);
        }
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

      <group onPointerMove={(e) => {
        if (pickedItemId && mode === '2D') {
          performUpdate(pickedItemId, { position: [e.point.x, 0, e.point.z] });
        }
      }}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow onClick={() => setPickedItemId(null)}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} sectionColor="#cbd5e1" cellColor="#e2e8f0" fadeDistance={150} />
        
        {items.map(item => (
          <group key={item.id} position={item.position} rotation-y={item.rotation}
                 onClick={(e) => { e.stopPropagation(); if(mode === '2D') setPickedItemId(item.id === pickedItemId ? null : item.id); }}>
            
            {MODELS_3D_LIST.includes(item.type) ? (
              <Suspense fallback={null}>
                <Furniture type={item.type} />
              </Suspense>
            ) : (
              <mesh castShadow receiveShadow><boxGeometry args={item.size} /><meshStandardMaterial color={item.color} /></mesh>
            )}
            
            {pickedItemId === item.id && <SelectionArrows size={item.size} />}
          </group>
        ))}
        
        <group>
          <mesh position={[0, 1.25, -5.1]}><boxGeometry args={[10.4, 2.5, 0.2]} /><meshStandardMaterial color="#1e293b" opacity={0.8} transparent={mode==='2D'} /></mesh>
          <mesh position={[0, 1.25, 5.1]}><boxGeometry args={[10.4, 2.5, 0.2]} /><meshStandardMaterial color="#1e293b" opacity={0.8} transparent={mode==='2D'} /></mesh>
          <mesh position={[-5.1, 1.25, 0]}><boxGeometry args={[0.2, 2.5, 10]} /><meshStandardMaterial color="#1e293b" opacity={0.8} transparent={mode==='2D'} /></mesh>
          <mesh position={[5.1, 1.25, 0]}><boxGeometry args={[0.2, 2.5, 10]} /><meshStandardMaterial color="#1e293b" opacity={0.8} transparent={mode==='2D'} /></mesh>
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

MODELS_3D_LIST.forEach(type => useGLTF.preload(MODEL_CONFIGS[type].path));

export default App;