"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define AuthUser type locally
export type AuthUser = {
  id: string;
  role: string;
  name?: string;
  username?: string;
  [key: string]: any;
};

interface UseAuthOptions {
  requiredRole?: "admin" | "controller" | "registral" | "teacher";
  redirectTo?: string;
  redirectIfFound?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { requiredRole, redirectTo, redirectIfFound } = options;

  useEffect(() => {
    setLoading(true);
    // If still loading, do nothing
    if (status === "loading") return;

    // If not authenticated and redirectTo is specified
    if (status === "unauthenticated") {
      if (redirectTo) router.push(redirectTo);
      setLoading(false);
      return;
    }

    // If authenticated and redirectIfFound is true
    if (status === "authenticated" && redirectIfFound) {
      const redirectUrl = redirectTo || "/teachers/dashboard";
      router.push(redirectUrl);
      setLoading(false);
      return;
    }

    // If role is required but user doesn't have the required role
    if (
      status === "authenticated" &&
      requiredRole &&
      session?.user?.role !== requiredRole
    ) {
      // Redirect to appropriate login page based on required role
      if (requiredRole === "teacher") {
        router.push("/teachers/login");
      } else {
        router.push("/login");
      }
      setLoading(false);
      return;
    }

    // Fetch full user details from the new API endpoint
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Handle cases where user details fetch fails
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [status, session, router, requiredRole, redirectTo, redirectIfFound]);

  return {
    user,
    isLoading: loading,
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}
