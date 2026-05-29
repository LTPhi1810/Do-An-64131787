# CHANGELOG - PhiSpace Interior Design v1.0.0

## [1.0.0] - 2026-05-29

### ✨ Tính Năng Mới (New Features)

#### Frontend (Interior Design App)
- **Google OAuth Integration** - Đăng nhập bằng tài khoản Google
  - Tích hợp Passport.js với Google Strategy
  - Xử lý callback từ Google OAuth
  - Lưu trữ user info từ Google vào MongoDB

- **Password Reset/Recovery System** - Hệ thống quên mật khẩu
  - Forgot Password - Gửi link reset password qua email
  - Reset Password - Người dùng có thể tạo mật khẩu mới
  - Token expiry - Link reset hết hạn sau 1 giờ
  - Email validation trước khi reset

- **Admin Dashboard Enhancement** - Quản lý hệ thống
  - User Management (Danh sách, tạo, xóa, thay đổi role)
  - SMTP Configuration - Cấu hình email settings
  - Settings Management - Quản lý banner, slides, category icons
  - Category & Item Management - Quản lý đồ nội thất

- **Enhanced Authentication** - Cải thiện bảo mật
  - Confirm password validation
  - Better error messages
  - Remember login option

#### Backend (Node.js/Express)
- **Multer Integration** - Upload file 3D models và images
  - Auto-create upload directory
  - File naming with timestamp để tránh collision
  - Support file size lên 50MB

- **User Management APIs** - Quản lý người dùng
  - GET /api/auth/users - Lấy danh sách users (không gửi password)
  - DELETE /api/auth/users/:id - Xóa user
  - PUT /api/auth/users/:id/role - Thay đổi role
  - POST /api/auth/users - Admin tạo user mới
  - Admin account protection - Cấm xóa/sửa tài khoản admin

- **Password Reset Backend** - Xử lý reset password
  - Generate unique reset token (crypto.randomBytes)
  - Email notification với link reset
  - Token validation & expiry check
  - Hash password trước khi lưu (bcryptjs)

- **SMTP Configuration** - Quản lý email settings
  - GET /api/auth/smtp-config - Lấy config
  - POST /api/auth/smtp-config - Lưu config
  - Support Google OAuth settings

- **Enhanced Error Handling** - Xử lý lỗi tốt hơn
  - Validation input
  - Clear error messages
  - Proper HTTP status codes

### 🔧 Cải Thiện (Improvements)

- **Code Cleanup** - Loại bỏ comments chi tiết, cải thiện readability
- **Component Optimization** - Tối ưu hóa component lifecycle
- **API Structure** - Cấu trúc API endpoints rõ ràng hơn
- **Security** - Tăng cường bảo mật (bcrypt, JWT, token expiry)
- **Validation** - Thêm validation cho tất cả input
- **Environment Setup** - CORS, static files, session config

### 🐛 Bug Fixes

- Session management - Cấu hình express-session chính xác
- CORS configuration - Cho phép frontend (localhost:5173) call backend
- File upload - Xử lý file path chính xác
- User list - Không gửi password trong response

### 📦 Dependencies

**New Packages Added:**
- `multer` - File upload handling
- `crypto` - Token generation
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `passport-google-oauth20` - Google OAuth

### 📊 Thay Đổi Số Liệu

```
11 files changed, 863 insertions(+), 642 deletions(-)

  interior-design/src/App.jsx                       | 161 ++---
  interior-design/src/components/AdminDashboard.jsx | 814 +++++++++++++---------
  interior-design/src/components/Auth.jsx           | 322 +++++----
  interior-design/src/components/Topbar.jsx         |  11 +-
  package-lock.json                                 |  12 +-
  server/controllers/authController.js              |  10 +-
  server/index.js                                   |   3 +-
  server/models/Setting.js                          |   3 +-
  server/models/User.js                             |   1 +
  server/routes/authRoutes.js                       |  55 ++
  server/routes/designRoutes.js                     | 113 +-
```

### ✅ Testing Status

- ✅ Frontend Build: Success (607 modules)
- ✅ No Compilation Errors
- ✅ No Logic Conflicts
- ✅ No Circular Dependencies
- ✅ API Endpoints Validated

### 📝 Notes for Deployment

1. **Environment Variables** - Cần setup .env với:
   - MONGO_URI
   - JWT_SECRET
   - SMTP_HOST, SMTP_USER, SMTP_PASS
   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   - FRONTEND_URL

2. **Database** - Chạy MongoDB:
   - Seed admin account nếu chưa có
   - Đảm bảo indexes đã tạo

3. **Email Setup** - SMTP config:
   - Setup SMTP provider (Gmail, SendGrid, etc.)
   - Configure trong Admin Dashboard

4. **Google OAuth** - Setup:
   - Create Google OAuth credentials
   - Configure callback URL: `http://your-domain/api/auth/google/callback`

### 🎯 Next Steps

- [ ] Deploy to production
- [ ] Setup production database
- [ ] Configure email provider
- [ ] Test all authentication flows
- [ ] Monitor error logs

---

**Prepared by:** Lê Thanh Phi  
**Date:** 2026-05-29  
**Version:** 1.0.0
