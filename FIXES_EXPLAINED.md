# TỔNG HỢP TOÀN BỘ FIXES VÀ GIẢI THÍCH

## OBJECTIVE
Giúp bạn **liên kết Categories/Items vào MongoDB** và **Save/Load Project của mỗi User vào Database** thay vì chỉ trong localStorage.

---

##  ROOT CAUSE ANALYSIS

### Problem #1: SaveLoadModal gọi API nhưng không lưu vào MongoDB
```
Timeline:
1. Frontend call: POST /api/designs/save with { slotIndex, items, roomConfig }
2. Server receive request 
3. server/routes/designRoutes.js try to save
4. Design.save() → Error!
5. MongoDB: collection designs still empty 

WHY?
→ Design.js model có:
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' }
  
→ Nhưng User model export là:
  module.exports = mongoose.model('User', UserSchema);
  
→ Tên không match! Mongoose không thể find user reference
→ Save fail silently (hoặc throw error)

FIX:
Change ref từ 'users' → 'User'
Design.js:
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
```

### Problem #2: Categories hardcode 100%, không động
```
Current:
const CATEGORIES = {
  'Chair': [{ name, path: '/models/chair.glb', ... }],
  'Bed': [...],
  ...
};

Problem:
- Categories fixed khi deploy
- Admin thêm model mới từ AdminDashboard
- Nhưng khi save vào Furniture collection, frontend không thấy

Solution:
- Tạo endpoint GET /api/designs/categories
- Fetch từ Furniture collection
- Merge với hardcode CATEGORIES (fallback)

Result:
- Admin thêm model → DB update
- User load app → Tự động fetch categories từ DB
- Có hardcode backup nếu DB trống
```

---

##  DETAILED CHANGES

### 1️⃣ `server/models/Design.js`
```javascript
// BEFORE:
const DesignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  slotIndex: { type: Number, required: true },
  items: { type: Array, default: [] },
  roomConfig: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

// AFTER:
const DesignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotIndex: { type: Number, required: true },
  items: { type: Array, default: [] },
  roomConfig: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

WHY?
- Mongoose uses model name to resolve reference
- User model: module.exports = mongoose.model('User', UserSchema)
- Must use ref: 'User' (capital U) to match export name
```

### 2️⃣ `server/routes/designRoutes.js` - Thêm logging & endpoint
```javascript
// ADD NEW ENDPOINT: GET /api/designs/categories
router.get('/categories', async (req, res) => {
  try {
    console.log(' API /categories called');  // DEBUG
    const furnitures = await Furniture.find();
    
    const categoriesGrouped = {};
    furnitures.forEach(f => {
      if (!categoriesGrouped[f.category]) categoriesGrouped[f.category] = [];
      categoriesGrouped[f.category].push({
        name: f.name,
        path: f.path,  // Base64 encoded GLB
        icon: f.icon,   // Base64 encoded PNG
        size: f.size,
        scale: f.scale,
        offset: f.offset
      });
    });

    console.log('Loaded furniture categories:', Object.keys(categoriesGrouped));
    res.json(categoriesGrouped);
  } catch (err) {
    console.error('Error loading categories:', err);
    res.status(500).json({ msg: 'Lỗi server: ' + err.message });
  }
});

WHY?
- Frontend cần tải categories từ Database
- Endpoint này query Furniture collection
- Return grouped by category (Same format as hardcode CATEGORIES)
```

```javascript
// IMPROVE SAVE ENDPOINT: Thêm logging chi tiết
router.post('/save', auth, async (req, res) => {
  console.log(' API /save called');  // ← Debug line
  console.log('User ID:', req.user.id);  // ← Check auth
  console.log('Slot:', req.body.slotIndex);  // ← Check data
  
  try {
    const { slotIndex, items, roomConfig } = req.body;
    let design = await Design.findOne({ user: req.user.id, slotIndex });
    console.log('Existing design:', design ? 'Found' : 'Not found');  // ← Check DB query
    
    if (design) {
      design.items = items;
      design.roomConfig = roomConfig;
      design.updatedAt = Date.now();
    } else {
      design = new Design({ user: req.user.id, slotIndex, items, roomConfig });
    }
    
    const saved = await design.save();
    console.log('Design saved:', saved._id);  // ← Verify save success
    res.json({ msg: `Đã lưu vào File ${slotIndex + 1}!` });
  } catch (err) {
    console.error('Error saving design:', err);  // ← Catch errors
    res.status(500).json({ msg: 'Lỗi save: ' + err.message });  // ← Return error to frontend
  }
});

WHY?
- Trước không có logging → khó debug khi lỗi
- Giờ có console.log ở mỗi bước
- Dễ phát hiện lỗi ở: auth, data validation, DB query, save
```

### 3️⃣ `interior-design/src/App.jsx` - Fetch categories từ API
```javascript
// BEFORE:
const [siteSettings, setSiteSettings] = useState({
  bannerText: "Thiết kế không gian sống",
  slides: [],
  models: CATEGORIES,  // ← Hardcode 100%
  categoryIcons: {}
});

useEffect(() => {
  const loadSettings = async () => {
    try {
      // Gọi /api/designs/settings - endpoint này trả về format khác
      // Không hiệu quả
    }
  };
  loadSettings();
}, []);

// AFTER:
const [loadingCategories, setLoadingCategories] = useState(true);

const [siteSettings, setSiteSettings] = useState({
  bannerText: "Thiết kế không gian sống",
  slides: [],
  models: CATEGORIES,  // ← Fallback mặc định
  categoryIcons: {}
});

useEffect(() => {
  const loadCategories = async () => {
    try {
      console.log('Fetching categories from API...');
      const res = await fetch('http://localhost:5000/api/designs/categories');
      if (res.ok) {
        const dbCategories = await res.json();
        console.log('Loaded categories from database:', Object.keys(dbCategories));
        
        // Merge với hardcode
        const mergedModels = JSON.parse(JSON.stringify(CATEGORIES));  // Copy
        Object.keys(dbCategories).forEach(cat => {
          if (!mergedModels[cat]) mergedModels[cat] = [];
          // Combine: hardcode + DB
          mergedModels[cat] = [...mergedModels[cat], ...dbCategories[cat]];
        });
        
        setSiteSettings(prev => ({ ...prev, models: mergedModels }));
      } else {
        console.log('Failed to load categories, using hardcoded defaults');
        setSiteSettings(prev => ({ ...prev, models: CATEGORIES }));
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setSiteSettings(prev => ({ ...prev, models: CATEGORIES }));
    } finally {
      setLoadingCategories(false);
    }
  };
  loadCategories();
}, []);

WHY?
- Fetch từ endpoint `/api/designs/categories` (new)
- Merge DB categories với hardcode CATEGORIES
- Nếu lỗi → Fallback vẫn dùng hardcode
- App vẫn hoạt động even if DB lỗi (resilience)
```

---

## DATA FLOW AFTER FIXES

### Flow 1: SAVE DESIGN
```
User click "Lưu"
  ↓
SaveLoadModal.handleSlotAction(slotIndex=0)
  ↓
fetch('http://localhost:5000/api/designs/save', {
  headers: { 'x-auth-token': token },  ← JWT token
  body: { slotIndex, items[], roomConfig }
})
  ↓
Server: auth middleware → Verify token → req.user.id = decoded.id
  ↓
Server: designRoutes.js:
  1. Design.findOne({ user: req.user.id, slotIndex })  ← Query by user + slot
  2. Update or Create new
  3. design.save()  ←  FIX: ref: 'User' now works!
  ↓
MongoDB: phispace.designs insert/update document
  { _id, user: ObjectId('...'), slotIndex: 0, items[], roomConfig, updatedAt }
  ↓
Response: { msg: "Đã lưu vào File 1!" }
  ↓
Frontend: Update state, close modal, show success
```

### Flow 2: LOAD DESIGN
```
User click "Tải"
  ↓
SaveLoadModal.useEffect → fetch('http://localhost:5000/api/designs/load', {
  headers: { 'x-auth-token': token }
})
  ↓
Server: auth middleware → req.user.id
  ↓
Server: Design.find({ user: req.user.id }).sort({ slotIndex: 1 })
  ↓
MongoDB: Query all designs for this user (up to 5 files)
  [{ slotIndex: 0, items[], ... }, { slotIndex: 1, items[], ... }]
  ↓
Response: [designs array]
  ↓
Frontend: 
  1. Map to slots array (5 position, 0-4)
  2. User select slot[index]
  3. onLoad({ items, roomConfig })
  4. setItems(items)
  5. setRoomConfig(roomConfig)
  ↓
3D View render items with loaded positions
```

### Flow 3: CATEGORIES FROM DB
```
App mount
  ↓
useEffect: loadCategories()
  ↓
fetch('http://localhost:5000/api/designs/categories')
  ↓
Server: Furniture.find()
  ↓
MongoDB: phispace.furnitures collection
  [
    { category: 'Chair', name: 'Chair Nordic', path, icon, size, scale },
    { category: 'Chair', name: 'Chair Modern', ... },
    { category: 'Bed', name: 'Bed King', ... }
  ]
  ↓
Server: Group by category
  {
    'Chair': [{ name, path, icon, ... }, { name, path, ... }],
    'Bed': [{ name, path, ... }]
  }
  ↓
Response: categoriesGrouped
  ↓
Frontend: 
  1. Merge với CATEGORIES hardcode
  2. setSiteSettings({ models: merged })
  ↓
CategoryModal show tất cả items (hardcode + DB)
```

---

## HOW TO VERIFY

### Terminal 1: Server logs
```
npm run dev ở folder server
→ Xem log: API /categories called
→ Xem log: API /save called, User ID: ...
→ Xem log: Design saved: ObjectId(...)
```

### Terminal 2: MongoDB (Compass UI)
```
localhost:27017 → phispace → designs
→ Xem có document với user, slotIndex, items[], roomConfig
→ Click vào items[] → Xem structure: id, type, color, size[], position[], rotation
```

### Browser: DevTools Console
```
F12 → Console tab → Clear → Reload page
→ Xem log: "Fetching categories from API..."
→ Xem log: "Loaded categories from database: ..."
→ Không có error `Uncaught (in promise) Error: ...`
```

---

## BENEFITS OF THIS APPROACH

| Aspect | Before | After |
|--------|--------|-------|
| **Data Persistence** | localStorage only (device-local) | MongoDB (cloud) |
| **Categories** | Hardcode only | Hardcode + Dynamic from DB |
| **Multi-device** | Save on device A, load on device B | Works anywhere |
| **Admin Control** | No way to add new models | Admin add → All users see immediately |
| **Scalability** | Fixed categories | Unlimited categories in DB |
| **Debugging** | No logs, hard to trace | Detailed console logs |

---

## NEXT STEPS (Optional)

1. **Thêm Delete Design**: DELETE /api/designs/:slotIndex
2. **Thêm Rename Design**: PUT /api/designs/:slotIndex (update name)
3. **Thêm Export PDF**: Lưu design dưới dạng PDF
4. **Thêm Share**: Generate shareable link để chia sẻ design
5. **Optimize Model Upload**: Dùng GridFS thay vì base64 (cho file lớn)

---

## SUPPORT

Nếu gặp vấn đề:
1. Check TEST_GUIDE.md (Troubleshooting section)
2. Check server logs (terminal server)
3. Check browser console (F12 → Console)
4. Check MongoDB (Compass UI) để verify data exists
