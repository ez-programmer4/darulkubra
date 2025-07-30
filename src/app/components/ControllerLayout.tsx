"use client";

import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import ControllerSidebar from "./ControllerSidebar";

export default function ControllerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-50 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900 text-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-3">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <FiX className="h-6 w-6 text-white" />
              </button>
            </div>
            <ControllerSidebar />
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <aside className="hidden md:flex md:flex-shrink-0 h-screen sticky top-0">
        <div className="w-72 bg-gray-900 text-white h-screen sticky top-0 overflow-y-auto">
          <ControllerSidebar />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with hamburger menu */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <FiMenu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Controller Panel
            </h1>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
