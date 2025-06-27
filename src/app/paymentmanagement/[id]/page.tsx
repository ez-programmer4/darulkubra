"use client";
import { useParams, useRouter } from "next/navigation";
import PaymentManagement from "../../components/PaymentManagement";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function PaymentManagementPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        console.log("Auth/me response status:", res.status);
        console.log(
          "Auth/me response headers:",
          Object.fromEntries(res.headers)
        );
        const userData = await res.json();
        console.log("Auth/me response data:", userData);

        if (!res.ok) throw new Error("Failed to fetch user");

        // Access the role from userData.user
        if (!userData.user || userData.user.role !== "controller") {
          console.log("User data or role check failed:", userData.user);
          throw new Error("Unauthorized access");
        }

        setUser(userData.user); // Set the nested user object
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(err.message);
        toast.error("Authentication failed - redirecting to login");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">Student ID not found</p>
          <button
            onClick={() => router.push("/controller")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  return <PaymentManagement studentId={Number(id)} user={user} />;
}
