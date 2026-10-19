export function decodeJwt(token) {
  const payload = token.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(json);
}

export function isJwtExpired(token) {
  try {
    const { exp } = decodeJwt(token);
    return !exp || exp <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}
