import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Download,
  User,
  LogOut,
  Upload,
  FileText,
  Megaphone,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // Menu untuk admin
  const adminMenu = [
    { label: 'Files', icon: FileText, path: '/files' },
    { label: 'Upload File', icon: Upload, path: '/upload' },
    { label: 'Users', icon: User, path: '/users' },
    { label: 'Announcements', icon: Megaphone, path: '/announcements' },
  ];

  // Menu untuk user biasa
  const userMenu = [
    { label: 'Downloads', icon: Download, path: '/downloads' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  const menuItems = user?.isAdmin ? adminMenu : userMenu;

  const handleLogout = () => {
    // Instant logout - langsung pindah ke halaman login
    logout();
    navigate("/login", { replace: true });
  };



  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center">
          <img
            src="/images/fotopelindo.png"
            alt="Pelindo Logo"
            className="h-30 w-auto"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {user?.isAdmin ? 'Admin Panel' : 'User Panel'}
        </p>
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${user?.isAdmin
            ? 'bg-red-600 text-white'
            : 'bg-blue-600 text-white'
            }`}>
            {user?.isAdmin ? 'ADMIN' : 'USER'}
          </span>
        </div>
      </div>

      {/* Menu */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition
                ${isActive(item.path)
                  ? 'bg-blue-600'
                  : 'hover:bg-slate-700'
                }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="border-t border-slate-700 px-4 py-3">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
        >
          {darkMode ? (
            <>
              <Sun size={18} className="text-yellow-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} className="text-blue-400" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Spacer untuk mencegah overlap */}
      <div className="h-16"></div>

      {/* Logout - Fixed di bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900">
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg
                 text-red-400 hover:bg-red-600 hover:text-white transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

    </aside>
  );
}
