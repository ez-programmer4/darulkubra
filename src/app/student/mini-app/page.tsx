"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// TypeScript declaration for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export default function StudentMiniAppRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load Telegram WebApp script if not already loaded
    const loadTelegramScript = () => {
      return new Promise((resolve) => {
        if (window.Telegram?.WebApp) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-web-app.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    };

    const checkTelegramUser = async () => {
      await loadTelegramScript();

      // Wait a bit for Telegram WebApp to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if we're in Telegram WebApp
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        const user = window.Telegram.WebApp.initDataUnsafe?.user;

        if (user?.id) {
          const chatId = user.id.toString();
          // Redirect to the correct URL with chatId
          router.replace(`/student/mini-app/${chatId}`);
          return;
        } else {
          // Try to parse initData to get chatId
          const initData = window.Telegram.WebApp.initData;
          if (initData) {
            // Parse initData to extract user_id
            const params = new URLSearchParams(initData);
            const userParam = params.get("user");

            if (userParam) {
              try {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData.id) {
                  router.replace(`/student/mini-app/${userData.id}`);
                  return;
                }
              } catch (e) {
                console.error("Error parsing user data:", e);
              }
            }
          }
        }

        setError("Unable to get user information from Telegram");
        setLoading(false);
      } else {
        // Not in Telegram WebApp
        setError("This page can only be accessed through the Telegram bot");
        setLoading(false);
      }
    };

    checkTelegramUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loader mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">
            Loading your progress...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">
          Please use the Telegram bot to access your student dashboard.
        </p>
      </div>
    </div>
  );
}
