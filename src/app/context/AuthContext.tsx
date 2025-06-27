"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: string;
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const text = await response.text(); // Read once as text
      console.log("Response status:", response.status);
      console.log("Response text:", text);

      if (response.status === 401 || response.status === 403) {
        setUser(null);
        setError(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = JSON.parse(text);
        if (!data.user) {
          throw new Error("No user data received");
        }
        setUser(data.user);
        setError(null);
      } else {
        throw new Error("Invalid content type, expected JSON");
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setError(err instanceof Error ? err.message : "Authentication error");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: AuthUser) => {
    setUser(userData);
    setError(null);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = { user, loading, error, checkAuth, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
