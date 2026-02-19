import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { supabase } from "../../supabase";
import { useNavigate } from "react-router-dom";
import { getAllUsers, getMyFiles, getUserById } from "../../services/fileService";
import {
  User, Mail, ShieldCheck, Search, FileText, X, Calendar,
  Image as ImageIcon, Eye, MessageCircle, Trash2, AlertTriangle,
  Send, CheckCheck, Phone, MapPin, Briefcase, Building, Globe
} from "lucide-react";
import "../../index.css";

export default function Users() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { darkMode } = useDarkMode();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadMap, setUnreadMap] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [loadingUserFiles, setLoadingUserFiles] = useState(false);
  const [showUserFilesModal, setShowUserFilesModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [userMessages, setUserMessages] = useState({});
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedUserForMessages, setSelectedUserForMessages] = useState(null);
  const [userMessagesList, setUserMessagesList] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // State untuk chat
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // State untuk konfirmasi hapus pesan
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ AMAN: loading auth SAJA
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle image click
  const handleImageClick = (imageUrl, userName) => {
    setSelectedImage({
      url: imageUrl,
      name: userName
    });
    setShowImageModal(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllUsers();
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err.message || "Gagal memuat users");
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread messages count per user
  const fetchUnreadPerUser = async () => {
    const { data } = await supabase
      .from("messages")
      .select("sender_id, id")
      .eq("is_read", false)
      .eq("receiver_id", user?.id);

    const grouped = {};

    data?.forEach(msg => {
      if (!grouped[msg.sender_id]) {
        grouped[msg.sender_id] = 0;
      }
      grouped[msg.sender_id]++;
    });

    return grouped;
  };

  // Fetch all messages for a specific user (two-way)
  const fetchUserMessages = async (userId) => {
    setLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${user?.id}),and(sender_id.eq.${user?.id},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setUserMessagesList(data || []);
    } catch (err) {
      console.error("REAL ERROR:", err);
      setUserMessagesList([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message to user
  const sendMessageToUser = async () => {
    if (!messageText.trim() || !selectedUserForMessages || !user) return;

    try {
      setSending(true);

      const { error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: user.id,
            receiver_id: selectedUserForMessages.id,
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

      // Refresh messages to include the new one
      await fetchUserMessages(selectedUserForMessages.id);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  // Handle delete message dengan konfirmasi modal
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

    // 🔥 UPDATE: Kurangi unread count jika pesan yang dihapus belum dibaca
    if (!deleteConfirm.is_read && deleteConfirm.sender_id !== user?.id) {
      setUnreadMap(prev => ({
        ...prev,
        [deleteConfirm.sender_id]: Math.max(0, (prev[deleteConfirm.sender_id] || 0) - 1)
      }));
    }

    // Update UI tanpa refresh
    setUserMessagesList((prev) =>
      prev.filter((msg) => msg.id !== deleteConfirm.id)
    );

    setDeleteConfirm(null);
    setDeleting(false);
  };

  // Handle click on message icon
  const handleMessagesClick = (e, userItem) => {
    e.stopPropagation();
    setSelectedUserForMessages(userItem);
    setShowMessagesModal(true);
    fetchUserMessages(userItem.id);

    // 🔥 Reset unread count untuk user ini saat modal dibuka
    setUnreadMap(prev => ({
      ...prev,
      [userItem.id]: 0
    }));
  };

  // Load files for specific user
  const loadUserFiles = async (userId) => {
    setLoadingUserFiles(true);
    try {
      const { data: filesData, error: filesError } = await getMyFiles(userId);
      if (filesError) throw filesError;

      const userSpecificFiles = filesData?.filter(file => file.target_user_id === userId) || [];

      const filesWithDetails = await Promise.all(
        userSpecificFiles.map(async (file) => {
          let owner = null;
          if (file.uploaded_by) {
            const { data: userData } = await getUserById(file.uploaded_by);
            owner = userData;
          }
          return {
            ...file,
            owner: owner || { full_name: "Unknown", email: "Unknown" }
          };
        })
      );

      setUserFiles(filesWithDetails);
    } catch (err) {
      console.error("Error loading user files:", err);
      setUserFiles([]);
    } finally {
      setLoadingUserFiles(false);
    }
  };

  const markAdminMessagesAsRead = async () => {
    if (!user?.id || !selectedUserForMessages?.id) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", selectedUserForMessages.id)
      .eq("is_read", false);

    if (error) {
      console.error("Gagal update read status:", error);
      return;
    }

    // update UI langsung
    setUserMessagesList(prev =>
      prev.map(msg =>
        msg.sender_id === selectedUserForMessages.id
          ? { ...msg, is_read: true }
          : msg
      )
    );
  };


  useEffect(() => {
    if (showMessagesModal && selectedUserForMessages?.id) {
      markAdminMessagesAsRead();
    }
  }, [showMessagesModal, selectedUserForMessages?.id]);


  // Handle click on user row
  const handleUserClick = (userItem) => {
    setSelectedUser(userItem);
    setShowUserFilesModal(true);
    loadUserFiles(userItem.id);
  };

  // Close modal
  const closeModal = () => {
    setShowUserFilesModal(false);
    setSelectedUser(null);
    setUserFiles([]);
  };

  // Close messages modal
  const closeMessagesModal = () => {
    setShowMessagesModal(false);
    setSelectedUserForMessages(null);
    setUserMessagesList([]);
    setSelectedMessage(null);
    setDeleteConfirm(null);
    setMessageText("");
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format message date
  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
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

  // Group messages by date
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

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (user?.id) {
      const loadUnread = async () => {
        const result = await fetchUnreadPerUser();
        setUnreadMap(result);
      };

      loadUnread();
    }
  }, [user?.id]);

  // Filter users
  const filteredUsers = users.filter(userItem =>
    userItem.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userItem.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("admin-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime triggered:", payload);
          const newMessage = payload.new;

          setUnreadMap(prev => ({
            ...prev,
            [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1
          }));

          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", newMessage.sender_id)
            .single()
            .then(({ data: senderData }) => {
              setPopupMessage({
                ...newMessage,
                sender: senderData
              });
            });

          setTimeout(() => {
            setPopupMessage(null);
          }, 5000);
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Real-time subscription for messages in the current chat
  useEffect(() => {
    if (!showMessagesModal || !selectedUserForMessages || !user) return;

    const channel = supabase
      .channel("chat-realtime-admin")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${selectedUserForMessages.id}),and(sender_id=eq.${selectedUserForMessages.id},receiver_id=eq.${user.id}))`
        },
        (payload) => {
          setUserMessagesList((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showMessagesModal, selectedUserForMessages, user]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="ml-30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900/30">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                    <p className="text-gray-500 dark:text-gray-400">Kelola semua user dalam sistem</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {users.length} users
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari user..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
                </div>
              ) : error ? (
                <div className="text-red-600 mb-2 text-center">{error}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Tidak ada user yang ditemukan</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Registered</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((userItem) => (
                        <tr
                          key={userItem.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors dark:border-gray-700 dark:hover:bg-gray-700/50"
                          onClick={() => handleUserClick(userItem)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="relative cursor-pointer group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (userItem.avatar_url) {
                                    handleImageClick(userItem.avatar_url, userItem.full_name || 'User');
                                  }
                                }}
                              >
                                {userItem.avatar_url ? (
                                  <>
                                    <img
                                      src={userItem.avatar_url}
                                      alt={userItem.full_name || 'User'}
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600 group-hover:ring-blue-500 transition-all"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all flex items-center justify-center">
                                      <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-700 ring-2 ring-gray-200 dark:ring-gray-600">
                                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {userItem.full_name || userItem.email || 'Unknown'}
                                </div>
                                {userItem.full_name && userItem.email && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {userItem.email}
                                  </div>
                                )}
                                {userItem.avatar_url && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                                    <ImageIcon className="w-3 h-3" />
                                    Klik untuk lihat foto
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{userItem.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-600 dark:text-gray-400">
                              {new Date(userItem.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-4">
                              <span
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserClick(userItem);
                                }}
                              >
                                Lihat Files
                              </span>

                              <div
                                className="relative cursor-pointer group"
                                onClick={(e) => handleMessagesClick(e, userItem)}
                              >
                                <MessageCircle className="w-5 h-5 text-gray-500 hover:text-blue-600 transition-colors group-hover:scale-110" />

                                {unreadMap[userItem.id] > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                                    {unreadMap[userItem.id]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Popup Notifikasi Pesan */}
        {popupMessage && (
          <div className="fixed top-6 right-6 z-[999] animate-slide-in">
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 w-80 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    Pesan dari {popupMessage.sender?.full_name || 'User'}
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
                  const sender = users.find(u => u.id === popupMessage.sender_id);
                  if (sender) {
                    setSelectedUserForMessages(sender);
                    setShowMessagesModal(true);
                    fetchUserMessages(sender.id);
                  }
                  setPopupMessage(null);
                }}
                className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
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
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Konfirmasi Hapus Pesan
                </h3>
              </div>

              <p className="text-gray-600 mb-2 dark:text-gray-300">
                Apakah Anda yakin ingin menghapus pesan ini?
              </p>
              <p className="text-sm text-gray-500 mb-6 dark:text-gray-400 bg-gray-50 p-3 rounded-lg dark:bg-gray-700/50">
                "{deleteConfirm.message?.substring(0, 100)}{deleteConfirm.message?.length > 100 ? '...' : ''}"
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteMessage}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Modal - Chat dua arah dengan user */}
        {showMessagesModal && selectedUserForMessages && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col dark:bg-gray-800 transform transition-all animate-slideUp">

              {/* Modal Header with Gradient */}
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-10 text-white overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8"></div>

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    {/* User Avatar with Status */}
                    <div className="relative">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                        {selectedUserForMessages.avatar_url ? (
                          <img
                            src={selectedUserForMessages.avatar_url}
                            alt={selectedUserForMessages.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>

                    {/* User Info */}
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {selectedUserForMessages.full_name || selectedUserForMessages.email}
                        {selectedUserForMessages.role === 'admin' && (
                          <Shield className="w-4 h-4 text-yellow-300" />
                        )}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-blue-100">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {selectedUserForMessages.email}
                        </span>
                        {selectedUserForMessages.phone && (
                          <>
                            <span className="w-1 h-1 bg-blue-300 rounded-full"></span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {selectedUserForMessages.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={closeMessagesModal}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all transform hover:scale-110"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Container with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin dark:border-gray-700 dark:border-t-blue-500"></div>
                      <MessageCircle className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <span className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Memuat percakapan...</span>
                  </div>
                ) : userMessagesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 animate-bounce">
                      <MessageCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Belum Ada Percakapan
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                      Mulai percakapan dengan {selectedUserForMessages.full_name || 'user ini'} dengan mengirim pesan pertama
                    </p>
                    <div className="mt-6 flex gap-2 text-sm text-gray-400">
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd>
                      <span>untuk mengirim pesan</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Group messages by date */}
                    {Object.entries(groupMessagesByDate(userMessagesList)).map(([date, messages], index) => (
                      <div key={date} className="space-y-4">
                        {/* Date Separator with Animation */}
                        <div className={`flex justify-center sticky top-0 z-10 ${index > 0 ? 'mt-6' : ''}`}>
                          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 animate-fadeIn">
                            {formatMessageDate(date)}
                          </div>
                        </div>

                        {/* Messages */}
                        {messages.map((message, msgIndex) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} message-appear`}
                            style={{ animationDelay: `${msgIndex * 0.05}s` }}
                          >
                            <div className={`relative group max-w-[70%] ${message.sender_id === user?.id ? 'ml-auto' : 'mr-auto'}`}>
                              {/* Sender Avatar for incoming messages */}
                              {message.sender_id !== user?.id && (
                                <div className="absolute -left-8 bottom-0">
                                </div>
                              )}

                              {/* Message Bubble with Tail Effect */}
                              <div
                                className={`rounded-2xl p-3 ${message.sender_id === user?.id
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none shadow-lg'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-md'
                                  }`}
                              >
                                <p className="text-sm break-words leading-relaxed">{message.message}</p>

                                {/* Message Footer */}
                                <div className={`flex items-center justify-end gap-1 mt-2 ${message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                  <span className="text-xs">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                  {message.sender_id === user?.id && (
                                    <div className="flex items-center">
                                      {message.is_read ? (
                                        <div className="flex" title="Telah dibaca">
                                          <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                        </div>
                                      ) : (
                                        <CheckCheck className="w-3.5 h-3.5 opacity-70" title="Terkirim" />
                                      )}
                                    </div>
                                  )}
                                  {!message.is_read && message.sender_id !== user?.id && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Pesan baru"></span>
                                  )}
                                </div>
                              </div>

                              {/* Message Actions (Hover) */}
                              <div className={`absolute top-0 ${message.sender_id === user?.id ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1`}>
                                {/* Delete Button */}
                                <button
                                  onClick={() => setDeleteConfirm(message)}
                                  className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600 transition-all transform hover:scale-110"
                                  title="Hapus pesan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessageToUser();
                        }
                      }}
                      placeholder="Ketik pesan..."
                      className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      disabled={sending}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={sendMessageToUser}
                    disabled={sending || !messageText.trim()}
                    className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2 min-w-[90px] justify-center"
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

                {/* Input Hint */}
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

        {/* User Files Modal */}
        {showUserFilesModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden dark:bg-gray-800">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Files untuk {selectedUser.full_name || selectedUser.email}
                    </h2>
                    {selectedUser.full_name && selectedUser.email && (
                      <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">
                        {selectedUser.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingUserFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Memuat files...</span>
                  </div>
                ) : userFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Tidak ada file yang dikirim ke user ini
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Total {userFiles.length} file
                    </div>

                    {userFiles.map((file) => (
                      <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-600 dark:hover:bg-gray-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900/30">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {file.title || 'File tanpa judul'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {file.file_name}
                                </p>
                              </div>
                            </div>

                            {file.description && (
                              <p className="text-gray-600 text-sm mb-3 dark:text-gray-300">
                                {file.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>Dari: {file.owner?.full_name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(file.created_at).toLocaleString('id-ID', {
                                    timeZone: "Asia/Jakarta",
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {file.category || 'Umum'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-[90vh] w-full">
              <button
                onClick={closeImageModal}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="bg-white rounded-lg overflow-hidden dark:bg-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Foto: {selectedImage.name}
                  </h3>
                </div>
                <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
                  <button
                    onClick={() => window.open(selectedImage.url, '_blank')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Buka di Tab Baru
                  </button>
                  <button
                    onClick={closeImageModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}