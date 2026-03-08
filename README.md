# 🏠 PhiSpace - Ứng dụng Thiết kế Nội thất 2D/3D

**PhiSpace** là một ứng dụng web cho phép người dùng tự tay sắp xếp và thiết kế không gian nội thất một cách trực quan. Dự án này được phát triển như một phần của Đồ án Tốt nghiệp, tập trung vào trải nghiệm người dùng mượt mà và tính chính xác trong thiết kế kiến trúc cơ bản.

## 🚀 Tính năng nổi bật

* **Chế độ xem kép (2D/3D):** * **2D Design:** Chế độ bản vẽ kỹ thuật nhìn từ trên xuống, hỗ trợ kéo thả và sắp xếp chính xác tuyệt đối.
    * **3D View:** Quan sát căn phòng dưới góc nhìn phối cảnh thực tế với ánh sáng và bóng đổ sinh động.
* **Hệ thống tương tác thông minh:**
    * **Grid Snapping:** Vật thể tự động bắt dính vào lưới 0.5m, giúp sắp xếp đồ đạc ngay hàng thẳng lối.
    * **Chốt chặn va chạm:** Đồ đạc được lập trình để không bao giờ bị kéo ra ngoài hoặc đâm xuyên qua tường.
    * **Mũi tên chỉ hướng (Gizmo):** Hiển thị các mũi tên đen chuyên nghiệp khi chọn vật thể để dễ dàng định vị.
* **Hệ thống Lưu & Tải (Save/Load):** * Cung cấp 5 Slot lưu trữ phong cách RPG chuyên nghiệp.
    * Dữ liệu được lưu trực tiếp vào trình duyệt (LocalStorage), giúp bạn tiếp tục công việc bất cứ lúc nào.

## 🖱️ Hướng dẫn sử dụng

* **Chuột trái:** Click để "nhặt" vật thể, click lần nữa vào sàn để "thả" vật thể xuống vị trí mới.
* **Chuột phải (trong 2D):** Click vào vật thể để mở Menu tùy chọn (Xoay 45 độ hoặc Xóa bỏ).
* **Điều khiển Camera:**
    * **Xoay (chỉ 3D):** Giữ chuột trái và rê để xoay góc nhìn quanh phòng.
    * **Di chuyển (Pan):** Giữ chuột phải để kéo toàn bộ bản vẽ/căn phòng sang hướng khác.
    * **Phóng to/Thu nhỏ:** Sử dụng con lăn chuột (Scroll).

## 🛠️ Công nghệ sử dụng

* **Frontend:** React.js, Tailwind CSS.
* **Đồ họa 3D:** Three.js, React Three Fiber, React Three Drei.
* **Quản lý mã nguồn:** Git & GitHub.

## 📦 Cài đặt để chạy dưới máy cục bộ

1. Tải mã nguồn hoặc dùng lệnh: `git clone <đường-dẫn-repo>`
2. Di chuyển vào thư mục dự án: `cd interior-design`
3. Cài đặt các thư viện: `npm install`
4. Chạy dự án: `npm run dev`
5. Mở trình duyệt tại địa chỉ: `http://localhost:5173`