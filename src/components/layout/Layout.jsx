import DashboardSidebar from "../DashboardSidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex">
      <DashboardSidebar />
      <main
        className="relative ml-64 min-h-screen w-full bg-cover bg-center dark:bg-gray-900"
        style={{
          backgroundImage: "url('/images/pelindo2.png')"
        }}
      >
        <div className="relative p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
