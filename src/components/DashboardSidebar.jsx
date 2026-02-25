import React, { useState, useEffect } from 'react';
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
  Home,
  BookOpen,
  ChevronRight,
  Download,
  Settings,
  Info,
  HelpCircle,
  MessageCircle,
  Mail,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { supabase } from '../supabase';
import '../index.css';

export default function DashboardSidebar({ isOpen, onClose }) {
  const { user, role, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State untuk notifikasi pesan
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminData, setAdminData] = useState(null);
  
  // State untuk notifikasi admin (pesan dari user ke admin)
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [usersWithUnread, setUsersWithUnread] = useState([]);
  
  // State untuk menampilkan notifikasi popup
  const [showNotification, setShowNotification] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);
  
  // State untuk tooltip
  const [hoveredItem, setHoveredItem] = useState(null);

  // State untuk menyimpan halaman yang sedang dibuka
  const [currentPage, setCurrentPage] = useState('');

  useEffect(() => {
    if (!user) return;

    // Set current page based on path
    const path = location.pathname;
    if (path.includes('/files')) setCurrentPage('files');
    else if (path.includes('/upload')) setCurrentPage('upload');
    else if (path.includes('/users')) setCurrentPage('users');
    else if (path.includes('/announcements')) setCurrentPage('announcements');
    else if (path.includes('/profile')) setCurrentPage('profile');
    else if (path.includes('/my-files')) setCurrentPage('my-files');
    else setCurrentPage('dashboard');

    // Fetch admin data
    const fetchAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .ilike("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error fetching admin:", error);
          return;
        }

        if (data) {
          setAdminData(data);
        }
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchAdmin();
  }, [user, location.pathname]);

  // Fetch unread messages count untuk user (pesan dari admin ke user)
  const fetchUnreadCount = async () => {
    if (!user || !adminData) return;

    try {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: 'exact', head: true })
        .eq("sender_id", adminData.id)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  // Fetch unread messages untuk admin (pesan dari user ke admin)
  const fetchAdminUnreadMessages = async () => {
    if (!user || role !== "admin") return;

    try {
      // Hitung total pesan belum dibaca ke admin
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: 'exact', head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setAdminUnreadCount(count || 0);

      // Ambil daftar user yang mengirim pesan belum dibaca
      const { data, error: usersError } = await supabase
        .from("messages")
        .select(`
          sender_id,
          sender:sender_id (id, full_name, email, role),
          message,
          created_at
        `)
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Group by sender_id
      const senderMap = new Map();
      data?.forEach(msg => {
        if (!senderMap.has(msg.sender_id)) {
          senderMap.set(msg.sender_id, {
            id: msg.sender_id,
            name: msg.sender?.full_name || msg.sender?.email?.split('@')[0] || 'Unknown',
            email: msg.sender?.email,
            count: 1,
            latestMessage: msg.message,
            latestTime: msg.created_at
          });
        } else {
          const existing = senderMap.get(msg.sender_id);
          existing.count += 1;
        }
      });

      setUsersWithUnread(Array.from(senderMap.values()));
    } catch (err) {
      console.error("Error fetching admin unread messages:", err);
    }
  };

  // Mark messages as read untuk admin
  const markMessagesAsRead = async (senderId = null) => {
    if (!user || role !== "admin") return;

    try {
      let query = supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (senderId) {
        query = query.eq("sender_id", senderId);
      }

      const { error } = await query;

      if (error) throw error;
      
      // Refresh counts
      await fetchAdminUnreadMessages();
      setShowNotification(false);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Mark messages as read untuk user (dari admin)
  const markUserMessagesAsRead = async () => {
    if (!user || !adminData || role === "admin") return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", adminData.id)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      
      setUnreadCount(0);
      setShowNotification(false);
    } catch (err) {
      console.error("Error marking user messages as read:", err);
    }
  };

  // Cek apakah halaman yang sedang dibuka adalah halaman chat
  const isChatPage = () => {
    if (role === "admin") {
      return location.pathname === '/users';
    } else {
      return location.pathname === '/profile';
    }
  };

  // Effect untuk mark as read ketika membuka halaman chat
  useEffect(() => {
    if (!user) return;

    const checkAndMarkAsRead = async () => {
      if (isChatPage()) {
        if (role === "admin" && adminUnreadCount > 0) {
          await markMessagesAsRead();
        } else if (role !== "admin" && unreadCount > 0) {
          await markUserMessagesAsRead();
        }
      }
    };

    checkAndMarkAsRead();
  }, [location.pathname, role, adminUnreadCount, unreadCount]);

  // Real-time subscription untuk messages
  useEffect(() => {
    if (!user) return;

    if (role === "admin") {
      fetchAdminUnreadMessages();
    } else if (adminData) {
      fetchUnreadCount();
    }

    // Subscribe ke semua perubahan messages
    const channel = supabase
      .channel("sidebar-messages-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: role === "admin" 
            ? `receiver_id=eq.${user.id}` // Admin menerima pesan
            : `receiver_id=eq.${user.id}` // User menerima pesan
        },
        (payload) => {
          const newMessage = payload.new;
          
          // Only show notification if not on chat page
          if (!isChatPage()) {
            if (role === "admin") {
              // Admin menerima pesan baru dari user - TAMPIL DI SEMUA HALAMAN ADMIN
              setAdminUnreadCount(prev => prev + 1);
              
              // Fetch sender info
              supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", newMessage.sender_id)
                .single()
                .then(({ data: senderData }) => {
                  setLatestMessage({
                    ...newMessage,
                    senderName: senderData?.full_name || senderData?.email?.split('@')[0] || 'User',
                    type: 'from_user'
                  });
                  setShowNotification(true);
                  
                  // Auto hide after 5 seconds
                  setTimeout(() => {
                    setShowNotification(false);
                  }, 5000);
                });
              
              fetchAdminUnreadMessages();
            } else {
              // User menerima pesan baru dari admin
              if (newMessage.sender_id === adminData?.id) {
                setUnreadCount(prev => prev + 1);
                
                setLatestMessage({
                  ...newMessage,
                  senderName: 'Admin',
                  type: 'from_admin'
                });
                setShowNotification(true);
                
                setTimeout(() => {
                  setShowNotification(false);
                }, 5000);
              }
            }
          } else {
            // If on chat page, mark as read immediately
            if (role === "admin") {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMessage.id)
                .then(() => {
                  fetchAdminUnreadMessages();
                });
            } else if (newMessage.sender_id === adminData?.id) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMessage.id)
                .then(() => {
                  fetchUnreadCount();
                });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: role === "admin" 
            ? `receiver_id=eq.${user.id}` 
            : `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // Ketika pesan diupdate (mark as read), refresh counts
          if (role === "admin") {
            fetchAdminUnreadMessages();
            // Hide notification jika semua sudah dibaca
            if (payload.new.is_read === true) {
              setShowNotification(false);
            }
          } else {
            fetchUnreadCount();
            if (payload.new.is_read === true) {
              setShowNotification(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, adminData, role, location.pathname]);

  const isActive = (path) => location.pathname === path;

  // Menu khusus untuk ADMIN saja dengan notifikasi
  const adminMenu = [
    { 
      label: 'Files Management', 
      icon: FileText, 
      path: '/files',
      description: 'Kelola semua file yang diupload oleh user',
      features: [
        'Lihat semua file',
        'Filter berdasarkan status',
        'Informasi file',
        'Bagikan file ke user'
      ],
      color: 'blue'
    },
    { 
      label: 'Upload Files', 
      icon: Upload, 
      path: '/upload',
      description: 'Upload file baru untuk dibagikan ke user',
      features: [
        'Upload multiple files',
        'Set status public/pribadi',
        'Tambah deskripsi file',
        'Pilih target user'
      ],
      color: 'indigo'
    },
    { 
      label: 'User Management', 
      icon: Users, 
      path: '/users',
      description: 'Kelola semua user dan lihat pesan masuk dari mereka',
      features: [
        'Lihat daftar semua user',
        `${adminUnreadCount} pesan belum dibaca dari ${usersWithUnread.length} user`,
        'Balas pesan dari user',
        'Kelola status user'
      ],
      color: 'purple',
      showNotification: true,
      notificationCount: adminUnreadCount
    },
    { 
      label: 'Announcements', 
      icon: Megaphone, 
      path: '/announcements',
      description: 'Buat dan kelola pengumuman untuk semua user',
      features: [
        'Buat pengumuman baru',
        'Edit pengumuman',
        'Hapus pengumuman',
      ],
      color: 'orange'
    },
  ];

  // Menu khusus untuk USER saja
  const userMenu = [
    { 
      label: 'My Files', 
      icon: Folder, 
      path: '/my-files',
      description: 'Kelola file pribadi dan file yang dibagikan oleh Admin',
      features: [
        'Download file dengan 1 klik',
        'Filter file berdasarkan status',
        'Lihat pengumuman terbaru',
        'Cari file dengan cepat'
      ],
      color: 'blue'
    },
    { 
      label: 'My Profile', 
      icon: User, 
      path: '/profile',
      description: 'Kelola informasi profil anda dan Chat admin',
      features: [
        'Informasi Akun',
        'Chat Admin',
        unreadCount > 0 ? `${unreadCount} pesan baru dari admin` : 'Tidak ada pesan baru'
      ],
      color: 'green',
      showNotification: true,
      notificationCount: unreadCount
    },
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

  // Handle click pada notifikasi popup
  const handleNotificationClick = () => {
    setShowNotification(false);
    
    if (role === "admin") {
      navigate('/users');
      if (latestMessage) {
        markMessagesAsRead(latestMessage.sender_id);
      }
    } else {
      navigate('/profile');
      markUserMessagesAsRead();
    }
  };

  // Komponen Notifikasi Popup
  const NotificationPopup = () => {
    if (!showNotification || !latestMessage) return null;

    const isFromAdmin = latestMessage.type === 'from_admin';
    const bgColor = isFromAdmin 
      ? darkMode ? 'bg-blue-900' : 'bg-blue-50'
      : darkMode ? 'bg-purple-900' : 'bg-purple-50';
    const borderColor = isFromAdmin
      ? darkMode ? 'border-blue-700' : 'border-blue-200'
      : darkMode ? 'border-purple-700' : 'border-purple-200';
    const textColor = isFromAdmin
      ? darkMode ? 'text-blue-300' : 'text-blue-700'
      : darkMode ? 'text-purple-300' : 'text-purple-700';

    // Tentukan halaman tujuan berdasarkan role
    const targetPage = role === "admin" ? '/users' : '/profile';
    const pageName = role === "admin" ? 'User Management' : 'My Profile';

    return (
      <div className="fixed top-20 right-6 z-[1000] animate-slide-in cursor-pointer" onClick={handleNotificationClick}>
        <div className={`${bgColor} ${borderColor} border rounded-xl shadow-2xl p-4 w-80 backdrop-blur-sm hover:shadow-xl transition-shadow`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${isFromAdmin ? 'bg-blue-500' : 'bg-purple-500'} bg-opacity-20`}>
              <Bell className={`w-5 h-5 ${isFromAdmin ? 'text-blue-500' : 'text-purple-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Pesan Baru {isFromAdmin ? 'dari Admin' : 'dari User'}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotification(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight size={16} className="transform rotate-180" />
                </button>
              </div>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">{latestMessage.senderName}</span>: {latestMessage.message?.substring(0, 50)}
                {latestMessage.message?.length > 50 && '...'}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] ${textColor}`}>
                  {new Date(latestMessage.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className={`text-[10px] font-medium ${textColor} hover:underline flex items-center gap-1`}>
                  Buka {pageName}
                  <ChevronRight size={10} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tooltip component
  const Tooltip = ({ item, isVisible }) => {
    if (!isVisible || !item.description) return null;

    const colors = {
      blue: {
        bg: darkMode ? 'bg-blue-900' : 'bg-white',
        border: darkMode ? 'border-blue-700' : 'border-blue-200',
        headerBg: darkMode ? 'bg-blue-800/50' : 'bg-blue-50',
        text: darkMode ? 'text-blue-300' : 'text-blue-700',
        icon: 'text-blue-500',
        shadow: darkMode ? 'shadow-blue-900/20' : 'shadow-blue-500/20'
      },
      green: {
        bg: darkMode ? 'bg-green-900' : 'bg-white',
        border: darkMode ? 'border-green-700' : 'border-green-200',
        headerBg: darkMode ? 'bg-green-800/50' : 'bg-green-50',
        text: darkMode ? 'text-green-300' : 'text-green-700',
        icon: 'text-green-500',
        shadow: darkMode ? 'shadow-green-900/20' : 'shadow-green-500/20'
      },
      purple: {
        bg: darkMode ? 'bg-purple-900' : 'bg-white',
        border: darkMode ? 'border-purple-700' : 'border-purple-200',
        headerBg: darkMode ? 'bg-purple-800/50' : 'bg-purple-50',
        text: darkMode ? 'text-purple-300' : 'text-purple-700',
        icon: 'text-purple-500',
        shadow: darkMode ? 'shadow-purple-900/20' : 'shadow-purple-500/20'
      },
      indigo: {
        bg: darkMode ? 'bg-indigo-900' : 'bg-white',
        border: darkMode ? 'border-indigo-700' : 'border-indigo-200',
        headerBg: darkMode ? 'bg-indigo-800/50' : 'bg-indigo-50',
        text: darkMode ? 'text-indigo-300' : 'text-indigo-700',
        icon: 'text-indigo-500',
        shadow: darkMode ? 'shadow-indigo-900/20' : 'shadow-indigo-500/20'
      },
      orange: {
        bg: darkMode ? 'bg-orange-900' : 'bg-white',
        border: darkMode ? 'border-orange-700' : 'border-orange-200',
        headerBg: darkMode ? 'bg-orange-800/50' : 'bg-orange-50',
        text: darkMode ? 'text-orange-300' : 'text-orange-700',
        icon: 'text-orange-500',
        shadow: darkMode ? 'shadow-orange-900/20' : 'shadow-orange-500/20'
      }
    };

    const colorScheme = colors[item.color] || colors.blue;

    return (
      <div 
        className={`fixed z-[100] w-80 rounded-xl shadow-2xl border overflow-hidden
          ${colorScheme.bg} ${colorScheme.border} ${colorScheme.shadow}`}
        style={{ 
          left: '260px',
          top: hoveredItem?.position?.top || '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      >
        <div className={`px-4 py-3 ${colorScheme.headerBg} border-b ${colorScheme.border}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colorScheme.bg} bg-opacity-20`}>
              <item.icon size={16} className={colorScheme.icon} />
            </div>
            <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {item.label}
            </h4>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${colorScheme.bg} bg-opacity-20 ${colorScheme.text}`}>
              Fitur
            </span>
          </div>
        </div>
        
        <div className="p-4">
          <p className={`text-xs mb-3 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {item.description}
          </p>
          
          <div className="space-y-2">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              ✨ Fitur Utama:
            </p>
            {item.features?.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center
                  ${colorScheme.bg} bg-opacity-20`}
                >
                  <ChevronRight size={10} className={colorScheme.icon} />
                </div>
                <span className={`text-[11px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Notifikasi detail untuk admin - TAMPIL DI SEMUA HALAMAN ADMIN */}
          {role === "admin" && adminUnreadCount > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed border-purple-200 dark:border-purple-800">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  📬 Pesan Masuk ({adminUnreadCount}):
                </p>
                {usersWithUnread.slice(0, 3).map((sender, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                      {sender.name}
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 rounded-full text-[10px]">
                      {sender.count} pesan
                    </span>
                  </div>
                ))}
                {usersWithUnread.length > 3 && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    +{usersWithUnread.length - 3} user lainnya
                  </p>
                )}
                <Link
                  to="/users"
                  className="block text-center text-[10px] mt-2 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Lihat semua pesan →
                </Link>
              </div>
            </div>
          )}

          {/* Notifikasi untuk user */}
          {role !== "admin" && unreadCount > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                <MessageCircle size={14} className="text-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  {unreadCount} pesan baru dari admin menunggu!
                </span>
              </div>
            </div>
          )}

          <div className={`mt-3 pt-3 border-t text-[9px] grid grid-cols-2 gap-2
            ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className={`flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <HelpCircle size={8} />
              <span>Hover untuk info</span>
            </div>
            <div className={`flex items-center gap-1 justify-end ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>Klik untuk buka</span>
              <ChevronRight size={8} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 flex flex-col z-40 transform transition-transform duration-300
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

          {/* User info dengan notifikasi badge - TAMPIL DI SEMUA HALAMAN */}
          <div className={`p-4 rounded-xl transition-all duration-300 relative
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
              
              {/* Global notification badge di user info - TAMPIL DI SEMUA HALAMAN */}
              {(role === "admin" ? adminUnreadCount > 0 : unreadCount > 0) && (
                <div className="relative">
                  <Bell size={16} className="text-yellow-500 animate-pulse" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">
                    {role === "admin" ? adminUnreadCount : unreadCount}
                  </span>
                </div>
              )}
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

            {/* Total unread summary - TAMPIL DI SEMUA HALAMAN */}
            {(role === "admin" ? adminUnreadCount > 0 : unreadCount > 0) && (
              <div className={`mt-2 pt-2 text-[10px] border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <span className={darkMode ? 'text-yellow-500' : 'text-orange-600'}>
                  {role === "admin" 
                    ? `${adminUnreadCount} pesan belum dibaca dari ${usersWithUnread.length} user`
                    : `${unreadCount} pesan baru dari admin`
                  }
                </span>
                <Link
                  to={role === "admin" ? '/users' : '/profile'}
                  className="block text-center text-[10px] mt-1 text-blue-500 hover:underline"
                  onClick={() => {
                    if (role === "admin" && adminUnreadCount > 0) {
                      markMessagesAsRead();
                    } else if (role !== "admin" && unreadCount > 0) {
                      markUserMessagesAsRead();
                    }
                  }}
                >
                  Lihat pesan →
                </Link>
              </div>
            )}
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
                const hasTooltip = item.description;
                const showBadge = item.showNotification && item.notificationCount > 0;
                
                return (
                  <div key={item.path} className="relative">
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                        ${isActive(item.path)
                          ? darkMode
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/40'
                          : darkMode
                            ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 hover:shadow-sm'
                        }`}
                      onMouseEnter={(e) => {
                        if (hasTooltip) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredItem({
                            ...item,
                            position: {
                              top: rect.top + rect.height / 2
                            }
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive(item.path) ? 'text-white' : ''
                        }`} />
                      <span className="font-medium text-sm">{item.label}</span>
                      
                      {/* NOTIFIKASI BADGE - HILANG OTOMATIS SETELAH DIBACA */}
                      {showBadge && (
                        <div className="relative ml-auto">
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full animate-pulse shadow-lg shadow-red-500/50">
                            {item.notificationCount > 9 ? '9+' : item.notificationCount}
                          </span>
                        </div>
                      )}
                      
                      {/* Info icon untuk indikator ada tooltip */}
                      {hasTooltip && !showBadge && !isActive(item.path) && (
                        <div className={`ml-auto p-0.5 rounded-full transition-all
                          ${darkMode ? 'bg-gray-700 group-hover:bg-gray-600' : 'bg-gray-200 group-hover:bg-gray-300'}`}
                        >
                          <Info size={10} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Dark Mode Toggle */}
          <div className="px-4 mt-4">
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

        {/* Logout Button */}
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

        {/* Tooltip */}
        <Tooltip item={hoveredItem} isVisible={!!hoveredItem} />
      </aside>

      {/* Notification Popup - MUNCUL DI SEMUA HALAMAN */}
      <NotificationPopup />
    </>
  );
}