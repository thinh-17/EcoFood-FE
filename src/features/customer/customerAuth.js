import { discoverOidc, redeemAuthorizationCode } from "../auth/api/auth.api.js";
import { generateCodeVerifier, generateCodeChallenge, generateRandomString } from "../auth/lib/pkce.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { useAuthStore } from "../auth/store/authStore.js";
import { customerApi } from "./customer.api.js";
import { CUSTOMER_FLOW_KEY, validateCustomerFlow, customerInvoicePath } from "./customer.lib.js";

const callback = () => `${window.location.origin}/customer/callback`;
export async function startCustomerAuth(config, register = false, token = "", invoiceId = "") {
  if (register && !config.registrationEnabled) throw new Error("Tenant chưa bật đăng ký Customer.");
  const discovery = await discoverOidc(config.realm);
  const flow = { config, register, token, invoiceId, state: generateRandomString(), nonce: generateRandomString(), codeVerifier: generateCodeVerifier(), startedAt: Date.now() };
  const challenge = await generateCodeChallenge(flow.codeVerifier);
  sessionStorage.setItem(CUSTOMER_FLOW_KEY, JSON.stringify(flow));
  const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: callback(), response_type: "code", scope: "openid profile email offline_access",
    state: flow.state, nonce: flow.nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "login",
    kc_tenant_identifier: config.clientId.replace(/-public$/, "") });
  const endpoint = register ? discovery.authorization_endpoint.replace(/\/auth$/, "/registrations") : discovery.authorization_endpoint;
  window.location.assign(`${endpoint}?${params}`);
}
export async function finishCustomerAuth(params) {
  let flow;
  try { flow = JSON.parse(sessionStorage.getItem(CUSTOMER_FLOW_KEY)); } catch { /* Invalid local flow fails closed. */ }
  if (params.get("error") || !params.get("code") || !validateCustomerFlow(flow, params.get("state"))) {
    sessionStorage.removeItem(CUSTOMER_FLOW_KEY); throw new Error("Phiên xác thực Customer không hợp lệ hoặc đã hết hạn.");
  }
  try {
    const discovery = await discoverOidc(flow.config.realm);
    const tokens = await redeemAuthorizationCode({ tokenEndpoint: discovery.token_endpoint, clientId: flow.config.clientId, redirectUri: callback(), code: params.get("code"), codeVerifier: flow.codeVerifier });
    if (!tokens.id_token || decodeJwt(tokens.id_token).nonce !== flow.nonce) throw new Error("Customer login nonce không hợp lệ.");
    await customerApi.bootstrap({ accessToken: tokens.access_token, tenantId: flow.config.tenantId, register: flow.register });
    useAuthStore.setState({ realm: flow.config.realm, clientId: flow.config.clientId, tenantId: flow.config.tenantId,
      keycloakIdToken: tokens.id_token, kcRefreshToken: tokens.refresh_token || "", internalAccessToken: "", internalRefreshToken: "" });
    await useAuthStore.getState().exchangeInternalToken(tokens.access_token);
    if (flow.token) {
      const claimed = await customerApi.claim(flow.token);
      return customerInvoicePath(claimed.invoice.id, flow.config.tenantId);
    }
    return flow.invoiceId ? customerInvoicePath(flow.invoiceId, flow.config.tenantId) : "/customer";
  } finally { sessionStorage.removeItem(CUSTOMER_FLOW_KEY); }
}
