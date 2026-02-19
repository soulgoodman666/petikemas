import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { supabase } from "../../supabase";
import {
  User, Mail, Calendar, Phone, Building, MapPin,
  Edit2, Save, X, Shield, CheckCircle,
  Briefcase, Globe, UserCircle, Key, Users, MessageCircle,
  Send, Bell, Trash2, CheckCheck
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({
    memberSince: '',
    accountStatus: 'Aktif'
  });
  const [joinDate, setJoinDate] = useState('');

  // State untuk notifikasi dan unread messages
  const [unreadCount, setUnreadCount] = useState(0);
  const [popupMessage, setPopupMessage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch profile data
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("created_at, full_name, email, role, is_admin")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetch profile:", error);
          const joinDate = user.created_at ? new Date(user.created_at) : new Date();
          setProfile({
            created_at: user.created_at || new Date().toISOString(),
            full_name: user.user_metadata?.full_name || '',
            email: user.email || '',
            role: user.user_metadata?.role || 'user'
          });

          setJoinDate(formatDate(joinDate));
          calculateDaysSince(user.created_at);
          return;
        }

        setProfile(data);

        if (data.created_at) {
          const date = new Date(data.created_at);
          setJoinDate(formatDate(date));
          calculateDaysSince(data.created_at);
        } else if (user.created_at) {
          const date = new Date(user.created_at);
          setJoinDate(formatDate(date));
          calculateDaysSince(user.created_at);
        }
      } catch (err) {
        console.error("Error in fetchProfile:", err);
        const fallbackDate = user.created_at ? new Date(user.created_at) : new Date();
        setProfile({
          created_at: user.created_at || new Date().toISOString(),
          full_name: user.user_metadata?.full_name || '',
          email: user.email || '',
          role: user.user_metadata?.role || 'user'
        });
        setJoinDate(formatDate(fallbackDate));

        if (user.created_at) {
          calculateDaysSince(user.created_at);
        }
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch admin data
  useEffect(() => {
    if (!user) return;

    const fetchAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
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
  }, [user]);

  // Fetch unread messages count
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

  // Mark messages as read when opening chat
  const markMessagesAsRead = async () => {
    if (!user || !adminData) return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", adminData.id)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Fetch messages when modal opens
  useEffect(() => {
    if (!showMessageModal || !user || !adminData) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminData.id}),and(sender_id.eq.${adminData.id},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching messages:", error);
          return;
        }

        setMessages(data || []);
        await markMessagesAsRead();
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchMessages();
  }, [showMessageModal, user, adminData]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!user || !adminData) return;

    const channel = supabase
      .channel("user-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new;

          if (newMessage.sender_id === adminData.id) {
            setUnreadCount(prev => prev + 1);

            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", newMessage.sender_id)
              .single()
              .then(({ data: senderData }) => {
                setPopupMessage({
                  ...newMessage,
                  sender: senderData || { full_name: "Admin" }
                });
              });

            setTimeout(() => {
              setPopupMessage(null);
            }, 5000);

            if (showMessageModal) {
              setMessages((prev) => [...prev, newMessage]);
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMessage.id)
                .then();
            }
          }
        }
      )
      .subscribe();

    fetchUnreadCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, adminData, showMessageModal]);

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", deleteConfirm.id);

    if (error) {
      console.error("Delete error:", error);
      alert("Gagal menghapus pesan");
      setDeleting(false);
      return;
    }

    setMessages((prev) => prev.filter((msg) => msg.id !== deleteConfirm.id));
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const calculateDaysSince = (createdAt) => {
    if (!createdAt) return;

    const joinDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - joinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setStats(prev => ({
      ...prev,
      memberSince: `${diffDays} hari yang lalu`
    }));
  };

  const formatDate = (date) => {
    return date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} menit yang lalu`;
      }
      return `${diffHours} jam yang lalu`;
    } else if (diffDays === 1) {
      return 'Kemarin';
    } else if (diffDays < 7) {
      return `${diffDays} hari yang lalu`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} minggu yang lalu`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} bulan yang lalu`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} tahun yang lalu`;
    }
  };

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile?.full_name || user?.user_metadata?.full_name || "",
        email: profile?.email || user?.email || "",
        phone: user?.user_metadata?.phone || "",
        department: user?.user_metadata?.department || "",
        position: user?.user_metadata?.position || "",
        address: user?.user_metadata?.address || "",
        bio: user?.user_metadata?.bio || "",
        company: user?.user_metadata?.company || ""
      });
    }
  }, [profile, user]);

  const handleEdit = () => {
    setIsEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      email: profile?.email || user?.email || "",
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        full_name: editForm.full_name
      }));

      setMessage({
        type: 'success',
        text: 'Profil berhasil diperbarui'
      });
      setIsEditing(false);

      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: 'error',
        text: 'Gagal memperbarui profil'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessageToAdmin = async () => {
    if (!messageText.trim() || !user || !adminData) return;

    try {
      setSending(true);

      const { error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: user.id,
            receiver_id: adminData.id,
            message: messageText,
            created_at: new Date().toISOString(),
            is_read: false
          },
        ]);

      if (error) {
        console.error("Message insertion error:", error);
        throw error;
      }

      setMessageText("");

      setMessage({
        type: 'success',
        text: 'Pesan berhasil dikirim'
      });

      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: 'Gagal mengirim pesan'
      });
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const handleOpenChat = () => {
    setShowMessageModal(true);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="ml-30 p-6 max-w-3xl mx-auto">
        {/* Success/Error Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-500 text-sm font-bold">!</span>
                </div>
              )}
              <p className="font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Popup Notifikasi Pesan Baru */}
        {popupMessage && (
          <div className="fixed top-6 right-6 z-[999] animate-slide-in">
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 w-80 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    Pesan dari Admin
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {popupMessage.message?.slice(0, 80)}...
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(popupMessage.created_at).toLocaleTimeString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={() => setPopupMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  handleOpenChat();
                  setPopupMessage(null);
                }}
                className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Bell className="w-3 h-3" />
                Lihat Pesan
              </button>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Pesan */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center dark:bg-red-900/30">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Hapus Pesan
                </h3>
              </div>

              <p className="text-gray-600 mb-6 dark:text-gray-300">
                Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteMessage}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menghapus...
                    </>
                  ) : (
                    'Hapus'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-6xl mx-auto px-4">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            {/* Cover with Gradient */}
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500">
              {/* Role Badge */}
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-sm bg-white/10 border border-white/20 text-white">
                  <Shield size={14} />
                  <span className="font-medium text-sm">
                    {profile?.role === 'admin' || user?.user_metadata?.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </div>
              </div>

              {/* Profile Picture */}
              <div className="absolute -bottom-12 left-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-full overflow-hidden">
                      {user?.user_metadata?.avatar ? (
                        <img
                          src={user.user_metadata.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                          <UserCircle size={48} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="pt-16 px-6 pb-6">
              {/* Header */}
              <div className="flex justify-between items-start gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">
                    {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{profile?.email || user?.email}</p>
                </div>

                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      {/* Tombol Chat dengan Notifikasi */}
                      <div className="relative">
                        <button
                          onClick={handleOpenChat}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat Admin

                          {/* Badge Notifikasi Pesan Baru */}
                          {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                        Batal
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal Dibuat Akun</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {joinDate ? joinDate.split(',')[0] : 'Memuat...'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                    {joinDate ? joinDate.split(',')[1]?.trim() : ''}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">Status</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">Aktif</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Lama Bergabung</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.memberSince || getRelativeTime(profile?.created_at || user?.created_at)}
                  </p>
                </div>
              </div>

              {/* Profile Details */}
              {!isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Contact Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg border-b pb-2 dark:text-white dark:border-gray-600">Informasi Kontak</h3>
                      <div className="space-y-3">
                        {user?.user_metadata?.phone && (
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Telepon</p>
                              <p className="font-medium text-gray-900 dark:text-white">{user.user_metadata.phone}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                          <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                            <p className="font-medium text-gray-900 dark:text-white">{profile?.email || user?.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                          <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tanggal Dibuat Akun</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {joinDate || formatDate(new Date(profile?.created_at || user?.created_at || new Date()))}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {getRelativeTime(profile?.created_at || user?.created_at)}
                            </p>
                          </div>
                        </div>

                        {user?.user_metadata?.address && (
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Alamat</p>
                              <p className="font-medium text-gray-900 dark:text-white">{user.user_metadata.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Info */}
                    {(user?.user_metadata?.company || user?.user_metadata?.position || user?.user_metadata?.department) && (
                      <div className="space-y-4 mt-6">
                        <h3 className="font-semibold text-gray-900 text-lg border-b pb-2 dark:text-white dark:border-gray-600">Informasi Pekerjaan</h3>
                        <div className="space-y-3">
                          {user?.user_metadata?.company && (
                            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                              <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Perusahaan</p>
                                <p className="font-medium text-gray-900 dark:text-white">{user.user_metadata.company}</p>
                              </div>
                            </div>
                          )}

                          {user?.user_metadata?.position && (
                            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                              <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Jabatan</p>
                                <p className="font-medium text-gray-900 dark:text-white">{user.user_metadata.position}</p>
                              </div>
                            </div>
                          )}

                          {user?.user_metadata?.department && (
                            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                              <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Departemen</p>
                                <p className="font-medium text-gray-900 dark:text-white">{user.user_metadata.department}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bio */}
                    {user?.user_metadata?.bio && (
                      <div className="space-y-4 mt-6">
                        <h3 className="font-semibold text-gray-900 text-lg border-b pb-2 dark:text-white dark:border-gray-600">Bio</h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{user.user_metadata.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Edit Form */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Edit Informasi Dasar</h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                          value={editForm.email}
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Email tidak dapat diubah</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal Premium */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col dark:bg-gray-800 transform transition-all animate-slideUp">

            {/* Modal Header with Gradient */}
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-10 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8"></div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      Admin
                      <span className="text-sm font-normal bg-white/20 px-2 py-1 rounded-full">
                        Online
                      </span>
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-blue-100">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {adminData?.email || 'admin@system.com'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageText("");
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all transform hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Container with Custom Scrollbar */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 animate-bounce">
                    <MessageCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Belum Ada Percakapan
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                    Mulai percakapan dengan admin dengan mengirim pesan pertama
                  </p>
                  <div className="mt-6 flex gap-2 text-sm text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd>
                    <span>untuk mengirim pesan</span>
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(groupMessagesByDate(messages)).map(([date, msgs], index) => (
                    <div key={date} className="space-y-4">
                      <div className={`flex justify-center sticky top-0 z-10 ${index > 0 ? 'mt-6' : ''}`}>
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 animate-fadeIn">
                          {formatMessageDate(date)}
                        </div>
                      </div>

                      {msgs.map((msg, msgIndex) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'} message-appear`}
                          style={{ animationDelay: `${msgIndex * 0.05}s` }}
                        >
                          <div className={`relative group max-w-[70%] ${msg.sender_id === user.id ? 'ml-auto' : 'mr-auto'}`}>
                            {msg.sender_id !== user.id && (
                              <div className="absolute -left-8 bottom-0">
                              </div>
                            )}

                            <div
                              className={`rounded-2xl p-3 ${msg.sender_id === user.id
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none shadow-lg'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-md'
                                }`}
                            >
                              <p className="text-sm break-words leading-relaxed">{msg.message}</p>

                              <div className={`flex items-center justify-end gap-1 mt-2 ${msg.sender_id === user.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                <span className="text-xs">
                                  {formatMessageTime(msg.created_at)}
                                </span>
                                {msg.sender_id === user.id && (
                                  <div className="flex items-center">
                                    {msg.is_read ? (
                                      <div className="flex" title="Telah dibaca">
                                        <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                      </div>
                                    ) : (
                                      <CheckCheck className="w-3.5 h-3.5 opacity-70" title="Terkirim" />
                                    )}
                                  </div>
                                )}
                                {!msg.is_read && msg.sender_id !== user.id && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Pesan baru"></span>
                                )}
                              </div>
                            </div>

                            {/* Delete button for user's own messages */}

                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Message Input with Enhanced Design */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageToAdmin();
                      }
                    }}
                    placeholder="Ketik pesan..."
                    className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    disabled={sending || !adminData}
                  />
                </div>

                <button
                  onClick={sendMessageToAdmin}
                  disabled={sending || !messageText.trim() || !adminData}
                  className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2 min-w-[90px] justify-center"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Kirim</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="text-sm">Kirim</span>
                    </>
                  )}
                </button>
              </div>

              {!adminData && (
                <p className="text-xs text-red-500 mt-2">
                  Admin tidak ditemukan. Silakan hubungi administrator.
                </p>
              )}

              <div className="flex justify-between items-center mt-2 px-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Tekan Enter untuk mengirim
                </p>
                {messageText.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {messageText.length} karakter
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations - Tambahkan di file CSS Anda */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .message-appear {
          animation: messageAppear 0.3s ease-out forwards;
          opacity: 0;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #4a5568;
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
}