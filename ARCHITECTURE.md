# PhiSpace - Kiến trúc hệ thống lưu trữ dữ liệu

## 1. CẤUTRÚC DATABASE (MongoDB)

### Database: `phispace`

```
phispace/
  ├── users (Lưu thông tin tài khoản)
  │   └── { username, email, password, googleId, resetToken, resetTokenExpiry, createdAt }
  │
  ├── designs (Lưu từng thiết kế/dự án của user)
  │   └── { user (ref: User._id), slotIndex (0-4), items[], roomConfig, updatedAt }
  │
  ├── furnitures (Lưu các model 3D, category/item)
  │   └── { category, name, path (base64), icon, size[], scale, offset, createdAt }
  │
  └── settings (Cấu hình banner/slides của trang chủ)
      └── { bannerText, slides[], categoryIcons{} }
```

## 2. BACKEND API ENDPOINTS

### Base URL: `http://localhost:5000/api/designs`

####  **Lấy Categories/Items từ Database**
```
GET /categories
Headers: (public, không cần auth)
Response: {
  "Chair": [
    { name, path (base64), icon, size, scale, offset },
    ...
  ],
  "Bed": [...],
  ...
}
```

####  **Lưu Thiết kế (Project)**
```
POST /save
Headers: {
  'x-auth-token': 'jwt_token',
  'Content-Type': 'application/json'
}
Body: {
  "slotIndex": 0-4,  // Khe lưu (0=File1, 1=File2, ...)
  "items": [{
    id, type, color, size, position, rotation
  }],
  "roomConfig": { width, length }
}
Response: { msg: "Đã lưu vào File 1!" }
```

####  **Tải toàn bộ thiết kế của User**
```
GET /load
Headers: { 'x-auth-token': 'jwt_token' }
Response: [
  {
    _id, user, slotIndex, items[], roomConfig, updatedAt
  },
  ...
]
```

####  **Lưu Model 3D (Admin)**
```
POST /furniture
Headers: { 'x-auth-token': 'jwt_token' }
Body: {
  "category": "Chair",
  "name": "Chair Nordic",
  "path": "base64_encoded_glb_file",  // ️ Max 16MB
  "icon": "data:image/png;base64,...",
  "size": [1, 1, 1],
  "scale": 1.0,
  "offset": [0, 0, 0]
}
Response: { msg: "Đã lưu Model 3D!" }
```

#### ️ **Cấu hình Settings**
```
POST /settings
Headers: { 'x-auth-token': 'jwt_token' }
Body: {
  "bannerText": "Thiết kế không gian sống",
  "slides": [],
  "categoryIcons": { "Chair": "/icons/chair.png", ... }
}
```

#### ️ **Xóa toàn bộ Category**
```
DELETE /furniture/category/{categoryName}
Headers: { 'x-auth-token': 'jwt_token' }
Response: { msg: "Đã xóa category khỏi Database" }
```

## 3. FRONTEND LUỒNG DỮ LIỆU

### App.jsx -> SaveLoadModal

```
[App.jsx]
   ↓
[useEffect: loadCategories]
   ↓ (GET /api/designs/categories)
[MongoDB: Furnitures collection]
   ↓
[setSiteSettings({ models: mergedModels })]
   ↓
[Render CategoryModal with DB items + hardcode defaults]
```

### Save Project Flow

```
User click "Lưu" button
   ↓
[SaveLoadModal.handleSlotAction(slotIndex)]
   ↓
POST /api/designs/save (slotIndex, items, roomConfig)
   ↓
[Auth middleware validates token]
   ↓
[server/routes/designRoutes.js]
   ↓ (Design.findOne + save)
[MongoDB: designs collection]
   ↓
Response: { msg: "Đã lưu vào File N!" }
   ↓
[Frontend: Update slots state + Close modal]
```

### Load Project Flow

```
User click "Tải" button
   ↓
[SaveLoadModal.useEffect: fetchSlots]
   ↓
GET /api/designs/load
   ↓
[Auth middleware validates token]
   ↓
[server/routes/designRoutes.js]
   ↓ (Design.find({ user: req.user.id }))
[MongoDB: designs collection]
   ↓
Response: [{ slotIndex, items, roomConfig, updatedAt }, ...]
   ↓
[Frontend: setSlots with 5 slots (index 0-4)]
   ↓
User select slot → onLoad(slotData) → setItems(items) + setRoomConfig(roomConfig)
```

## 4. KEY FIXES ĐƯỢC THỰC HIỆN

###  Design.js Model
**Lỗi:** `ref: 'users'` (model name không đúng)
**Sửa:** `ref: 'User'` (phải match với export name của User model)

###  designRoutes.js
**Thêm:**
- Logging chi tiết (console.log) để debug
- Error handling với res.status(500).json({ msg: ... })
- Endpoint GET `/categories` để tải categories từ Furniture collection

###  App.jsx
**Thay đổi:**
- useEffect mới: `loadCategories()` gọi `/api/designs/categories`
- Gộp dữ liệu từ DB với hardcode CATEGORIES làm fallback
- Fetch thay vì hardcode 100% (bảo đảm tính dynamic)

## 5. CÁCH TEST

### 1️⃣ Test Save Design
```
1. Mở localhost:5173 → Đăng nhập
2. Vào Editor → Thêm 2-3 items
3. Nhấn "Lưu" → Chọn File 1 → Lưu
4. Mở MongoDB Compass
5. phispace.designs → Xem document mới có user, slotIndex=0, items[]
```

### 2️⃣ Test Load Design
```
1. Sau khi save, làm mới page (F5)
2. Vào Editor → Nhấn "Tải"
3. Xem File 1 có data, click load
4. Kiểm tra items đã được load lại đúng không
```

### 3️⃣ Test Categories từ DB
```
1. Trong AdminDashboard → Tạo Model 3D mới
2. Check phispace.furnitures → Document mới được tạo
3. Mở Editor → Xem category modal
4. Nếu categories load from DB → PASS 
```

## 6. LƯU Ý QUAN TRỌNG

️ **JWT Token:**
- Token có hạn 1 hour
- Nếu lưu/tải bị lỗi 401 → Cần đăng nhập lại

️ **MongoDB Path (3D Models):**
- `.glb` files được mã hóa base64 trong `path` field
- MongoDB có giới hạn 16MB/document
- Để up file lớn, cần dùng GridFS (advanced setup)

️ **Slot Index:**
- Mỗi user có tối đa 5 file (slotIndex: 0-4)
- Nếu gửi slotIndex > 4 sẽ fail

## 7. TUYẾN ĐỶC BIỆT

### Khởi tạo app lần đầu
1. User register → Tạo record trong `users` collection
2. Vào editor → Fetch categories từ `/api/designs/categories`
3. Categories rỗng (chưa admin add) → Sử dụng hardcode CATEGORIES
4. Khi save design lần đầu → Tạo record trong `designs` collection với slotIndex=0

### Admin thêm Model 3D
1. Vào AdminDashboard
2. Upload model + icon → POST `/api/designs/furniture`
3. Document được tạo trong `furnitures` collection
4. Tất cả user khi load categories sẽ thấy item mới này
