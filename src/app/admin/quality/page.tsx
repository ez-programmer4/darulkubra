"use client";
import React, { useState } from "react";
import { FiList, FiCheckCircle, FiSettings, FiInfo, FiTarget } from "react-icons/fi";
import AdminQualityConfigPage from "./config-ui";
import AdminQualityReviewPage from "./review/page";

export default function AdminQualityTabsPage() {
  const [tab, setTab] = useState<"config" | "review">("config");

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="p-4 bg-black rounded-2xl shadow-lg">
              <FiTarget className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                Quality Management
              </h1>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                Configure feedback categories and review weekly teacher quality
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-gray-50 rounded-2xl p-2 border border-gray-200">
            <div className="flex gap-2">
              <button
                className={`flex-1 flex flex-col items-center px-6 py-4 rounded-xl font-bold transition-all duration-200 ${
                  tab === "config"
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                }`}
                onClick={() => setTab("config")}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FiList className="h-5 w-5" />
                  <span className="text-lg">Quality Categories</span>
                </div>
                <span className="text-sm opacity-80">
                  Manage feedback options
                </span>
              </button>
              <button
                className={`flex-1 flex flex-col items-center px-6 py-4 rounded-xl font-bold transition-all duration-200 ${
                  tab === "review"
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                }`}
                onClick={() => setTab("review")}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FiCheckCircle className="h-5 w-5" />
                  <span className="text-lg">Review Board</span>
                </div>
                <span className="text-sm opacity-80">
                  Approve & manage quality
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FiInfo className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              {tab === "config" ? (
                <>
                  <h2 className="text-2xl font-bold text-black mb-3">Quality Categories</h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Add, edit, or remove the positive and negative feedback categories
                    that controllers can use when evaluating teachers. These
                    categories will appear in the controller feedback form.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-black mb-3">Review Board</h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Review, approve, or override weekly teacher quality ratings. You
                    can also allocate bonuses for exceptional performance. Teachers
                    with "Bad" quality will appear in a special section for
                    review/removal.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            {tab === "config" ? (
              <AdminQualityConfigPage />
            ) : (
              <AdminQualityReviewPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}