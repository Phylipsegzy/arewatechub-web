"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { adminApi, ApiError, getStoredAdminToken, setAdminToken } from "@/lib/adminApi";

interface Admin {
  id: number;
  email: string;
}

interface AdminAuthContextValue {
  admin: Admin | null;
  loading: boolean;
  sessionError: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const router = useRouter();

  function checkSession() {
    if (!getStoredAdminToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSessionError(false);
    adminApi
      .get<Admin>("/admin/me")
      .then(setAdmin)
      .catch((err) => {
        // Only a real 401/403 means the token is actually invalid — clear it.
        // Any other failure (network blip, CORS misfire, server hiccup) must
        // NOT wipe a perfectly good token; that was logging admins out on
        // reload for reasons that had nothing to do with their session.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setAdminToken(null);
          setAdmin(null);
        } else {
          setSessionError(true);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const data = await adminApi.post<{ admin: Admin; token: string }>("/admin/login", { email, password });
    setAdminToken(data.token);
    setAdmin(data.admin);
    setSessionError(false);
    router.push("/admin");
  };

  const logout = async () => {
    try {
      await adminApi.post("/admin/logout");
    } finally {
      setAdminToken(null);
      setAdmin(null);
      router.push("/admin/login");
    }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, sessionError, login, logout, retry: checkSession }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
