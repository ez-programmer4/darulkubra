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
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiBarChart,
  FiShield,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiTrendingUp,
  FiAward,
  FiStar,
  FiBook,
  FiUserCheck,
  FiSettings,
  FiDatabase,
  FiSmartphone,
  FiGlobe,
  FiZap,
} from "react-icons/fi";

export default function Home() {
  const features = [
    {
      icon: <FiUsers className="w-8 h-8" />,
      title: "Student Management",
      description:
        "Comprehensive student registration, profiles, and progress tracking",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      icon: <FiCalendar className="w-8 h-8" />,
      title: "Attendance Tracking",
      description:
        "Real-time attendance monitoring with detailed analytics and reports",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      icon: <FiDollarSign className="w-8 h-8" />,
      title: "Payment Management",
      description:
        "Secure payment processing, fee tracking, and financial reporting",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      icon: <FiBarChart className="w-8 h-8" />,
      title: "Analytics Dashboard",
      description:
        "Advanced analytics and insights for data-driven decision making",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      icon: <FiShield className="w-8 h-8" />,
      title: "Role-Based Access",
      description:
        "Secure role-based access control for admins, teachers, and controllers",
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      icon: <FiSmartphone className="w-8 h-8" />,
      title: "Mobile Responsive",
      description:
        "Fully responsive design that works seamlessly on all devices",
      color: "from-teal-500 to-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
    },
  ];

  const stats = [
    { number: "500+", label: "Students Enrolled", icon: <FiUsers /> },
    { number: "50+", label: "Expert Teachers", icon: <FiUserCheck /> },
    { number: "95%", label: "Attendance Rate", icon: <FiCheckCircle /> },
    { number: "24/7", label: "System Availability", icon: <FiZap /> },
  ];

  const benefits = [
    {
      icon: <FiTrendingUp />,
      title: "Improved Efficiency",
      description:
        "Streamlined processes reduce administrative workload by 60%",
    },
    {
      icon: <FiAward />,
      title: "Quality Education",
      description: "Enhanced tracking ensures consistent educational quality",
    },
    {
      icon: <FiDatabase />,
      title: "Data Security",
      description: "Enterprise-grade security protects all student information",
    },
    {
      icon: <FiGlobe />,
      title: "Global Access",
      description:
        "Access your academy management system from anywhere in the world",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 opacity-20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-indigo-200 opacity-20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-purple-200 opacity-20 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Logo and Title */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white mx-auto">
                <FiBookOpen size={48} />
              </div>
            </motion.div>

            <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Welcome to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Darulkubra
              </span>
            </h1>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-700 mb-8">
              Quran Academy Management System
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Comprehensive digital platform for managing Quran academies,
              student registrations, attendance tracking, payment processing,
              and advanced analytics. Streamline your academy operations with
              our professional management solution.
            </p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/login"
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                <FiLogIn
                  className="mr-3 group-hover:rotate-12 transition-transform"
                  size={24}
                />
                Login to Dashboard
              </Link>
              <Link
                href="/registration"
                className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 transform hover:scale-105"
              >
                <FiBookOpen className="mr-3" size={24} />
                Student Registration
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {stat.icon}
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Comprehensive Management Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform provides everything you need to efficiently manage
              your Quran academy
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`${feature.bgColor} ${feature.borderColor} border-2 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2`}
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-r ${feature.color} text-white rounded-xl flex items-center justify-center mb-6 shadow-lg`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Why Choose Darulkubra?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the benefits of our comprehensive academy management
              solution
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-start space-x-4 p-6 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Get Started Today
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Join hundreds of academies already using our platform
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            <Link
              href="/login"
              className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
            >
              <FiUsers className="w-12 h-12 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Admin Login</h3>
              <p className="text-blue-100">Access your academy dashboard</p>
            </Link>

            <Link
              href="/registration"
              className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
            >
              <FiBookOpen className="w-12 h-12 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">
                Student Registration
              </h3>
              <p className="text-blue-100">Register new students</p>
            </Link>

            <Link
              href="/contact"
              className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
            >
              <FiMail className="w-12 h-12 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">
                Contact Support
              </h3>
              <p className="text-blue-100">Get help and support</p>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-xl flex items-center justify-center mr-4">
                  <FiBookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Darulkubra</h3>
                  <p className="text-gray-400">
                    Quran Academy Management System
                  </p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Comprehensive digital platform for managing Quran academies with
                advanced features for student management, attendance tracking,
                and financial reporting.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://twitter.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-colors"
                >
                  <FiTwitter size={20} />
                </a>
                <a
                  href="https://facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-colors"
                >
                  <FiFacebook size={20} />
                </a>
                <a
                  href="https://instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-pink-600 text-white rounded-lg flex items-center justify-center transition-colors"
                >
                  <FiInstagram size={20} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/login"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/registration"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Registration
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/help"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Darulkubra Quran Academy. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
