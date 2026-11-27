import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreEmptyState, CoreLoadingState, CorePopover } from "@thinh-17/fe-core";
import { FiBell, FiCheckCircle, FiMessageSquare, FiRefreshCw } from "react-icons/fi";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { useCustomerComplaintUpdates } from "../hooks/useCustomerComplaintUpdates.js";
import { customerComplaintRoot, customerComplaintUpdates } from "../lib/customerComplaintUpdates.js";
import { complaintError } from "../lib/complaint.js";
import "./CustomerComplaintUpdates.css";

export function CustomerComplaintUpdates({ token, tenantId }) {
  const location = useLocation();
  const history = useCustomerComplaintUpdates(token, tenantId);
  return <CustomerComplaintUpdatesMenu key={location.key} history={history} token={token} tenantId={tenantId} />;
}

function CustomerComplaintUpdatesMenu({ history, token, tenantId }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const updates = history.isError ? [] : customerComplaintUpdates(history.data?.content);
  const path = (id) => `/customer/complaints?tenant=${encodeURIComponent(tenantId)}${id ? `&complaintId=${encodeURIComponent(id)}` : ""}`;
  function openComplaint(id) {
    close();
    client.invalidateQueries({ queryKey: [...customerComplaintRoot(token, tenantId), "detail", id] });
  }
  return <div className="customer-complaint-updates">
    <button ref={trigger} type="button" className="customer-complaint-updates__bell" aria-label="Complaint updates" title="Complaint updates" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}><FiBell size={20} aria-hidden="true" /></button>
    <CorePopover open={open} onClose={close} triggerRef={trigger} title="Complaint updates" description="Responses from your service and platform teams"
      headerActions={<CoreButton variant="secondary" size="sm" aria-label="Refresh complaint updates" disabled={history.isFetching} onClick={() => history.refetch()}><FiRefreshCw aria-hidden="true" /></CoreButton>}
      footer={<Link to={path()} onClick={close}>View all complaints</Link>}>
      {history.isPending && <CoreLoadingState title="Loading complaint updates" />}
      {history.isError && <FeedbackMessage error={history.error}><p>{complaintError(history.error)}</p><CoreButton variant="secondary" onClick={() => history.refetch()}>Try again</CoreButton></FeedbackMessage>}
      {history.isSuccess && !updates.length && <CoreEmptyState icon={FiMessageSquare} title="No updates yet" description="Your team's responses will appear here once your complaint is being handled." />}
      {updates.slice(0, 10).map(update => <Link key={update.id} className="customer-complaint-updates__item" to={path(update.complaintId)} onClick={() => openComplaint(update.complaintId)}>
        <span className="customer-complaint-updates__icon" aria-hidden="true">{["RESOLVED", "CLOSED"].includes(update.status) ? <FiCheckCircle size={18} /> : <FiMessageSquare size={18} />}</span>
        <div><strong>{update.title}</strong><span className="customer-complaint-updates__subject">{update.subject}</span><span className="customer-complaint-updates__team">{update.team}</span>
          {update.note && <p>{update.note}</p>}<div className="customer-complaint-updates__meta"><StatusBadge status={update.status} />{update.createdAt && <time dateTime={update.createdAt}>{new Date(update.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time>}</div>
        </div>
      </Link>)}
    </CorePopover>
  </div>;
}
