// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ 
  children, 
  adminOnly = false,
  allowedRoles = null 
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-gray-600 mb-4">
          Loading...
        </div>
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 🚫 Belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🔒 ADMIN ONLY CHECK (cara lama tetap jalan)
  if (adminOnly && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // 🔐 ROLE BASED CHECK (cara baru)
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}