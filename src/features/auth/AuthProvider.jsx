import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, restoreSession, setAccessToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    restoreSession().then((account) => { if (active) setUser(account); })
      .catch(() => { setAccessToken(null); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (credentials, registering = false) => {
    const result = await apiRequest(registering ? "/auth/register" : "/auth/login", {
      method: "POST", body: JSON.stringify(credentials),
    }, false);
    setAccessToken(result.token);
    setUser(result.data.user);
    return result.data.user;
  }, []);

  const updateUser = useCallback((nextUser) => setUser((current) => current ? { ...current, ...nextUser } : nextUser), []);

  const completeUsername = useCallback(async (credentials) => {
    const result = await apiRequest("/auth/username", {
      method: "PATCH", body: JSON.stringify(credentials),
    });
    setUser(result.data.user);
    return result.data.user;
  }, []);

  const signOut = useCallback(async () => {
    try { if (user) await apiRequest("/auth/logout", { method: "POST" }); }
    finally { setAccessToken(null); setUser(null); }
  }, [user]);

  const value = useMemo(() => ({ user, ready, signIn, signOut, updateUser, completeUsername }), [user, ready, signIn, signOut, updateUser, completeUsername]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
