"use client";

import { useState, useEffect } from "react";
import { FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface User {
  name: string;
}

interface HeaderProps {
  pageTitle: string;
  userName: string;
  onMenuClick: () => void;
}

export default function Header({
  pageTitle,
  userName,
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <header className="flex-shrink-0 bg-white border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="md:hidden mr-4 text-gray-600"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{pageTitle}</h1>
        </div>
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600">
            Welcome, {session?.user?.name || userName}
          </span>
        </div>
      </div>
    </header>
  );
}
