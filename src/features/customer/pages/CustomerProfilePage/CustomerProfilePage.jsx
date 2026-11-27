import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";
import { useAuthStore } from "../../../auth/store/authStore.js";
import { customerApi } from "../../api/customer.api.js";
import { customerError } from "../../lib/customer.lib.js";
import { useCustomerProfile } from "../../hooks/useCustomerProfile.js";
import { CustomerLogin } from "../../components/CustomerLogin.jsx";
import { CustomerProfileForm } from "../../components/CustomerProfileForm.jsx";
import "../CustomerPages.css";
import "./CustomerProfilePage.css";

export function CustomerProfilePage() {
  const bearer = useAuthStore((state) => state.internalAccessToken);
  const tenant = useAuthStore((state) => state.tenantId);
  const [params] = useSearchParams();
  const client = useQueryClient();
  const profile = useCustomerProfile();
  const [notice, setNotice] = useState("");
  const update = useMutation({ mutationFn: customerApi.update,
    onSuccess: (saved) => { client.setQueryData(["customer", bearer, "profile"], saved); setNotice("Your profile has been updated."); } });
  return <section className="eco-module-page customer-page">
    <CorePageHeader eyebrow="EcoFood Platform / Customer" title="My profile" description="Manage your personal information." />
    {(!bearer || profile.isError) && <>
      {profile.isError && <FeedbackMessage error={profile.error}>{customerError(profile.error)}</FeedbackMessage>}
      <CustomerLogin tenant={params.get("tenant") || tenant} />
    </>}
    {bearer && profile.isPending && <CoreLoadingState title="Loading profile" />}
    {notice && <p role="status" className="customer-success">{notice}</p>}
    {update.isError && <FeedbackMessage error={update.error}><p>{customerError(update.error)}</p>
      {update.error?.response?.status === 409 && <CoreButton variant="secondary" onClick={() => { update.reset(); profile.refetch(); }}>Reload profile</CoreButton>}
    </FeedbackMessage>}
    {profile.data && <CustomerProfileForm key={`${profile.data.id}/${profile.data.revision}`} profile={profile.data}
      busy={update.isPending} save={(payload) => { setNotice(""); update.mutate(payload); }}
      reset={() => { setNotice(""); update.reset(); }} />}
  </section>;
}
