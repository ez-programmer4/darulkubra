"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Phone,
  Users,
  ArrowRight,
  Shield,
  BookOpen,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ParentLoginPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/parent/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        // Store parent session data
        localStorage.setItem("parentPhone", phone);
        localStorage.setItem("parentChildren", JSON.stringify(data.children));

        // Redirect to dashboard
        router.push("/parent/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        ></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm sm:max-w-md"
      >
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg"
            >
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
            >
              Parent Portal
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 text-base sm:text-lg"
            >
              Track your child's academic journey
            </motion.p>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8"
          >
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">Progress</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">Attendance</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">Secure</p>
            </div>
          </motion.div>

          {/* Login Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onSubmit={handleLogin}
            className="space-y-4 sm:space-y-6"
          >
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-gray-700 text-sm font-medium"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 sm:pl-12 h-12 sm:h-14 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading || !phone.trim()}
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-spin" />
                  <span className="text-sm sm:text-base">Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-sm sm:text-base">Access Portal</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </div>
              )}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 sm:mt-8 text-center"
          >
            <p className="text-gray-500 text-xs sm:text-sm">
              Don't have access? Contact the school to register your phone
              number.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
