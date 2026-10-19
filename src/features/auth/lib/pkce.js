// PKCE helpers, hand-rolled with the Web Crypto API rather than a library
// (keycloak-js, oidc-client-ts) — mirrors the oke/frontend mockup exactly,
// kept framework-agnostic so it ports unchanged.

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateRandomString(byteLength = 32) {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// code_verifier: a high-entropy random string, kept client-side only, never
// sent in the authorization request.
export function generateCodeVerifier() {
  return generateRandomString(32);
}

// code_challenge = base64url(SHA-256(code_verifier)) — sent in the
// authorization request; Keycloak checks it against the verifier we send
// at token-exchange time.
export async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}
