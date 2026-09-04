import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "ENTRAINEUR" | "CONSEILLER" | "MEMBRE";
  plan: string;
  avatarColor: string;
  bio?: string | null;
  phone?: string | null;
  intervenantProfile?: {
    specialty: string;
    hourlyRate: number;
    rating: number;
    sessionsCount: number;
    score: number;
  } | null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("mouvplus_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      localStorage.removeItem("mouvplus_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("mouvplus_token", res.data.token);
    setUser(res.data.user);
  }

  async function register(data: any) {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("mouvplus_token", res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem("mouvplus_token");
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
