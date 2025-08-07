"use client";

import { LoginForm } from "@/components/ui/LoginForm";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiShield } from "react-icons/fi";

function LoginPageContent() {
  const { isLoading, isAuthenticated } = useAuth({
    redirectIfFound: true,
  });
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Handle authentication errors
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError === "AccessDenied") {
      setError("You do not have permission to access this page.");
    } else if (authError) {
      setError("An authentication error occurred. Please try again.");
    }
  }, [searchParams]);

  // Detect login success via isAuthenticated
  useEffect(() => {
    if (isAuthenticated && !loginSuccess) {
      setLoginSuccess(true);
      // Redirect after 3 seconds to allow logo animation
      setTimeout(() => {
        setLoginSuccess(false); // Relies on useAuth redirectIfFound
      }, 3000);
    }
  }, [isAuthenticated, loginSuccess]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (loginSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360, 0],
            opacity: [1, 1, 0.8],
          }}
          transition={{
            duration: 2.5,
            ease: "easeInOut",
            times: [0, 0.5, 1],
          }}
          className="relative w-24 h-24 sm:w-32 sm:h-32"
        >
          <Image
            src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
            alt="Darulkubra Logo"
            fill
            className="object-contain drop-shadow-2xl"
            priority
          />
        </motion.div>
        <p className="mt-4 text-sm sm:text-base text-gray-600">
          Login successful! Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white/95 backdrop-blur-md p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-white/20">
        {/* Logo and Header */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6">
            <Image
              src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
              alt="Darulkubra Logo"
              fill
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight text-center">
            Welcome Back
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 text-center">
            Sign in to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 sm:p-4 border border-red-200 shadow-sm">
            <div className="flex items-center">
              <FiShield className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 sm:mr-3" />
              <h3 className="text-xs sm:text-sm font-medium text-red-800">
                {error}
              </h3>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div>
          <LoginForm
            callbackUrl={searchParams.get("callbackUrl") || undefined}
          />
        </div>

        {/* Additional Info */}
        <div className="text-center pt-4 sm:pt-6 border-t border-gray-100">
          <p className="text-xs sm:text-sm text-gray-500">
            Secure access to Darulkubra Academy Management System
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
