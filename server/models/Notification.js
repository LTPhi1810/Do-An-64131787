const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  actionType: { 
    type: String, 
    enum: ['NEW_USER', 'UI_CHANGE', 'SMTP_CHANGE', 'MODEL_CHANGE', 'USER_CHANGE'],
    required: true
  },
  message: { 
    type: String, 
    required: true 
  }, // Ví dụ: "Admin admin đã thay đổi cấu hình SMTP" hoặc "Người dùng test vừa đăng ký tài khoản mới"
  performedBy: { 
    type: String,
    default: 'System'
  }, // Tên người thực hiện (nếu là đăng ký mới thì để 'System', nếu là admin sửa thì lưu tên admin đó)
  isRead: { 
    type: Boolean, 
    default: false 
  }, // Trạng thái đã đọc hay chưa để hiển thị chấm đỏ trên giao diện
  createdAt: { 
    type: Date, 
    default: Date.now 
  } // Thời gian tạo để sắp xếp thông báo mới nhất lên đầu
});

module.exports = mongoose.exports = mongoose.model('Notification', NotificationSchema);