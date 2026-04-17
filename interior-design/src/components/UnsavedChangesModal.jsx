import React from 'react';

function UnsavedChangesModal({ onDiscardChanges, onContinueEditing }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 bg-emerald-600 text-white">
          <h2 className="text-lg font-black">Dự án chưa được lưu</h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald-100">
            Bạn có muốn tiếp tục chỉnh sửa hay bỏ thay đổi và rời khỏi?
          </p>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <button
            onClick={onDiscardChanges}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold uppercase text-white shadow-lg shadow-emerald-200/40 hover:bg-emerald-600 transition"
          >
            Bỏ thay đổi và rời đi
          </button>
          <button
            onClick={onContinueEditing}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-700 hover:bg-slate-100 transition"
          >
            Tiếp tục chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesModal;
