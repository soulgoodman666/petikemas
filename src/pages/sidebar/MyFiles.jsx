import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getMyFiles, getDownloadUrl, getUserById } from "../../services/fileService";
import { supabase } from "../../supabase";
import { FileText, Download, Eye, Search, Calendar, User, AlertCircle, Folder, TrendingUp, Activity, Clock, Users, Globe, Megaphone, X, Image as ImageIcon } from "lucide-react";
import DashboardSidebar from '../../components/DashboardSidebar';

export default function MyFiles() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { darkMode } = useDarkMode();
  const [allAccessibleFiles, setAllAccessibleFiles] = useState([]);
  const [displayedFiles, setDisplayedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("my-files");

  // Stats state
  const [stats, setStats] = useState({
    totalFiles: 0,
    myFilesCount: 0,
    sharedFilesCount: 0,
    publicFilesCount: 0,
    storageUsed: 0
  });

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState([]);
  
  // Image modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      if (user.isAdmin) {
        navigate("/files", { replace: true });
        return;
      }
    }
  }, [user, authLoading, navigate]);

  // Real-time subscription for file changes
  useEffect(() => {
    if (!user) return;

    // Subscribe to changes in the files table
    const subscription = supabase
      .channel('files_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'files'
        }, 
        (payload) => {
          console.log('📁 Real-time file change:', payload);
          
          // Check if this change affects the current user
          const file = payload.new || payload.old;
          const affectsUser = file && (
            file.target_user_id === user.id || 
            file.uploaded_by === user.id || 
            file.target_user_id === null // Public files
          );
          
          if (affectsUser) {
            console.log('🔄 Refetching files due to relevant change');
            fetchAccessibleFiles();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Fetch announcements on component mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data: globalAnnouncements, error: globalError } = await supabase
          .from('announcements')
          .select(`
            *,
            announcement_targets!left(
              user_id
            )
          `)
          .eq('is_active', true)
          .is('announcement_targets.user_id', null)
          .order('created_at', { ascending: false });

        const { data: targetedAnnouncements, error: targetedError } = await supabase
          .from('announcements')
          .select(`
            *,
            announcement_targets!inner(
              user_id
            )
          `)
          .eq('is_active', true)
          .eq('announcement_targets.user_id', user?.id)
          .order('created_at', { ascending: false });

        if (globalError) throw globalError;
        if (targetedError) throw targetedError;

        const allAnnouncements = [...(globalAnnouncements || []), ...(targetedAnnouncements || [])];
        const uniqueAnnouncements = allAnnouncements.filter((announcement, index, self) =>
          index === self.findIndex((a) => a.id === announcement.id)
        );

        setAnnouncements(uniqueAnnouncements);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      }
    };

    fetchAnnouncements();
  }, [user]);

  // Handle dismiss announcement
  const dismissAnnouncement = (announcementId) => {
    setDismissedAnnouncements(prev => [...prev, announcementId]);
  };

  // Handle image click
  const handleImageClick = (imageUrl, announcementTitle) => {
    setSelectedImage({
      url: imageUrl,
      title: announcementTitle
    });
    setShowImageModal(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  // Load files
  const loadFiles = async () => {
    if (!user) return;

    console.log("🔄 Fetching files for user:", user.email, user.id);
    setLoading(true);
    setError("");

    try {
      const { data: filesData, error: filesError } = await getMyFiles(user.id);

      if (filesError) {
        console.error("❌ Error fetching files:", filesError);
        throw filesError;
      }

      console.log("✅ Files fetched:", filesData?.length || 0, "files");

      const filesWithUserDetails = await Promise.all(
        filesData?.map(async (file) => {
          try {
            let owner = null;
            if (file.uploaded_by) {
              const { data: userData } = await getUserById(file.uploaded_by);
              owner = userData;
            }

            let targetUser = null;
            if (file.target_user_id) {
              const { data: targetData } = await getUserById(file.target_user_id);
              targetUser = targetData;
            }

            return {
              ...file,
              owner: owner || { full_name: "Unknown", email: "Unknown" },
              target_user: targetUser,
              isMine: file.uploaded_by === user.id,
              isSharedWithMe: file.target_user_id === user.id && file.uploaded_by !== user.id,
              isPublic: file.target_user_id === null && file.uploaded_by !== user.id
            };
          } catch (err) {
            console.error("Error getting user details:", err);
            return {
              ...file,
              owner: { full_name: "Unknown", email: "Unknown" },
              target_user: null,
              isMine: file.uploaded_by === user.id,
              isSharedWithMe: file.target_user_id === user.id && file.uploaded_by !== user.id,
              isPublic: file.target_user_id === null && file.uploaded_by !== user.id
            };
          }
        }) || []
      );

      const myFiles = filesWithUserDetails.filter(file => file.isMine);
      const sharedFiles = filesWithUserDetails.filter(file => file.isSharedWithMe);
      const publicFiles = filesWithUserDetails.filter(file => file.isPublic);

      const totalFiles = filesWithUserDetails.length;
      const myFilesCount = myFiles.length;
      const sharedFilesCount = sharedFiles.length;
      const publicFilesCount = publicFiles.length;

      setStats({
        totalFiles,
        myFilesCount,
        sharedFilesCount,
        publicFilesCount,
        storageUsed: Math.floor(Math.random() * 500)
      });

      setAllAccessibleFiles(filesWithUserDetails);
      filterFilesByTab(activeTab, filesWithUserDetails);

    } catch (err) {
      console.error("❌ Load files error:", err);
      setError(err.message || "Gagal memuat file");
      setAllAccessibleFiles([]);
      setDisplayedFiles([]);
      setStats({
        totalFiles: 0,
        myFilesCount: 0,
        sharedFilesCount: 0,
        publicFilesCount: 0,
        storageUsed: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter files berdasarkan tab
  const filterFilesByTab = (tab, filesArray = allAccessibleFiles) => {
    let filtered = [];

    switch (tab) {
      case "my-files":
        filtered = filesArray.filter(file => file.isMine);
        break;
      case "shared-with-me":
        filtered = filesArray.filter(file => file.isSharedWithMe);
        break;
      case "public-files":
        filtered = filesArray.filter(file => file.isPublic);
        break;
      default:
        filtered = filesArray;
    }

    console.log(`🎯 Filtering for tab "${tab}":`, filtered.length, "files");
    setDisplayedFiles(filtered);
  };

  // Load files ketika tab berubah atau user berubah
  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user?.id]);

  // Filter ulang ketika tab berubah
  useEffect(() => {
    if (allAccessibleFiles.length > 0) {
      filterFilesByTab(activeTab);
    }
  }, [activeTab]);

  // Auto refresh setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && !loading) {
        console.log("🔄 Auto-refreshing files...");
        loadFiles();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id, loading]);

  // Handle download
  const handleDownload = (file) => {
    const url = getDownloadUrl(file.file_path);
    window.open(url, "_blank");
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter files berdasarkan search
  const filteredFiles = displayedFiles.filter(file =>
    file.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <DashboardSidebar />
      <div className="ml-30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Announcements Section */}
          {announcements.filter(announcement => !dismissedAnnouncements.includes(announcement.id)).length > 0 && (
            <div className="mb-8 space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">PENGUMUMAN</h3>
              </div>
              {announcements
                .filter(announcement => !dismissedAnnouncements.includes(announcement.id))
                .map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`relative rounded-2xl p-4 border ${
                      announcement.type === 'urgent'
                        ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800'
                        : announcement.type === 'important'
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800'
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        announcement.type === 'urgent'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : announcement.type === 'important'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <Megaphone className={`w-4 h-4 ${
                          announcement.type === 'urgent'
                            ? 'text-red-600 dark:text-red-400'
                            : announcement.type === 'important'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm mb-1 ${
                          announcement.type === 'urgent'
                            ? 'text-red-800 dark:text-red-300'
                            : announcement.type === 'important'
                            ? 'text-amber-800 dark:text-amber-500'
                            : 'text-blue-800 dark:text-blue-500'
                        }`}>
                          {announcement.title}
                        </h4>

                        {/* Display Image */}
                        {announcement.image_url && (
                          <div className="mb-3">
                            <img
                              src={announcement.image_url}
                              alt={announcement.title}
                              className="max-w-xs rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105"
                              onClick={() => handleImageClick(announcement.image_url, announcement.title)}
                            />
                            <div className="text-xs text-red-600 dark:text-blue-400 font-bold flex items-center gap-1 mt-1">
                              KLIK GAMBAR UNTUK LEBIH JELAS
                            </div>
                          </div>
                        )}

                        <p className={`text-sm leading-relaxed ${
                          announcement.type === 'urgent'
                            ? 'text-red-700 dark:text-red-500'
                            : announcement.type === 'important'
                            ? 'text-amber-700 dark:text-amber-500'
                            : 'text-blue-700 dark:text-blue-500'
                        }`}>
                          {announcement.message}
                        </p>
                        {announcement.created_at && (
                          <p className={`text-xs mt-2 ${
                            announcement.type === 'urgent'
                              ? 'text-red-600'
                              : announcement.type === 'important'
                              ? 'text-amber-600'
                              : 'text-blue-600'
                          }`}>
                            {new Date(announcement.created_at).toLocaleString('id-ID', {
                              timeZone: "Asia/Jakarta",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => dismissAnnouncement(announcement.id)}
                        className={`p-1 rounded-lg hover:bg-black/10 transition-colors ${
                          announcement.type === 'urgent'
                            ? 'text-red-600 hover:bg-red-100'
                            : announcement.type === 'important'
                            ? 'text-amber-600 hover:bg-amber-100'
                            : 'text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center dark:bg-blue-900/30">
                  <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFiles}</h3>
              <p className="text-gray-600 text-sm dark:text-gray-400">Total File</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center dark:bg-purple-900/30">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sharedFilesCount}</h3>
              <p className="text-gray-600 text-sm dark:text-gray-400">Dibagikan ke Saya</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center dark:bg-orange-900/30">
                  <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.publicFilesCount}</h3>
              <p className="text-gray-600 text-sm dark:text-gray-400">File Umum</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900/30">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Files</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                      {activeTab === "my-files"
                        ? "File yang Anda upload"
                        : activeTab === "shared-with-me"
                          ? "File yang dibagikan kepada Anda"
                          : "File umum untuk semua user"
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadFiles}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  {loading ? 'Memuat...' : 'Refresh'}
                </button>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab("shared-with-me")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "shared-with-me"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Dibagikan ke Saya ({stats.sharedFilesCount})
                </button>
                <button
                  onClick={() => setActiveTab("public-files")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "public-files"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                >
                  <Globe className="w-4 h-4 inline mr-2" />
                  File Umum ({stats.publicFilesCount})
                </button>
              </div>
            </div>

            {/* Search & Error */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-600 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 dark:bg-red-900/20 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                    <button
                      onClick={loadFiles}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari file berdasarkan judul, deskripsi, kategori, atau pemilik..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Files List */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="text-gray-600 dark:text-gray-400">Memuat file...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4 dark:text-gray-600" />
                  <div className="flex gap-3 justify-center mt-4">
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Hapus Pencarian
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Menampilkan {filteredFiles.length} dari {displayedFiles.length} file
                    {activeTab === "public-files" && " (File umum untuk semua user)"}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredFiles.map((file) => (
                      <div key={file.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 bg-white dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700/50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center dark:bg-gray-700">
                            <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-block px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400">
                              {file.category || 'Umum'}
                            </span>
                            <div className="flex gap-1">
                              {file.target_user_id === user.id && (
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full dark:bg-green-900/30 dark:text-green-400">
                                  Untuk Anda
                                </span>
                              )}
                              {file.target_user_id === null && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                                  Umum
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 dark:text-white">
                          {file.title || 'File tanpa judul'}
                        </h3>

                        {file.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2 dark:text-gray-400">
                            {file.description}
                          </p>
                        )}

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="truncate">
                              {file.isMine
                                ? "Diunggah oleh Anda"
                                : `Dari: ${file.owner?.full_name || file.owner?.email || 'Unknown'}`
                              }
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(file.created_at)}</span>
                          </div>

                          {file.size && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>{formatFileSize(file.size)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload(file)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>

                          {file.file_url && (
                            <button
                              onClick={() => window.open(file.file_url, '_blank')}
                              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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
                  Gambar: {selectedImage.title}
                </h3>
              </div>
              <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
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
  );
}
