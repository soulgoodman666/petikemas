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
  Sun,
  X // Tambahkan icon close untuk mobile
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

export default function DashboardSidebar({ onClose }) {
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
    logout();
    navigate("/login", { replace: true });
  };

  const handleNavClick = () => {
    // Tutup sidebar saat menu diklik (hanya di mobile)
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <aside className="
      h-full w-64 md:w-64
      bg-slate-900 text-white
      overflow-y-auto
      flex flex-col
    ">
      {/* Header dengan close button untuk mobile */}
      <div className="p-4 md:p-6 border-b border-slate-700 flex items-center justify-between md:block">
        <div className="flex items-center">
          <img 
            src="/images/fotopelindo.png"
            alt="Pelindo Logo"
            className="h-20 md:h-30 w-auto"
          />
        </div>
        
        {/* Close button hanya untuk mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-slate-700 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 md:p-6 pt-0 md:pt-0">
        <p className="text-xs text-slate-400 mt-1">
          {user?.isAdmin ? 'Admin Panel' : 'User Panel'}
        </p>
        <div className="mt-2">
          <span className={`
            inline-block px-2 py-1 text-xs rounded-full
            ${user?.isAdmin
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
            }`}>
            {user?.isAdmin ? 'ADMIN' : 'USER'}
          </span>
        </div>
      </div>

      {/* Menu dengan touch-friendly sizing */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`
                flex items-center gap-3 
                px-4 py-3 md:py-2 
                rounded-lg transition
                text-sm md:text-base
                min-h-[44px] /* Touch target minimum */
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
          className="
            w-full flex items-center justify-center md:justify-start gap-3 
            px-4 py-3 md:py-2 
            rounded-lg bg-slate-800 hover:bg-slate-700 transition
            min-h-[44px]
          "
        >
          {darkMode ? (
            <>
              <Sun size={18} className="text-yellow-400" />
              <span className="text-sm md:text-base">Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} className="text-blue-400" />
              <span className="text-sm md:text-base">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* User info untuk mobile */}
      <div className="md:hidden px-4 py-3 border-t border-slate-700">
        <div className="text-sm text-slate-300">
          {user?.email && (
            <p className="truncate">{user.email}</p>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-slate-700 px-4 py-3">
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center justify-center md:justify-start gap-3 
            px-4 py-3 md:py-2 
            rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition
            min-h-[44px]
            text-sm md:text-base
          "
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}