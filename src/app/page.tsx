"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FiLogIn, FiBookOpen, FiUsers, FiArrowRight } from "react-icons/fi";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-8">
              <Image
                src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
                alt="Darulkubra Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </motion.div>

          {/* Welcome Message */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Darulkubra
            </span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-700 mb-8"
          >
            Student Management System
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg sm:text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Comprehensive digital platform for managing academies, student
            registration, attendance trackings, payment processings, and
            advanced analytics and more.
          </motion.p>

          {/* Login Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center"
          >
            <Link
              href="/login"
              className="group inline-flex items-center px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg sm:text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              aria-label="Login to Darulkubra Dashboard"
            >
              <FiLogIn className="mr-3 sm:mr-4" size={24} />
              Login
              <FiArrowRight
                className="ml-3 sm:ml-4 group-hover:translate-x-2 transition-transform duration-300"
                size={20}
              />
            </Link>

            <Link
              href="/registration"
              className="group inline-flex items-center px-8 sm:px-12 py-4 sm:py-5 bg-white hover:bg-gray-50 text-gray-700 text-lg sm:text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 transform hover:scale-105"
              aria-label="Register a new student"
            >
              <FiBookOpen className="mr-3 sm:mr-4" size={24} />
              Student Registration
            </Link>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="mt-12 text-center"
          >
            <div className="flex justify-center items-center space-x-8 text-gray-500">
              <div className="flex items-center">
                <FiUsers className="mr-2" size={20} />
                <span className="text-sm sm:text-base">500+ Students</span>
              </div>
              <div className="flex items-center">
                <FiBookOpen className="mr-2" size={20} />
                <span className="text-sm sm:text-base">50+ Teachers</span>
              </div>
              <div className="flex items-center">
                <FiLogIn className="mr-2" size={20} />
                <span className="text-sm sm:text-base">24/7 Access</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
