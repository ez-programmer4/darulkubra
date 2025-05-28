"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiLogIn, FiBookOpen } from "react-icons/fi";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        {/* Header Section */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <FiBookOpen size={40} />
          </div>
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Welcome to Darulkubra Quran Academy
        </h1>
        <p className="text-gray-600 text-lg md:text-xl mb-8 max-w-lg mx-auto">
          Manage student registrations seamlessly. Log in to access the
          dashboard and start organizing your academy today.
        </p>

        {/* Call to Action */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/login"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white text-lg font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            <FiLogIn className="mr-2" />
            Login to Get Started
          </Link>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 text-sm text-gray-600">
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
        </div>
      </motion.div>
    </div>
  );
}
