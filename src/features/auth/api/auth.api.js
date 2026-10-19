import { apiClient, unwrapData } from "../../../services/apiClient.js";

const KEYCLOAK_BASE_URL = import.meta.env.VITE_KEYCLOAK_BASE_URL || "http://localhost:8080";

/** GET /api/v1/tenants/login-info?domain=... — resolves a domain to its tenant's realm/clientId. */
export async function fetchLoginInfo(domain) {
  const response = await apiClient.get("/api/v1/tenants/login-info", { params: { domain } });
  return unwrapData(response);
}

// Cached per page load — discovery is cheap, but no reason to refetch it on
// every call within the same session.
const discoveryCache = new Map();

/** Fetches the realm's OIDC discovery document — same call keycloak-js/oidc-client-ts make on startup. */
export async function discoverOidc(realm) {
  if (discoveryCache.has(realm)) {
    return discoveryCache.get(realm);
  }

  const response = await fetch(`${KEYCLOAK_BASE_URL}/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new Error(`Could not fetch OIDC discovery document for realm "${realm}" (status ${response.status}).`);
  }

  const config = await response.json();
  discoveryCache.set(realm, config);
  return config;
}

/** Redeems an authorization code for Keycloak's own token set — browser <-> Keycloak only, no backend involved. */
export async function redeemAuthorizationCode({ tokenEndpoint, clientId, redirectUri, code, codeVerifier }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${data.error} - ${data.error_description || ""}`);
  }
  return data;
}

/** Keycloak's own silent-SSO refresh — used only when our internal refresh token has also died. */
export async function redeemKeycloakRefreshToken({ tokenEndpoint, clientId, refreshToken }) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Keycloak SSO refresh failed: ${data.error} - ${data.error_description || ""}`);
  }
  return data;
}

/** POST /api/v1/auth/exchange — hands Keycloak's access token to the backend, gets our own internal pair back. */
export async function exchangeInternalTokenRequest(keycloakAccessToken) {
  const response = await apiClient.post("/api/v1/auth/exchange", { accessToken: keycloakAccessToken });
  return unwrapData(response);
}

/** POST /api/v1/auth/refresh-token — proactive refresh, called at 80% of the access token's lifetime. */
export async function refreshInternalTokenRequest(refreshToken) {
  const response = await apiClient.post("/api/v1/auth/refresh-token", { refreshToken });
  return unwrapData(response);
}

/** POST /api/v1/auth/logout — best-effort server-side revocation; caller still clears local state regardless. */
export async function revokeInternalTokens(accessToken, refreshToken) {
  await apiClient.post("/api/v1/auth/logout", { accessToken, refreshToken });
}
