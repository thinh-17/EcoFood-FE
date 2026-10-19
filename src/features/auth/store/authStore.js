import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { generateCodeChallenge, generateCodeVerifier, generateRandomString } from "../lib/pkce.js";
import { resolveLoginDomain } from "../lib/authDomain.js";
import { decodeJwt, isJwtExpired } from "../lib/jwt.js";
import {
  fetchLoginInfo,
  discoverOidc,
  redeemAuthorizationCode,
  redeemKeycloakRefreshToken,
  exchangeInternalTokenRequest,
  refreshInternalTokenRequest,
  revokeInternalTokens,
} from "../api/auth.api.js";

const SCOPES = "openid profile offline_access phone";

function buildRedirectUri() {
  return `${window.location.origin}/callback`;
}

let silentRefreshTimeoutId = null;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // --- persisted across reloads (recovery only — never the access
      // tokens themselves, which live in memory for the life of the tab) ---
      internalRefreshToken: "",
      kcRefreshToken: "",

      // --- resolved at bootstrap, not persisted (re-resolved every load) ---
      domain: "",
      realm: "",
      clientId: "",
      tenantId: "",

      // --- in-memory only ---
      internalAccessToken: "",
      keycloakIdToken: "",
      status: "idle", // idle | checking | authenticated | unauthenticated
      error: "",

      isValid() {
        const token = get().internalAccessToken;
        return !!token && !isJwtExpired(token);
      },

      /** Resolves which tenant this browser is logging into — runs once, before any login attempt. */
      async bootstrap() {
        set({ status: "checking", error: "" });
        try {
          const domain = resolveLoginDomain(get().domain);
          const loginInfo = await fetchLoginInfo(domain);
          set({ domain, realm: loginInfo.realm, clientId: loginInfo.clientId, tenantId: loginInfo.tenantId });
        } catch (err) {
          set({ status: "unauthenticated", error: err.message });
          return;
        }

        const result = await get().checkAuth();
        set({ status: result.isAuth ? "authenticated" : "unauthenticated" });
      },

      /** Step 1: full-page redirect to Keycloak — nothing here touches our own backend. */
      async startLogin() {
        const { realm, clientId } = get();
        if (!realm || !clientId) {
          throw new Error("Tenant not resolved yet — call bootstrap() first.");
        }

        const discovery = await discoverOidc(realm);

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateRandomString(16);
        const nonce = generateRandomString(16);

        // Ephemeral — only needed for this one redirect round-trip.
        sessionStorage.setItem("pkce_code_verifier", codeVerifier);
        sessionStorage.setItem("oauth_state", state);

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: buildRedirectUri(),
          response_type: "code",
          scope: SCOPES,
          state,
          nonce,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          // Required for the backend's AppLoginFormsProvider SPI to resolve
          // this tenant's login method (password vs. email OTP) — clientId
          // is always {tenantId}-public, so strip that suffix back off.
          kc_tenant_identifier: clientId.replace(/-public$/, ""),
        });

        window.location.href = `${discovery.authorization_endpoint}?${params.toString()}`;
      },

      /** Step 2: runs on /callback — redeems the code, then exchanges for our own internal token. */
      async handleCallback(searchParams) {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          throw new Error(`Keycloak returned an error: ${error} - ${searchParams.get("error_description") || ""}`);
        }

        const expectedState = sessionStorage.getItem("oauth_state");
        if (!state || state !== expectedState) {
          throw new Error("state mismatch (possible CSRF) - aborting.");
        }

        const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
        const { realm, clientId } = get();
        if (!code || !codeVerifier || !realm || !clientId) {
          throw new Error("Missing code, code_verifier, realm, or clientId - cannot exchange token.");
        }

        const discovery = await discoverOidc(realm);
        const tokens = await redeemAuthorizationCode({
          tokenEndpoint: discovery.token_endpoint,
          clientId,
          redirectUri: buildRedirectUri(),
          code,
          codeVerifier,
        });

        sessionStorage.removeItem("pkce_code_verifier");
        sessionStorage.removeItem("oauth_state");
        set({ keycloakIdToken: tokens.id_token || "", kcRefreshToken: tokens.refresh_token || get().kcRefreshToken });

        await get().exchangeInternalToken(tokens.access_token);
      },

      /** Step 6 (matches the backend's own naming): hands the Keycloak access token to our own exchange endpoint. */
      async exchangeInternalToken(keycloakAccessToken) {
        const data = await exchangeInternalTokenRequest(keycloakAccessToken);
        set({
          internalAccessToken: data.accessToken,
          internalRefreshToken: data.refreshToken,
          status: "authenticated",
        });
        scheduleSilentRefresh(data.accessToken, get);
        return data;
      },

      async refreshInternal() {
        const refreshToken = get().internalRefreshToken;
        if (!refreshToken) {
          throw new Error("No internal refresh token stored - cannot refresh.");
        }
        const data = await refreshInternalTokenRequest(refreshToken);
        set({ internalAccessToken: data.accessToken, internalRefreshToken: data.refreshToken });
        scheduleSilentRefresh(data.accessToken, get);
        return data;
      },

      /** Silent-SSO recovery: only reached once our own refresh token is also dead. */
      async recoverViaKeycloakSso() {
        const { kcRefreshToken, realm, clientId } = get();
        if (!kcRefreshToken || !realm || !clientId) {
          throw new Error("No Keycloak refresh token available - cannot silently recover SSO.");
        }
        const discovery = await discoverOidc(realm);
        const tokens = await redeemKeycloakRefreshToken({
          tokenEndpoint: discovery.token_endpoint,
          clientId,
          refreshToken: kcRefreshToken,
        });
        set({ kcRefreshToken: tokens.refresh_token || kcRefreshToken });
        await get().exchangeInternalToken(tokens.access_token);
      },

      /**
       * Two-layer check, mirrors the oke/frontend mockup's checkAuth():
       * Layer 1 — local/sync. Layer 2 — only reached if Layer 1 fails: try
       * our own refresh first, then Keycloak's silent SSO as a last resort.
       */
      async checkAuth() {
        if (get().isValid()) {
          return { isAuth: true };
        }

        const refreshToken = get().internalRefreshToken;
        if (refreshToken && !isJwtExpired(refreshToken)) {
          try {
            await get().refreshInternal();
            return { isAuth: true };
          } catch {
            // fall through to silent-SSO recovery below
          }
        }

        try {
          await get().recoverViaKeycloakSso();
          return { isAuth: true };
        } catch {
          return { isAuth: false };
        }
      },

      async logout() {
        clearTimeout(silentRefreshTimeoutId);
        const { internalAccessToken, internalRefreshToken, keycloakIdToken, realm } = get();
        try {
          await revokeInternalTokens(internalAccessToken, internalRefreshToken);
        } catch {
          // backend unreachable — still proceed with local/Keycloak logout below
        }

        set({
          internalAccessToken: "",
          internalRefreshToken: "",
          kcRefreshToken: "",
          keycloakIdToken: "",
          status: "unauthenticated",
        });

        if (keycloakIdToken && realm) {
          try {
            const discovery = await discoverOidc(realm);
            const params = new URLSearchParams({
              id_token_hint: keycloakIdToken,
              post_logout_redirect_uri: `${window.location.origin}/`,
            });
            window.location.href = `${discovery.end_session_endpoint}?${params.toString()}`;
            return;
          } catch {
            // discovery failed — fall through to a plain local redirect
          }
        }
        window.location.href = "/";
      },
    }),
    {
      name: "ecofood-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        internalRefreshToken: state.internalRefreshToken,
        kcRefreshToken: state.kcRefreshToken,
      }),
    }
  )
);

// Mirrors the mockup's AuthFacade-equivalent silent-refresh loop: fires at
// 80% of the access token's remaining lifetime, re-arming itself.
function scheduleSilentRefresh(accessToken, get) {
  clearTimeout(silentRefreshTimeoutId);
  if (!accessToken) {
    return;
  }

  const { exp } = decodeJwt(accessToken);
  const msUntilRefresh = Math.round((exp - Math.floor(Date.now() / 1000)) * 0.8 * 1000);

  silentRefreshTimeoutId = setTimeout(async () => {
    const refreshToken = get().internalRefreshToken;
    if (!refreshToken || isJwtExpired(refreshToken)) {
      await get().logout();
      return;
    }
    try {
      await get().refreshInternal();
    } catch {
      await get().logout();
    }
  }, msUntilRefresh);
}
