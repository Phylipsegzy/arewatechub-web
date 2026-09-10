"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, getStoredToken, setToken } from "@/lib/api";
import type { Customer } from "@/types";

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  sessionError: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstname: string;
    lastname: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const router = useRouter();

  const refreshCustomer = async () => {
    if (!getStoredToken()) {
      setCustomer(null);
      return;
    }
    try {
      const data = await api.get<Customer>("/auth/me");
      setCustomer(data);
      setSessionError(false);
    } catch (err) {
      // Only a real 401/403 means the token is actually invalid — clear it.
      // Any other failure (network blip, CORS misfire, server hiccup) must
      // NOT wipe a perfectly good login just because one request failed.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setToken(null);
        setCustomer(null);
      } else {
        setSessionError(true);
      }
    }
  };

  useEffect(() => {
    refreshCustomer().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ customer: Customer; token: string }>("/auth/login", {
      email,
      password,
    });
    setToken(data.token);
    setSessionError(false);
    setCustomer(data.customer);
    router.push("/dashboard");
  };

  const register = async (payload: {
    firstname: string;
    lastname: string;
    email: string;
    phone?: string;
    password: string;
  }) => {
    const data = await api.post<{ customer: Customer; token: string }>(
      "/auth/register",
      payload
    );
    setToken(data.token);
    setCustomer(data.customer);
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setToken(null);
      setCustomer(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{ customer, loading, sessionError, login, register, logout, refreshCustomer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
