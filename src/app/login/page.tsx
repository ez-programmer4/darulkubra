"use client";

import { LoginForm } from "@/components/ui/LoginForm";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { FiShield, FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

function LoginPageContent() {
  const { isLoading } = useAuth({
    redirectIfFound: true,
  });

  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError === "AccessDenied") {
      setError("You do not have permission to access this page.");
    } else if (authError) {
      setError("An authentication error occurred. Please try again.");
    }
  }, [searchParams]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-10 w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-60"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-40 right-20 w-6 h-6 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full opacity-60"
      />
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 3, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-20 left-1/4 w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-60"
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10"
      >
        {/* Logo and Header */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <div className="relative w-32 h-32 mb-6 transform hover:scale-105 transition-transform duration-300">
            <Image
              src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
              alt="Darulkubra Logo"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center text-3xl font-bold text-gray-900 tracking-tight"
          >
            Welcome Back
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-2 text-center text-lg text-gray-600"
          >
            Sign in to your account
          </motion.p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl bg-red-50 p-4 border border-red-200 shadow-sm"
          >
            <div className="flex items-center">
              <FiShield className="w-5 h-5 text-red-500 mr-3" />
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </motion.div>
        )}

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <LoginForm
            callbackUrl={searchParams.get("callbackUrl") || undefined}
          />
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="text-center pt-6 border-t border-gray-100"
        >
          <p className="text-sm text-gray-500">
            Secure access to Darulkubra Academy Management System
          </p>
        </motion.div>
      </motion.div>
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
