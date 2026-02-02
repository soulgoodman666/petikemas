import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-4 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin only page
  if (adminOnly && !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 6h2a2 2 0 012 2v2a2 2 0 01-2-2H3a2 2 0 00-2 2v2a2 2 0 012 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Akses Ditolak
            </h2>
            <p className="text-gray-600 mb-6">
              Halaman ini hanya dapat diakses oleh admin.
            </p>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
