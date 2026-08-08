import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, clearSession, getStoredUser, getToken, setSession } from "./api";
import type { AuthUser } from "./api";

type AuthValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    referral_code?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();
    if (storedToken) {
      setToken(storedToken);
      setUserState(storedUser);
      api.auth
        .me()
        .then((fresh) => {
          if (fresh && typeof fresh === "object") {
            const next = (fresh as { user?: AuthUser }).user ?? fresh;
            setUserState(next);
            setSession(storedToken, next);
          }
        })
        .catch(() => {
          clearSession();
          setToken(null);
          setUserState(null);
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  const applySession = useCallback((data: { token: string; user: AuthUser }) => {
    setSession(data.token, data.user);
    setToken(data.token);
    setUserState(data.user ?? null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.auth.login({ email, password });
      applySession(data);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      password: string;
      referral_code?: string;
    }) => {
      const data = await api.auth.register(input);
      applySession(data);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    clearSession();
    setToken(null);
    setUserState(null);
  }, []);

  const setUser = useCallback(
    (next: AuthUser) => {
      setUserState(next);
      if (token) setSession(token, next);
    },
    [token],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      setUser,
    }),
    [user, token, ready, login, register, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
