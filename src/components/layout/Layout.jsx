import { useState } from "react";
import DashboardSidebar from "../DashboardSidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <DashboardSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Content Area */}
      <main
        className="flex-1 min-h-screen w-full bg-cover bg-center dark:bg-gray-900 md:ml-64"
        style={{ backgroundImage: "url('/images/pelindo2.png')" }}
      >
        {/* Button buka sidebar di mobile */}
        <button
          className="md:hidden m-4 px-3 py-2 bg-blue-600 text-white rounded-lg"
          onClick={() => setSidebarOpen(true)}
        >
          ☰ Menu
        </button>

        <div className="p-6">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
