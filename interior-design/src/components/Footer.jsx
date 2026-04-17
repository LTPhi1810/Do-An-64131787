import React from 'react';

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-20 pb-10 mt-20">
      <div className="max-w-7xl mx-auto px-8">
        {/* 5 Cột thông tin chuẩn Planner 5D */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-20">
          <FooterCol title="Công ty" links={['Về chúng tôi', 'Bảng giá', 'Tuyển dụng', 'Tin tức', 'Liên hệ']} />
          <FooterCol title="Giải pháp" links={['Thiết kế 3D', 'Sơ đồ mặt bằng', 'Trang trí nhà', 'Nội thất văn phòng', 'Phòng bếp']} />
          <FooterCol title="Nền tảng" links={['Web', 'iOS', 'Android', 'macOS', 'Windows']} />
          <FooterCol title="Tính năng" links={['AI nhận diện', 'Thiết kế AR', 'Tự động sắp xếp', 'Cấu hình vật liệu', 'Xuất ảnh 4K']} />
          <FooterCol title="Ý tưởng" links={['Mẫu phòng khách', 'Mẫu phòng ngủ', 'Xu hướng 2026', 'Phong cách tối giản', 'Mẹo thiết kế']} />
        </div>

        {/* Phần dưới cùng: Social & Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-slate-50 gap-6">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black text-[#00b259]">PhiSpace</span>
            <span className="text-slate-300 text-xs">© 2011—2026 PhiSpace UAB</span>
          </div>
          
          <div className="flex gap-4">
            {/* Các icon mạng xã hội giả lập */}
            {['Fb', 'Ig', 'Yt', 'Tw', 'In'].map(s => (
              <span key={s} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 hover:bg-green-50 hover:text-[#00b259] cursor-pointer transition-all">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h4>
      <ul className="flex flex-col gap-3">
        {links.map(link => (
          <li key={link} className="text-slate-400 text-xs font-medium hover:text-[#00b259] cursor-pointer transition-colors">
            {link}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Footer;