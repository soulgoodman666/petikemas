import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  Upload,
  FileText,
  Megaphone,
  Moon,
  Sun,
  Folder,
  Users,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

export default function DashboardSidebar({ isOpen, onClose }) {
  const { user, role, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // Menu khusus untuk ADMIN saja
  const adminMenu = [
    { label: 'Files Management', icon: FileText, path: '/files' },
    { label: 'Upload Files', icon: Upload, path: '/upload' },
    { label: 'User Management', icon: Users, path: '/users' },
    { label: 'Announcements', icon: Megaphone, path: '/announcements' },
  ];

  // Menu khusus untuk USER saja
  const userMenu = [
    { label: 'My Files', icon: Folder, path: '/my-files' },
    { label: 'My Profile', icon: User, path: '/profile' },
  ];

  // Tentukan menu mana yang ditampilkan berdasarkan role
  const menuItems = role === "admin" ? adminMenu : userMenu;

  const handleLogout = async () => {
    try {
      console.log("Logout clicked");
      await logout();
      console.log("Logout success");
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (err) {
      console.error("Logout error:", err);
      navigate('/login', { replace: true });
    }
  };

  const userEmail = user?.email || 'User';
  const displayName = userEmail.split('@')[0];

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 flex flex-col z-50 transform transition-transform duration-300
  ${isOpen ? "translate-x-0" : "-translate-x-full"}
  md:translate-x-0
  ${darkMode
          ? 'bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700'
          : 'bg-gradient-to-b from-white to-gray-50 text-gray-800 border-r border-gray-100 shadow-xl'
        }`}
    >
      <button
        className="md:hidden absolute top-4 right-4 text-xl"
        onClick={onClose}
      >
        ✕
      </button>
      {/* Header */}
      <div className={`p-6 border-b transition-colors duration-300
        ${darkMode ? 'border-slate-700/50' : 'border-gray-200/70'}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`rounded-xl p-2.5 transition-all duration-300
            ${darkMode
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/30'
            }`}
          >
            <img
              src="/images/fotopelindo.png"
              alt="Pelindo Logo"
              className="h-8 w-auto brightness-0 invert"
            />
          </div>
          <div>
            <h1 className={`font-bold text-lg tracking-tight transition-colors duration-300
              ${darkMode ? 'text-white' : 'text-gray-800'}`}
            >
              Pelindo File Manager
            </h1>
            <p className={`text-xs font-medium transition-colors duration-300
              ${darkMode ? 'text-slate-400' : 'text-blue-600'}`}
            >
              {role === "admin" ? '⚡ Admin Portal' : '👤 User Portal'}
            </p>
          </div>
        </div>

        {/* User info - Enhanced */}
        <div className={`p-4 rounded-xl transition-all duration-300
          ${darkMode
            ? 'bg-slate-800/80 backdrop-blur-sm border border-slate-700'
            : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${role === "admin"
                ? 'bg-red-500 shadow-red-500/50'
                : 'bg-blue-500 shadow-blue-500/50'
                }`}></div>
              <span className={`text-sm font-semibold transition-colors duration-300
                ${darkMode ? 'text-white' : 'text-gray-700'}`}
              >
                {role === "admin" ? 'Administrator' : 'User Account'}
              </span>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide
              ${role === "admin"
                ? darkMode
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-red-100 text-red-700 border border-red-200'
                : darkMode
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              {role?.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${darkMode
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              }`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <p className={`text-xs truncate font-medium transition-colors duration-300
              ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}
              title={userEmail}
            >
              {displayName}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-2 px-4">
          {/* Menu sesuai role */}
          <div className="mb-2">
            <p className={`text-xs uppercase font-semibold tracking-wider px-2 mb-3 transition-colors duration-300
              ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}
            >
              {role === "admin" ? "Admin Controls" : "My Dashboard"}
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                    ${isActive(item.path)
                      ? darkMode
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/40'
                      : darkMode
                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 hover:shadow-sm'
                    }`}
                >
                  <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive(item.path) ? 'text-white' : ''
                    }`} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Dark Mode Toggle - Enhanced */}
        <div className="px-4 mt-8">
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
              ${darkMode
                ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 hover:shadow-sm'
              }`}
          >
            <div className={`p-1.5 rounded-lg transition-all duration-200 group-hover:scale-110
              ${darkMode
                ? 'bg-yellow-500/20 group-hover:bg-yellow-500/30'
                : 'bg-indigo-100 group-hover:bg-indigo-200'
              }`}
            >
              {darkMode ? (
                <Sun size={16} className="text-yellow-400" />
              ) : (
                <Moon size={16} className="text-indigo-600" />
              )}
            </div>
            <span className="font-medium text-sm">
              {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Logout Button - Enhanced */}
      <div className={`border-t p-4 transition-colors duration-300
        ${darkMode
          ? 'border-slate-700/50 bg-gradient-to-b from-slate-800 to-slate-900'
          : 'border-gray-200/70 bg-gradient-to-b from-gray-50/80 to-white'
        }`}
      >
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group
            ${darkMode
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500/50'
              : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500/50 shadow-sm hover:shadow-md'
            }`}
        >
          <LogOut size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}