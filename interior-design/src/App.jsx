import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'

// 1. PHẦN PHỤ TRỢ & HIỆU ỨNG (GIZMO)
const snapValue = (val, s = 0.5) => Math.round(val / s) * s;
const WALL_T = 0.2;

function SelectionArrows({ size }) {
  const [w, h, d] = size;
  const gap = 0.6; 
  return (
    <group position={[0, 0.2, 0]}>
      <Arrow pos={[w/2 + gap, 0, 0]} rot={[0, 0, Math.PI / 2]} />
      <Arrow pos={[-w/2 - gap, 0, 0]} rot={[0, 0, -Math.PI / 2]} />
      <Arrow pos={[0, 0, d/2 + gap]} rot={[Math.PI / 2, 0, 0]} />
      <Arrow pos={[0, 0, -d/2 - gap]} rot={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

function Arrow({ pos, rot }) {
  return (
    <mesh position={pos} rotation={rot}>
      <coneGeometry args={[0.15, 0.4, 32]} />
      <meshBasicMaterial color="#000000" /> 
    </mesh>
  );
}

// 2. PHẦN GIAO DIỆN (UI) - BẢNG LƯU/TẢI & NÚT BẤM
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
          <button onClick={onClose} className="hover:rotate-90 transition-transform font-bold">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {slots.map((slot, i) => (
            <div key={i} onClick={() => handleAction(i)} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-green-400 hover:bg-white cursor-pointer transition-all active:scale-[0.98]">
              <div>
                <div className="font-black text-slate-700 text-[10px]">SLOT {i+1}</div>
                <div className="text-[9px] text-slate-400 uppercase">{slot ? `${slot.date} • ${slot.count} món` : 'Slot trống'}</div>
              </div>
              {slot && type === 'SAVE' && <button onClick={(e) => { e.stopPropagation(); localStorage.removeItem(`phiSpace_Slot_${i+1}`); setSlots(prev => {const s=[...prev]; s[i]=null; return s;}); }} className="text-[9px] text-red-400 font-bold hover:text-red-600">XÓA</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. APP COMPONENT
function App() {
  const [mode, setMode] = useState('2D');
  const [items, setItems] = useState([]);
  const [pickedItemId, setPickedItemId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [modalType, setModalType] = useState(null);

  const getClampedPos = (x, z, size, rotation = 0) => {
    const rad = Math.abs(rotation);
    const width = Math.abs(size[0] * Math.cos(rad)) + Math.abs(size[2] * Math.sin(rad));
    const depth = Math.abs(size[0] * Math.sin(rad)) + Math.abs(size[2] * Math.cos(rad));
    return [
      snapValue(THREE.MathUtils.clamp(x, -5 + width/2, 5 - width/2)), 
      size[1]/2, 
      snapValue(THREE.MathUtils.clamp(z, -5 + depth/2, 5 - depth/2))
    ];
  };

  const addItem = (type, color, size) => {
    const id = Date.now();
    setItems([...items, { id, type, color, size, position: [0, size[1]/2, 0], rotation: 0 }]);
    setPickedItemId(id);
  };

  const updateItem = (id, data) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, ...data };
      updated.position = getClampedPos(updated.position[0], updated.position[2], updated.size, updated.rotation);
      return updated;
    }));
  };

  return (
    <div className="relative w-screen h-screen bg-[#f1f5f9] flex overflow-hidden font-sans select-none" 
         onClick={() => setContextMenu(null)} onContextMenu={e => e.preventDefault()}>
      
      {modalType && <SaveLoadModal type={modalType} onClose={() => setModalType(null)} items={items} onLoad={setItems} />}

      <div className="w-[100px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-4 z-20 shadow-xl overflow-y-auto">
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00b259] to-[#008a45] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">PS</div>
          <span className="text-[10px] font-black text-green-700 uppercase">PhiSpace</span>
        </div>
        <SidebarItem icon="🗄️" label="Tủ" onClick={() => addItem('Cabinet', '#10b981', [0.8, 1.8, 0.6])} />
        <SidebarItem icon="🛏️" label="Giường" onClick={() => addItem('Bed', '#3b82f6', [1.6, 0.6, 2.2])} />
        <SidebarItem icon="⌨️" label="Bàn" onClick={() => addItem('Table', '#f59e0b', [1.2, 0.7, 1.2])} />
        <SidebarItem icon="🛋️" label="Sofa" onClick={() => addItem('Sofa', '#f43f5e', [2, 0.8, 0.9])} />
        
        <div className="mt-auto flex flex-col gap-2 w-full px-2 pb-4 pt-4 border-t border-slate-100">
          <button onClick={() => setModalType('SAVE')} className="w-full py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all uppercase">LƯU</button>
          <button onClick={() => setModalType('LOAD')} className="w-full py-3 bg-slate-800 text-white text-[10px] font-black rounded-xl shadow-lg hover:bg-slate-900 transition-all uppercase">TẢI</button>
        </div>
      </div>

      <div className="flex-1 h-full relative">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex bg-white/90 backdrop-blur-md rounded-full shadow-2xl p-1.5 z-20 border border-white">
          <button onClick={() => setMode('2D')} className={`px-8 py-2 rounded-full text-[10px] font-black transition-all ${mode === '2D' ? 'bg-[#00b259] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>2D DESIGN</button>
          <button onClick={() => setMode('3D')} className={`px-8 py-2 rounded-full text-[10px] font-black transition-all ${mode === '3D' ? 'bg-[#00b259] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>3D VIEW</button>
        </div>

        <Canvas shadows gl={{ antialias: true }}>
          <SceneContent items={items} mode={mode} pickedItemId={pickedItemId} setPickedItemId={setPickedItemId} setContextMenu={setContextMenu} updateItem={updateItem} getClampedPos={getClampedPos} />
        </Canvas>

        {contextMenu && (
          <div className="absolute z-50 bg-white shadow-2xl rounded-2xl py-2 w-40 border border-slate-100 overflow-hidden" 
               style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button onClick={() => updateItem(contextMenu.itemId, { rotation: items.find(i=>i.id===contextMenu.itemId).rotation + Math.PI/4 })} className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">🔄 Xoay 45°</button>
            <div className="h-[1px] bg-slate-100 mx-2 my-1" />
            <button onClick={() => setItems(items.filter(i => i.id !== contextMenu.itemId))} className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3">🗑️ Xóa vật thể</button>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. KHÔNG GIAN ẢO & CAMERA (SCENECONTENT & ORBITCONTROLS)
function SceneContent({ items, mode, pickedItemId, setPickedItemId, setContextMenu, updateItem, getClampedPos }) {
  const controlsRef = useRef();

  useFrame(() => {
    if (controlsRef.current) {
      const limit = 5.5;
      controlsRef.current.target.x = THREE.MathUtils.clamp(controlsRef.current.target.x, -limit, limit);
      controlsRef.current.target.z = THREE.MathUtils.clamp(controlsRef.current.target.z, -limit, limit);
      controlsRef.current.update(); 
    }
  });

  return (
    <>
      {mode === '2D' ? <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={60} /> : <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />}
      <color attach="background" args={['#f1f5f9']} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 15, 10]} castShadow intensity={2} />

      <group onPointerMove={(e) => pickedItemId && mode === '2D' && updateItem(pickedItemId, { position: getClampedPos(e.point.x, e.point.z, items.find(it => it.id === pickedItemId).size, items.find(it => it.id === pickedItemId).rotation) })}>
        
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow onClick={() => setPickedItemId(null)}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} sectionColor="#cbd5e1" cellColor="#e2e8f0" fadeDistance={150} />
        
        {items.map(item => (
          <mesh key={item.id} position={item.position} rotation-y={item.rotation} castShadow
                onClick={(e) => { e.stopPropagation(); if(mode === '2D') setPickedItemId(item.id === pickedItemId ? null : item.id); }}
                onPointerDown={(e) => { if (e.button === 2 && mode === '2D') { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id }); }}}>
            <boxGeometry args={item.size} />
            <meshStandardMaterial color={item.color} />
            
            {pickedItemId === item.id && (
              <SelectionArrows size={item.size} />
            )}
          </mesh>
        ))}
        
        <group>
          <mesh position={[0, 1.25, -5 - WALL_T/2]}><boxGeometry args={[10 + WALL_T*2, 2.5, WALL_T]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
          <mesh position={[0, 1.25, 5 + WALL_T/2]}><boxGeometry args={[10 + WALL_T*2, 2.5, WALL_T]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
          <mesh position={[-5 - WALL_T/2, 1.25, 0]}><boxGeometry args={[WALL_T, 2.5, 10]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
          <mesh position={[5 + WALL_T/2, 1.25, 0]}><boxGeometry args={[WALL_T, 2.5, 10]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
        </group>
      </group>

      <OrbitControls 
        ref={controlsRef} 
        enableRotate={mode === '3D'} 
        enablePan={true} 
        rotateSpeed={0.3} 
        mouseButtons={{ LEFT: mode === '3D' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        minZoom={45} maxZoom={160} minDistance={5} maxDistance={30} 
        minPolarAngle={mode === '2D' ? 0 : 0} 
        maxPolarAngle={mode === '2D' ? 0 : Math.PI / 2 - 0.1}
        minAzimuthAngle={mode === '2D' ? 0 : -Infinity}
        maxAzimuthAngle={mode === '2D' ? 0 : Infinity}
      />
    </>
  );
}

// (Thuộc Phần 2: UI) Component làm khuôn để tạo các nút bấm chức năng ở Sidebar
function SidebarItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group w-full px-2 active:scale-95 transition-transform">
      <div className="p-3 bg-slate-50 group-hover:bg-green-100 rounded-2xl transition-all text-2xl shadow-sm border border-transparent group-hover:border-green-200">{icon}</div>
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

export default App;