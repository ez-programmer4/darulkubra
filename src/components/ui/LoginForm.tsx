"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type UserRole = "controller" | "registral" | "admin" | "teacher";

interface LoginFormProps {
  defaultRole?: UserRole;
  hideRoleSelect?: boolean;
  callbackUrl?: string;
}

export function LoginForm({
  defaultRole,
  hideRoleSelect,
  callbackUrl,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole || "controller");
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
        // Redirect based on role if no callbackUrl is provided
        if (!callbackUrl) {
          if (role === "teacher") {
            router.push("/teachers/dashboard");
          } else if (role === "controller") {
            router.push("/controller");
          } else if (role === "registral") {
            router.push("/dashboard");
          } else if (role === "admin") {
            router.push("/admin");
          }
        } else {
          router.push(callbackUrl);
        }
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Authentication failed"
      );
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (value: string) => {
    setRole(value as UserRole);
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div className="group">
          <Label
            htmlFor="username"
            className="block text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-blue-600 transition-colors duration-200"
          >
            Username
          </Label>
          <div className="relative">
            <Input
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
          <Label
            htmlFor="password"
            className="block text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-blue-600 transition-colors duration-200"
          >
            Password
          </Label>
          <div className="relative">
            <Input
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

        {!hideRoleSelect && (
          <div className="group">
            <Label
              htmlFor="role"
              className="block text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-blue-600 transition-colors duration-200"
            >
              Select Role
            </Label>
            <div className="relative">
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="controller">Controller</SelectItem>
                  <SelectItem value="registral">Registral</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 animate-fade-in">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <Button
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
        </Button>
      </div>
    </form>
  );
}
