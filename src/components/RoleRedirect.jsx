import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function RoleRedirect() {
  const { role, loading } = useAuth()

  // ⛔ TUNGGU ROLE SELESAI
  if (loading || role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    )
  }

  // 🔄 REDIRECT BERDASARKAN ROLE
  if (role === "admin") {
    console.log("🔑 Admin detected, redirecting to /files")
    return <Navigate to="/files" replace />
  }
  
  if (role === "user") {
    console.log("👤 User detected, redirecting to /my-files")
    return <Navigate to="/my-files" replace />
  }

}
