"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  role: "controller" | "registral" | "admin" | "teacher";
  defaultRole?: "controller" | "registral" | "admin" | "teacher";
}

export function LoginForm({ role: initialRole, defaultRole }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialRole || defaultRole || "controller");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
        role,
      });

      if (res?.error) {
        setError(res.error);
        setIsSubmitting(false);
      } else {
        // Redirect on success
        if (role === "teacher") {
          router.push("/teachers/dashboard"); // Or wherever the teacher portal will be
        } else if (role === "controller") {
          router.push("/controller");
        } else if (role === "registral") {
          router.push("/dashboard");
        } else if (role === "admin") {
          router.push("/admin");
        }
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Authentication failed"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div className="group">
          <label
            htmlFor="username"
            className="block text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-blue-600 transition-colors duration-200"
          >
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out bg-gray-50/50 hover:bg-white"
              placeholder="Enter your username"
            />
          </div>
        </div>

        <div className="group">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-blue-600 transition-colors duration-200"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out bg-gray-50/50 hover:bg-white"
              placeholder="Enter your password"
            />
          </div>
        </div>

        {initialRole !== "teacher" && (
          <div className="group">
            <label
              htmlFor="role"
              className="block text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-blue-600 transition-colors duration-200"
            >
              Select Role
            </label>
            <div className="relative">
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as "controller" | "registral" | "admin"
                  )
                }
                className="appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out bg-gray-50/50 hover:bg-white"
              >
                <option value="controller">Controller</option>
                <option value="registral">Registral</option>
                <option value="admin">Admin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 animate-fade-in">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing in...
            </div>
          ) : (
            "Sign in"
          )}
        </button>
      </div>
    </form>
  );
}
