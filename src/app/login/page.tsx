"use client";

import { LoginForm } from "@/components/ui/LoginForm";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function LoginPageContent() {
  const { isLoading } = useAuth({
    redirectIfFound: true,
  });

  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError === "AccessDenied") {
      setError("You do not have permission to access this page.");
    } else if (authError) {
      setError("An authentication error occurred. Please try again.");
    }
  }, [searchParams]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="relative w-36 h-36 mb-6 transform hover:scale-105 transition-transform duration-300">
            <Image
              src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-ዳሩል-ሎጎ-150x150.png"
              alt="Darulkubra Logo"
              fill
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to continue
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        )}

        <LoginForm callbackUrl={searchParams.get("callbackUrl") || undefined} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
