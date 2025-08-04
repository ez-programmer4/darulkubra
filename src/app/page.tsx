"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
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
  FiSmartphone,
  FiUserCheck,
  FiZap,
  FiCheckCircle,
  FiTrendingUp,
  FiAward,
  FiDatabase,
  FiGlobe,
  FiArrowRight,
  FiStar,
} from "react-icons/fi";

export default function Home() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, 50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  const features = [
    {
      icon: <FiUsers className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Student Management",
      description:
        "Comprehensive student registration, profiles, and progress tracking with advanced analytics",
    },
    {
      icon: <FiCalendar className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Attendance Tracking",
      description:
        "Real-time attendance monitoring with detailed analytics, reports, and automated notifications",
    },
    {
      icon: <FiDollarSign className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Payment Management",
      description:
        "Secure payment processing, fee tracking, financial reporting, and automated billing",
    },
    {
      icon: <FiBarChart className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Analytics Dashboard",
      description:
        "Advanced analytics and insights for data-driven decision making and performance optimization",
    },
    {
      icon: <FiShield className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Role-Based Access",
      description:
        "Secure role-based access control for admins, teachers, controllers, and students",
    },
    {
      icon: <FiSmartphone className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Mobile Responsive",
      description:
        "Fully responsive design that works seamlessly on all devices with native-like experience",
    },
  ];

  const stats = [
    {
      number: "500+",
      label: "Students Enrolled",
      icon: <FiUsers className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
    {
      number: "50+",
      label: "Expert Teachers",
      icon: <FiUserCheck className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
    {
      number: "95%",
      label: "Attendance Rate",
      icon: <FiCheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
    {
      number: "24/7",
      label: "System Availability",
      icon: <FiZap className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
  ];

  const benefits = [
    {
      icon: <FiTrendingUp className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Improved Efficiency",
      description:
        "Streamlined processes reduce administrative workload by 60% and improve productivity",
    },
    {
      icon: <FiAward className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Quality Education",
      description:
        "Enhanced tracking ensures consistent educational quality and better learning outcomes",
    },
    {
      icon: <FiDatabase className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Data Security",
      description:
        "Enterprise-grade security protects all student information with encryption and backups",
    },
    {
      icon: <FiGlobe className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Global Access",
      description:
        "Access your academy management system from anywhere in the world with cloud technology",
    },
  ];

  const testimonials = [
    {
      name: "Ahmed Hassan",
      role: "Academy Director",
      content:
        "Darulkubra has transformed how we manage our Quran academy. The attendance tracking and payment management features are exceptional.",
      rating: 5,
    },
    {
      name: "Fatima Ali",
      role: "Senior Teacher",
      content:
        "The student management system is intuitive and comprehensive. It has significantly improved our teaching efficiency.",
      rating: 5,
    },
    {
      name: "Omar Khalil",
      role: "Controller",
      content:
        "The analytics dashboard provides valuable insights that help us make data-driven decisions for our academy.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div
          style={{ y: y1, opacity }}
          className="absolute top-0 left-0 w-96 h-96 bg-indigo-200 opacity-20 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: y2, opacity }}
          className="absolute top-1/2 right-0 w-80 h-80 bg-teal-200 opacity-20 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: y1, opacity }}
          className="absolute bottom-0 left-1/2 w-64 h-64 bg-blue-200 opacity-20 rounded-full blur-2xl"
        />

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-10 w-4 h-4 bg-indigo-400 rounded-full opacity-60"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 right-20 w-6 h-6 bg-teal-400 rounded-full opacity-60"
        />
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 left-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-60"
        />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in"
          >
            {/* Logo and Title */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-8"
            >
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 sm:mb-8">
                <Image
                  src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
                  alt="Darulkubra Logo"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-indigo-900 mb-6 tracking-tight"
            >
              Welcome to <span className="text-indigo-600">Darulkubra</span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl sm:text-2xl font-semibold text-indigo-900 mb-6 sm:mb-8"
            >
              Quran Academy Management System
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-sm sm:text-base text-indigo-700 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Comprehensive digital platform for managing Quran academies,
              student registrations, attendance tracking, payment processing,
              and advanced analytics. Streamline your academy operations with
              our professional management solution.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12 sm:mb-16"
            >
              <Link
                href="/login"
                className="group relative inline-flex items-center px-8 sm:px-10 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
                aria-label="Login to Darulkubra Dashboard"
              >
                <FiLogIn
                  className="mr-2 sm:mr-3 group-hover:rotate-12 transition-transform duration-300"
                  size={20}
                />
                Login to Dashboard
                <FiArrowRight
                  className="ml-2 sm:ml-3 group-hover:translate-x-2 transition-transform duration-300"
                  size={16}
                />
              </Link>

              <Link
                href="/registration"
                className="group inline-flex items-center px-8 sm:px-10 py-3 sm:py-4 bg-white hover:bg-indigo-50 text-indigo-700 text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-indigo-200 hover:border-indigo-300 transform hover:scale-105"
                aria-label="Register a new student"
              >
                <FiBookOpen
                  className="mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300"
                  size={20}
                />
                Student Registration
              </Link>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-6 h-10 border-2 border-indigo-400 rounded-full flex justify-center"
              >
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1 h-3 bg-indigo-400 rounded-full mt-2"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 sm:my-8 animate-slide-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105">
                  {stat.icon}
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-indigo-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base text-indigo-700 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 sm:my-8 animate-slide-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mb-4 sm:mb-6">
              Comprehensive Management Features
            </h2>
            <p className="text-sm sm:text-base text-indigo-700 max-w-4xl mx-auto leading-relaxed">
              Our platform provides everything you need to efficiently manage
              your Quran academy with advanced technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white border border-indigo-100 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-3 group-hover:text-indigo-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-indigo-700 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 sm:my-8 animate-slide-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mb-4 sm:mb-6">
              Why Choose Darulkubra?
            </h2>
            <p className="text-sm sm:text-base text-indigo-700 max-w-4xl mx-auto leading-relaxed">
              Experience the benefits of our comprehensive academy management
              solution designed for modern education
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-start space-x-4 sm:space-x-6 p-6 sm:p-8 rounded-2xl hover:bg-indigo-50 transition-all duration-300 group"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-2 sm:mb-3 group-hover:text-indigo-600 transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-sm sm:text-base text-indigo-700 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 sm:my-8 animate-slide-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mb-4 sm:mb-6">
              What Our Users Say
            </h2>
            <p className="text-sm sm:text-base text-indigo-700 max-w-4xl mx-auto leading-relaxed">
              Join hundreds of satisfied academy directors and teachers who
              trust Darulkubra
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white border border-indigo-100 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FiStar
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-indigo-700 leading-relaxed mb-4 sm:mb-6">
                  "{testimonial.content}"
                </p>
                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-indigo-900">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm sm:text-base text-indigo-700">
                    {testimonial.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-16 sm:py-20 bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 sm:my-8 animate-slide-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mb-4 sm:mb-6">
              Get Started Today
            </h2>
            <p className="text-sm sm:text-base text-indigo-700 max-w-4xl mx-auto leading-relaxed">
              Join hundreds of academies already using our platform to transform
              their operations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto"
          >
            <Link
              href="/login"
              className="group bg-white border border-indigo-100 rounded-2xl p-6 sm:p-8 text-center hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
              aria-label="Admin login to dashboard"
            >
              <FiUsers className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 mx-auto mb-4 sm:mb-6 group-hover:scale-105 transition-transform duration-300" />
              <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-3 sm:mb-4 group-hover:text-indigo-600 transition-colors">
                Admin Login
              </h3>
              <p className="text-sm sm:text-base text-indigo-700 mb-4 sm:mb-6">
                Access your academy dashboard with full administrative controls
              </p>
              <div className="inline-flex items-center text-indigo-600 group-hover:text-indigo-700 transition-colors">
                <span>Get Started</span>
                <FiArrowRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </Link>

            <Link
              href="/registration"
              className="group bg-white border border-indigo-100 rounded-2xl p-6 sm:p-8 text-center hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
              aria-label="Register a new student"
            >
              <FiBookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 mx-auto mb-4 sm:mb-6 group-hover:scale-105 transition-transform duration-300" />
              <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-3 sm:mb-4 group-hover:text-indigo-600 transition-colors">
                Student Registration
              </h3>
              <p className="text-sm sm:text-base text-indigo-700 mb-4 sm:mb-6">
                Register new students with our streamlined enrollment process
              </p>
              <div className="inline-flex items-center text-indigo-600 group-hover:text-indigo-700 transition-colors">
                <span>Register Now</span>
                <FiArrowRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </Link>

            <Link
              href="/contact"
              className="group bg-white border border-indigo-100 rounded-2xl p-6 sm:p-8 text-center hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
              aria-label="Contact support team"
            >
              <FiMail className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 mx-auto mb-4 sm:mb-6 group-hover:scale-105 transition-transform duration-300" />
              <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-3 sm:mb-4 group-hover:text-indigo-600 transition-colors">
                Contact Support
              </h3>
              <p className="text-sm sm:text-base text-indigo-700 mb-4 sm:mb-6">
                Get help and support from our dedicated customer service team
              </p>
              <div className="inline-flex items-center text-indigo-600 group-hover:text-indigo-700 transition-colors">
                <span>Contact Us</span>
                <FiArrowRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/95 backdrop-blur-md border border-indigo-100 shadow-lg rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 sm:my-8 py-16 sm:py-20 animate-slide-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6 sm:mb-8">
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 mr-4 sm:mr-6">
                  <Image
                    src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
                    alt="Darulkubra Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-900">
                    Darulkubra
                  </h3>
                  <p className="text-sm sm:text-base text-indigo-700">
                    Quran Academy Management System
                  </p>
                </div>
              </div>
              <p className="text-sm sm:text-base text-indigo-700 mb-6 sm:mb-8 max-w-lg leading-relaxed">
                Comprehensive digital platform for managing Quran academies with
                advanced features for student management, attendance tracking,
                and financial reporting. Transform your academy operations with
                our professional management solution.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://twitter.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                  aria-label="Follow us on Twitter"
                >
                  <FiTwitter size={20} />
                </a>
                <a
                  href="https://facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                  aria-label="Follow us on Facebook"
                >
                  <FiFacebook size={20} />
                </a>
                <a
                  href="https://instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                  aria-label="Follow us on Instagram"
                >
                  <FiInstagram size={20} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-4 sm:mb-6">
                Quick Links
              </h4>
              <ul className="space-y-3 sm:space-y-4">
                <li>
                  <Link
                    href="/login"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/registration"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Registration
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-4 sm:mb-6">
                Support
              </h4>
              <ul className="space-y-3 sm:space-y-4">
                <li>
                  <Link
                    href="/help"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm sm:text-base text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-indigo-200 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center">
            <p className="text-sm sm:text-base text-indigo-700">
              © {new Date().getFullYear()} Darulkubra Quran Academy. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
