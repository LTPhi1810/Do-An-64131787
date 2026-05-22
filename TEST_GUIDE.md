# 🧪 HƯỚNG DẪN TEST TOÀN BỘ HỆ THỐNG

##  CHUẨN BỊ

###  Điều kiện cần:
- [x] MongoDB chạy tại `localhost:27017`
- [x] Server chạy tại `localhost:5000`
- [x] Frontend chạy tại `localhost:5173`
- [x] Browser DevTools mở (F12)

###  Các file đã sửa:
- `server/models/Design.js` ← ref: 'User' (sửa từ 'users')
- `server/routes/designRoutes.js` ← Thêm logging + GET /categories
- `interior-design/src/App.jsx` ← loadCategories() useEffect mới

---

## 🧪 TEST 1: SAVE DESIGN VÀO DATABASE

### Bước 1: Đăng nhập
```
1. Mở http://localhost:5173
2. Đăng nhập với tài khoản (hoặc register mới)
3. Kiểm tra localStorage:
   - F12 → Application → localStorage
   - Xem có 'token' và 'phiUser' không? 
```

### Bước 2: Vào Editor
```
1. Click nút "TẠO THIẾT KẾ" (BASIC hoặc CUSTOM)
2. Editor page load → Console check:
   - " Fetching categories from API..." 
   - Nếu không, thì categories fetch lỗi
```

### Bước 3: Thêm Items vào Phòng
```
1. Click category "Chair" từ sidebar
2. Chọn "Chair Standard"
3. Repeat với Bed, Table (thêm 3 items)
4. Xem 3D view có items không
```

### Bước 4: SAVE
```
1. Nhấn nút "Lưu" (cái giữa ở dưới cùng left sidebar)
2. Modal SaveLoadModal hiện lên
3. Status ban đầu: "Đang kết nối Database..."
   → Sau 1s: "Sẵn sàng."
4. Click vào "File 1"
5. Modal close → Status: "Đã lưu File 1 thành công!"
```

### Bước 5: VERIFY MONGODB
```
1. MongoDB Compass → localhost:27017 → phispace → designs
2. Xem có 1 document mới không?
3. Document có field:
    _id (ObjectId tự động)
    user (ObjectId của user)
    slotIndex: 0
    items: [{ id, type, color, size, position, rotation }, ...]
    roomConfig: { width: 10, length: 10 }
    updatedAt: (timestamp)

 PASS: Có design document trong MongoDB 
```

---

## 🧪 TEST 2: LOAD DESIGN TỪ DATABASE

### Bước 1: Xóa items trong editor
```
1. Delete tất cả items (hoặc reload page)
2. Editor bây giờ rỗng (0 items)
```

### Bước 2: LOAD
```
1. Nhấn nút "Tải" (cái kế bên phải)
2. Modal SaveLoadModal hiện lên
3. "File 1" hiện với:
   - Ngày lưu (Cập nhật: 2026-05-08...)
   - Số items: "3 Items"
4. Click vào "File 1" → onLoad trigger
```

### Bước 3: VERIFY
```
1. Modal close
2. 3D View có 3 items được load lại không? 
3. Console check: Không có error liên quan JWT
4. Items còn giữ đúng position/rotation/type không?

 PASS: Designs load từ MongoDB đúng 
```

---

## 🧪 TEST 3: CATEGORIES TỪ DATABASE

### Bước 1: Kiểm tra Categories Load
```
1. Mở Console (F12 → Console tab)
2. Tìm log: " Fetching categories from API..."
3. Tiếp theo:
   -  " Loaded categories from database: [......]"
     → Tức là fetch thành công từ `/api/designs/categories`
   -  "️ Failed to load categories, using hardcoded defaults"
     → Tức là API lỗi, sử dụng hardcode

### Backend check:
1. Terminal server → Tìm log: " API /categories called"
2. Sau đó: " Loaded furniture categories: [...]"
```

### Bước 2: Thêm Category từ Admin
```
1. Nếu là admin (username === 'admin'), click "ADMIN" ở top-right
2. AdminDashboard → Scroll down → "QUẢN LÝ MÔ HÌNH 3D"
3. Upload model mới (nếu có)
4. Server log: " ĐANG NHẬN DỮ LIỆU TỪ ADMIN: [item name]"
5. MongoDB: phispace → furnitures → Xem document mới

### Bước 3: Verify Gộp Categories
```
1. Quay lại Editor
2. Reload page (F5)
3. Console check:
   - Hardcode categories (Chair, Bed, Table, Sofa, Laptop, Painting)
   - DB categories (nếu admin thêm)
   - Merged: Cộng 2 cái này lại
4. CategoryModal hiện đủ items (hardcode + DB)

 PASS: Categories gộp đúng từ hardcode + DB 
```

---

##  TROUBLESHOOTING

###  Problem: MongoDB designs collection trống (0 documents)
```
Kiểm tra:
1. Console error: "Lỗi token" → JWT token hết hạn
   → FIX: Logout + Login lại
   
2. Console error: "Lỗi kết nối" → Backend không chạy
   → FIX: npm run dev trong server folder
   
3. Server log không hiện "API /save called"
   → FIX: Modal không gọi API, check network tab (F12 → Network)
```

###  Problem: Categories không load
```
Kiểm tra:
1. Console: " Error loading categories"
   → Check server log: " Error loading categories: ..."
   
2. Server không có log " API /categories called"
   → Endpoint không tồn tại hoặc sai URL
   → FIX: Kiểm tra designRoutes.js có route này không
   
3. Furnitures collection trống (0 documents)
   → Bình thường, chưa có admin thêm model 3D
   → Sử dụng hardcode categories
```

###  Problem: Token lỗi khi Load/Save
```
Kiểm tra:
1. localStorage.getItem('token') có được set không?
   → F12 → Application → localStorage → phiSearch → token
   
2. Token có hợp lệ không?
   → Hết hạn (1 hour) → Cần logout + login lại
   
3. Server auth middleware có nhận được header 'x-auth-token' không?
   → Server log phải hiện: "User ID: [object id]"
```

---

##  EXPECTED RESULTS

###  Test 1 - SAVE: PASS
- MongoDB phispace.designs có 1+ documents
- Document có user, slotIndex, items, roomConfig, updatedAt

###  Test 2 - LOAD: PASS
- Items load lại đúng type, position, rotation
- Không có error trong console

###  Test 3 - CATEGORIES: PASS
- Console log: " Loaded categories from database"
- Hardcode + DB categories gộp thành công
- Tất cả category modal items visible

---

##  FINAL CHECKLIST

- [ ] Save design → MongoDB updated 
- [ ] Load design → Items restored 
- [ ] Categories fetch từ API 
- [ ] Hardcode categories vẫn dùng làm fallback 
- [ ] JWT token auth hoạt động 
- [ ] Không có console error 
- [ ] Server log clear, dễ debug 

Nếu tất cả  → **HỆ THỐNG HOẠT ĐỘNG ĐẦY ĐỦ!** 
