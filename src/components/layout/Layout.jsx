import { useState } from "react";
import DashboardSidebar from "../DashboardSidebar";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react"; // Tambahkan icon untuk toggle

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Mobile Toggle Button - hanya muncul di mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay untuk mobile saat sidebar terbuka */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar dengan kondisi responsif */}
      <div
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0
          fixed md:relative
          top-0 left-0
          h-full
          z-40
          transition-transform duration-300 ease-in-out
        `}
      >
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main
        className="
          flex-1
          w-full
          min-h-screen
          bg-cover bg-center bg-gray-100 dark:bg-gray-900
          md:ml-64
        "
        style={{
          backgroundImage: "url('/images/pelindo2.png')",
        }}
      >
        <div className="relative p-4 md:p-6 pt-16 md:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}