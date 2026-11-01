export function SessionTimeoutDialog({ secondsLeft, onContinue, onLogout }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Phiên làm việc sắp hết hạn</h2>
        <p className="mb-4 text-sm text-gray-600">
          Bạn đã không thao tác trong một khoảng thời gian. Hệ thống sẽ tự động đăng xuất sau{" "}
          <strong>{secondsLeft}</strong> giây.
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Tiếp tục phiên
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
