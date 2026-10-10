const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const googleAuthUrl = `${API_BASE}/auth/google`;
let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => { accessToken = token || null; };

async function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        accessToken = data.token;
        return accessToken;
      })
      .catch(() => null)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  if (response.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await refreshToken();
    if (refreshed) return apiRequest(path, options, false);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "تعذر تنفيذ الطلب. حاول مرة أخرى.");
  return payload;
}

export async function restoreSession() {
  const token = await refreshToken();
  if (!token) return null;
  const result = await apiRequest("/auth/me", {}, false);
  return result.data.user;
}
