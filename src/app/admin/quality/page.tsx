"use client";
import React, { useState } from "react";
import { FiList, FiCheckCircle, FiSettings, FiInfo } from "react-icons/fi";
import AdminQualityConfigPage from "./config-ui";
import AdminQualityReviewPage from "./review/page";

export default function AdminQualityTabsPage() {
  const [tab, setTab] = useState<"config" | "review">("config");
  return (
    <div>
      <div className="mb-6 text-blue-700 text-lg">
        Configure feedback categories and review weekly teacher quality in one
        place.
      </div>
      <div className="flex gap-4 mb-8 border-b items-center justify-between">
        <div className="flex gap-4">
          <button
            className={`flex flex-col items-center px-4 py-2 font-semibold text-lg border-b-2 transition-colors focus:outline-none ${
              tab === "config"
                ? "border-blue-600 text-blue-800"
                : "border-transparent text-blue-400 hover:text-blue-700"
            }`}
            onClick={() => setTab("config")}
            aria-label="Switch to Quality Categories"
            title="Manage the feedback categories controllers can use"
          >
            <span className="flex items-center gap-2">
              <FiList /> Quality Categories
            </span>
            <span className="text-xs text-blue-400 mt-1">
              Manage feedback options
            </span>
          </button>
          <button
            className={`flex flex-col items-center px-4 py-2 font-semibold text-lg border-b-2 transition-colors focus:outline-none ${
              tab === "review"
                ? "border-blue-600 text-blue-800"
                : "border-transparent text-blue-400 hover:text-blue-700"
            }`}
            onClick={() => setTab("review")}
            aria-label="Switch to Review Board"
            title="Approve, override, and allocate bonuses for teacher quality each week"
          >
            <span className="flex items-center gap-2">
              <FiCheckCircle /> Review Board
            </span>
            <span className="text-xs text-blue-400 mt-1">
              Approve & manage quality
            </span>
          </button>
        </div>
      </div>
      {tab === "config" ? (
        <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded flex items-start gap-3">
          <FiInfo className="text-blue-500 mt-1" />
          <div>
            <div className="font-semibold text-blue-800 mb-1">
              Quality Categories
            </div>
            <div className="text-sm text-blue-900">
              Add, edit, or remove the positive and negative feedback categories
              that controllers can use when evaluating teachers. These
              categories will appear in the controller feedback form.
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded flex items-start gap-3">
          <FiInfo className="text-blue-500 mt-1" />
          <div>
            <div className="font-semibold text-blue-800 mb-1">Review Board</div>
            <div className="text-sm text-blue-900">
              Review, approve, or override weekly teacher quality ratings. You
              can also allocate bonuses for exceptional performance. Teachers
              with "Bad" quality will appear in a special section for
              review/removal.
            </div>
          </div>
        </div>
      )}
      <div>
        {tab === "config" ? (
          <AdminQualityConfigPage />
        ) : (
          <AdminQualityReviewPage />
        )}
      </div>
    </div>
  );
}
