"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiLogIn,
  FiBookOpen,
  FiMail,
  FiTwitter,
  FiFacebook,
  FiInstagram,
} from "react-icons/fi";

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-teal-100 overflow-hidden p-4 md:p-8">
      {/* Decorative Background Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200 opacity-30 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-200 opacity-20 rounded-full blur-2xl z-0" />
      <div
        className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-300 opacity-10 rounded-full blur-2xl z-0"
        style={{ transform: "translate(-50%, -50%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-4 md:p-8 border border-blue-100 flex flex-col items-center"
      >
        {/* Header Section */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-teal-400 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            <FiBookOpen size={48} />
          </div>
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 drop-shadow-sm">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
            Darulkubra Quran Academy Center
          </span>
        </h1>
        <p className="text-gray-700 text-lg md:text-xl mb-8 max-w-lg mx-auto font-medium">
          Manage student registrations seamlessly. Log in to access the
          dashboard and start organizing your academy today.
        </p>

        {/* Call to Action */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="mb-6"
        >
          <Link
            href="/login"
            className="inline-flex items-center px-10 py-4 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white text-xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            <FiLogIn className="mr-3" size={24} />
            Login to Get Started
          </Link>
        </motion.div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-10">
          <div className="bg-blue-50 rounded-xl p-4 flex flex-col items-center shadow-sm border border-blue-100">
            <span className="text-blue-500 mb-2">
              <FiBookOpen size={28} />
            </span>
            <span className="font-semibold text-gray-800">
              Easy Registration
            </span>
            <span className="text-gray-500 text-sm mt-1">
              Quickly enroll students and manage their profiles.
            </span>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 flex flex-col items-center shadow-sm border border-blue-100">
            <span className="text-teal-500 mb-2">
              <FiMail size={28} />
            </span>
            <span className="font-semibold text-gray-800">Notifications</span>
            <span className="text-gray-500 text-sm mt-1">
              Stay updated with real-time alerts and reminders.
            </span>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 flex flex-col items-center shadow-sm border border-blue-100">
            <span className="text-blue-400 mb-2">
              <FiLogIn size={28} />
            </span>
            <span className="font-semibold text-gray-800">Secure Access</span>
            <span className="text-gray-500 text-sm mt-1">
              Role-based dashboards for teachers, admins, and more.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <p className="font-medium">
              © {new Date().getFullYear()} Darulkubra Quran Academy
            </p>
            <span className="hidden md:block">•</span>
            <p>
              Need help?{" "}
              <a
                href="mailto:support@darulkubra.com"
                className="text-blue-600 hover:underline font-medium transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <a
              href="https://twitter.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              <FiTwitter size={22} />
            </a>
            <a
              href="https://facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FiFacebook size={22} />
            </a>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-500 hover:text-pink-700 transition-colors"
            >
              <FiInstagram size={22} />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
