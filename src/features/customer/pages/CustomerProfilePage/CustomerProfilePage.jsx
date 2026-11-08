import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiShoppingBag, FiUser } from "react-icons/fi";
import { CoreButton, CoreCard, CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useCustomerProfile, useCustomerStatistics, useUpdateCustomerProfile } from "../../hooks/useCustomerPortal.js";
import { customerApiError, formatCustomerMoney } from "../../lib/customerFormat.js";
import "./CustomerProfilePage.css";

const BLANK = { firstName: "", lastName: "", phoneNumber: "", address: "" };

export function CustomerProfilePage() {
  const profileQuery = useCustomerProfile();
  const statsQuery = useCustomerStatistics();
  const update = useUpdateCustomerProfile();
  const [form, setForm] = useState(BLANK);
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      const { firstName, lastName, phoneNumber, address } = profileQuery.data;
      setForm({ firstName: firstName ?? "", lastName: lastName ?? "", phoneNumber: phoneNumber ?? "", address: address ?? "" });
    }
  }, [profileQuery.data]);

  function change(field, value) {
    setNotice("");
    setFieldError("");
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleSave(event) {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFieldError("Vui lòng nhập họ và tên.");
      return;
    }
    update.mutate({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim(), address: form.address.trim(),
    }, { onSuccess: () => setNotice("Thông tin đã được cập nhật.") });
  }

  if (profileQuery.isPending) return <p role="status">Đang tải hồ sơ khách hàng...</p>;
  if (profileQuery.isError) return (
    <p role="alert" className="customer-profile__error">
      <FiAlertCircle aria-hidden="true" /> {customerApiError(profileQuery.error, "Không thể tải hồ sơ. Vui lòng kiểm tra quyền Customer và thử lại.")}
    </p>
  );

  return (
    <div className="customer-profile">
      <CorePageHeader eyebrow="EcoFood / Customer" title="Thông tin cá nhân"
        description="Xem và quản lý thông tin khách hàng của bạn." aside={
          <Link to={ROUTES.CUSTOMER_INVOICES} className="customer-profile__invoice-link">
            <FiShoppingBag aria-hidden="true" /> Lịch sử mua hàng
          </Link>
        } />
      <div className="customer-profile__stats">
        <div className="customer-profile__stat"><FiShoppingBag aria-hidden="true" /><div><span>Tổng hóa đơn</span><strong>{statsQuery.data?.totalInvoices ?? "—"}</strong></div></div>
        <div className="customer-profile__stat"><FiUser aria-hidden="true" /><div><span>Tổng chi tiêu</span>
          {statsQuery.data?.spending?.length ? statsQuery.data.spending.map((item) =>
            <strong key={item.currency}>{formatCustomerMoney(item.totalAmount, item.currency)}</strong>)
            : <strong>—</strong>}
        </div></div>
      </div>
      {statsQuery.isError && <p role="status" className="customer-profile__muted">Chưa tải được thống kê giao dịch.</p>}
      <CoreCard title="Hồ sơ khách hàng" description="Email đăng nhập được quản lý ở hệ thống tài khoản và không chỉnh sửa tại đây.">
        <form onSubmit={handleSave} className="customer-profile__form">
          <div className="customer-profile__fields">
            <label className="fe-field">Họ / First name *
              <input className="fe-input" maxLength={80} value={form.firstName} onChange={(e) => change("firstName", e.target.value)} />
            </label>
            <label className="fe-field">Tên / Last name *
              <input className="fe-input" maxLength={80} value={form.lastName} onChange={(e) => change("lastName", e.target.value)} />
            </label>
            <label className="fe-field">Email (chỉ xem)
              <input className="fe-input" value={profileQuery.data.email ?? ""} disabled readOnly />
            </label>
            <label className="fe-field">Điện thoại
              <input className="fe-input" type="tel" maxLength={20} value={form.phoneNumber} onChange={(e) => change("phoneNumber", e.target.value)} placeholder="+84..." />
            </label>
            <label className="fe-field customer-profile__full">Địa chỉ
              <input className="fe-input" maxLength={250} value={form.address} onChange={(e) => change("address", e.target.value)} />
            </label>
          </div>
          {fieldError && <p role="alert" className="customer-profile__error">{fieldError}</p>}
          {update.isError && <p role="alert" className="customer-profile__error">{customerApiError(update.error, "Không thể lưu thông tin.")}</p>}
          {notice && <p role="status" className="customer-profile__success">{notice}</p>}
          <div className="customer-profile__actions"><CoreButton type="submit" loading={update.isPending}>Lưu thay đổi</CoreButton></div>
        </form>
      </CoreCard>
    </div>
  );
}
