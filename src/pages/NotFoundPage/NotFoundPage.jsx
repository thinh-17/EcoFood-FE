import "./NotFoundPage.css";

import { Link } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

export function NotFoundPage() {
  return (
    <main className="fnb-not-found">
      <span className="fnb-not-found__code">
        404
      </span>

      <h1>Không tìm thấy trang</h1>

      <p>
        Đường dẫn bạn truy cập hiện chưa tồn tại.
      </p>

      <Link to={ROUTES.HOME}>
        Quay về Home
      </Link>
    </main>
  );
}