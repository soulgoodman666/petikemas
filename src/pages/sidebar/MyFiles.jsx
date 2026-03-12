import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getDownloadUrl } from "../../services/fileService";
import { supabase } from "../../supabase";
import {
  FileText,
  Download,
  Search,
  Calendar,
  User,
  AlertCircle,
  Folder,
  Activity,
  Globe,
  Megaphone,
  X,
  RefreshCw,
  Share2,
  Lock,
  Unlock,
  Info,
  Star,
  LayoutDashboard,
  ChevronUp,
  ChevronDown,
  Navigation,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function MyFiles() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { darkMode } = useDarkMode();

  const [allFiles, setAllFiles] = useState([]);
  const [displayedFiles, setDisplayedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("my-files");
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(true);
  const [deletingFiles, setDeletingFiles] = useState([]);

  // State untuk menyembunyikan/menampilkan pengumuman
  const [showAnnouncements, setShowAnnouncements] = useState(() => {
    // Cek localStorage untuk preferensi user
    const saved = localStorage.getItem('showAnnouncements');
    return saved !== null ? JSON.parse(saved) : true; // Default true
  });

  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem('hasSeenTutorial') !== 'true';
  });

  const [showDashboardTutorial, setShowDashboardTutorial] = useState(true);

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ================= HELPER FUNCTIONS ================= */
  const getFileType = (extension) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const sheetTypes = ['xls', 'xlsx', 'csv'];
    const presentationTypes = ['ppt', 'pptx'];

    if (imageTypes.includes(extension)) return 'image';
    if (docTypes.includes(extension)) return 'document';
    if (sheetTypes.includes(extension)) return 'spreadsheet';
    if (presentationTypes.includes(extension)) return 'presentation';
    return 'other';
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'spreadsheet': return '📊';
      case 'presentation': return '📽️';
      default: return '📁';
    }
  };

  const filterByTab = (tab, files = allFiles) => {
    if (tab === "my-files") {
      setDisplayedFiles(files.filter((f) => f.isMine));
    } else if (tab === "shared-with-me") {
      setDisplayedFiles(files.filter((f) => f.isShared));
    } else if (tab === "public-files") {
      setDisplayedFiles(files.filter((f) => f.isPublic));
    }
  };

  /* ================= DELETE FILE FUNCTION ================= */
  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus file "${file.title || 'Tanpa Judul'}"?`)) {
      return;
    }

    try {
      setDeletingFiles(prev => [...prev, file.id]);
      setError("");

      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      const updatedAllFiles = allFiles.filter(f => f.id !== file.id);
      setAllFiles(updatedAllFiles);
      filterByTab(activeTab, updatedAllFiles);

    } catch (err) {
      console.error("Error deleting file:", err);
      setError("Gagal menghapus file. Silakan coba lagi.");
    } finally {
      setDeletingFiles(prev => prev.filter(id => id !== file.id));
    }
  };

  /* ================= FETCH FILES ================= */
  const loadFiles = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setRefreshing(true);
      setError("");

      const { data: filesData, error: fetchError } = await supabase
        .from("files")
        .select(`
          *,
          uploaded_by
        `)
        .or(`uploaded_by.eq.${user.id},target_user_id.eq.${user.id},target_user_id.is.null`)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const filesWithOwner = await Promise.all((filesData || []).map(async (file) => {
        const extension = file.file_path?.split(".").pop()?.toLowerCase() || "";

        let ownerData = { full_name: "Unknown" };
        if (file.uploaded_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", file.uploaded_by)
            .single();

          if (profile) {
            ownerData = profile;
          }
        }

        let targetUserData = null;
        if (file.target_user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", file.target_user_id)
            .single();

          if (profile) {
            targetUserData = profile;
          }
        }

        return {
          ...file,
          owner: ownerData,
          target_user: targetUserData,
          fileType: getFileType(extension),
          extension,
          isMine: file.uploaded_by === user.id,
          isShared: file.target_user_id === user.id && file.uploaded_by !== user.id,
          isPublic: file.target_user_id == null,
        };
      }));

      setAllFiles(filesWithOwner);
      filterByTab(activeTab, filesWithOwner);

    } catch (err) {
      console.error("Error loading files:", err);
      setError("Gagal memuat file");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ================= ANNOUNCEMENT ================= */
  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAnnouncements(data || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  // Fungsi untuk toggle tampilan pengumuman
  const toggleAnnouncements = () => {
    const newValue = !showAnnouncements;
    setShowAnnouncements(newValue);
    localStorage.setItem('showAnnouncements', JSON.stringify(newValue));
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    if (!authLoading && user?.id) {
      loadFiles();
      loadAnnouncements();
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    filterByTab(activeTab);
  }, [activeTab, allFiles]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('files-changes-user')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          console.log('File deleted (user view):', payload);
          setAllFiles(prevFiles => {
            const updatedFiles = prevFiles.filter(file => file.id !== payload.old.id);
            filterByTab(activeTab, updatedFiles);
            return updatedFiles;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          console.log('File inserted (user view):', payload);
          loadFiles();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          console.log('File updated (user view):', payload);
          setAllFiles(prevFiles => {
            const updatedFiles = prevFiles.map(file =>
              file.id === payload.new.id ? { ...file, ...payload.new } : file
            );
            filterByTab(activeTab, updatedFiles);
            return updatedFiles;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, activeTab]);

  /* ================= HELPERS ================= */
  const handleDownload = (file) => {
    window.open(getDownloadUrl(file.file_path), "_blank");
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const stats = {
    totalFiles: allFiles.length,
    myFilesCount: allFiles.filter(f => f.isMine).length,
    sharedFilesCount: allFiles.filter(f => f.isShared).length,
    publicFilesCount: allFiles.filter(f => f.isPublic).length,
  };

  const filteredFiles = displayedFiles.filter(
    (f) =>
      f.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeStyle = (type, darkMode) => {
    switch (type) {
      case "urgent":
        return darkMode
          ? "border-red-500 bg-red-900/20"
          : "border-red-400 bg-red-50";
      case "important":
        return darkMode
          ? "border-yellow-500 bg-yellow-900/20"
          : "border-yellow-400 bg-yellow-50";
      default:
        return darkMode
          ? "border-blue-500 bg-blue-900/20"
          : "border-blue-400 bg-blue-50";
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="w-full">
      {/* DASHBOARD TUTORIAL SECTION */}
      <div className="mb-6">
        <div
          className={`
            rounded-2xl p-6 shadow-sm
            ${darkMode ? 'bg-gray-900' : 'bg-white'}
          `}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              Tutorial Dashboard
            </h2>
            <button
              onClick={() => setShowDashboardTutorial(!showDashboardTutorial)}
              className={`p-2 rounded-lg transition-all hover:scale-105
                ${darkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
            >
              {showDashboardTutorial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showDashboardTutorial && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className={`p-4 rounded-xl border-l-4 border-blue-500 ${darkMode ? 'bg-gray-800/50' : 'bg-blue-50/50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <Folder className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Total File
                  </h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Adalah Total file yang anda miliki dari gabungan YourFiles dan PublicFiles
                </p>
              </div>

              <div className={`p-4 rounded-xl border-l-4 border-purple-500 ${darkMode ? 'bg-gray-800/50' : 'bg-purple-50/50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-purple-500/20 rounded-lg">
                    <Share2 className="w-4 h-4 text-purple-500" />
                  </div>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Your Files
                  </h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Halaman yang menampilkan file yang dikirim langgsung oleh Admin untuk anda pribadi dari request anda pada Admin yang bisa di download.
                </p>
              </div>

              <div className={`p-4 rounded-xl border-l-4 border-orange-500 ${darkMode ? 'bg-gray-800/50' : 'bg-orange-50/50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-orange-500/20 rounded-lg">
                    <Globe className="w-4 h-4 text-orange-500" />
                  </div>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Public Files
                  </h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Halaman yang menampilkan file yang dikirim oleh Admin untuk semua user dan bisa didownload
                </p>
              </div>

              <div className={`p-4 rounded-xl border-l-4 border-yellow-500 ${darkMode ? 'bg-gray-800/50' : 'bg-yellow-50/50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                    <Megaphone className="w-4 h-4 text-yellow-500" />
                  </div>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Pengumuman
                  </h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Lihat pengumuman dan info terbaru dari Admin. Klik gambar untuk melihat dalam ukuran penuh.
                </p>
              </div>
            </div>
          )}

          {!showDashboardTutorial && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <LayoutDashboard className="w-4 h-4 text-blue-500" />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Klik untuk melihat panduan dashboard
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MY FILES CONTENT */}
      <div
        className={`
          rounded-2xl p-6 shadow-sm
          ${darkMode ? 'bg-gray-900' : 'bg-white'}
        `}
      >
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              My Files
            </h1>
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Kelola file Anda dan file yang dibagikan
            </p>
          </div>
        </div>

        {/* ANNOUNCEMENTS SECTION */}
        {!loadingAnnouncement && announcements.length > 0 && (
          <div className="mb-6">
            {/* Toggle Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Pengumuman
                </h2>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {announcements.length}
                </span>
              </div>
              <button
                onClick={toggleAnnouncements}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-105
                  ${darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                title={showAnnouncements ? "Sembunyikan pengumuman" : "Tampilkan pengumuman"}
              >
                {showAnnouncements ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">Sembunyikan</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">Tampilkan</span>
                  </>
                )}
              </button>
            </div>

            {/* Announcements Content */}
            {showAnnouncements && (
              <div className="space-y-6">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`rounded-xl border overflow-hidden shadow-sm transition hover:shadow-md ${getTypeStyle(announcement.type, darkMode)}`}
                  >
                    {announcement.image_url && (
                      <div className="w-full max-h-64 overflow-hidden">
                        <img
                          src={announcement.image_url}
                          alt={announcement.title}
                          className="w-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                          onClick={() => window.open(announcement.image_url, "_blank")}
                        />
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <Megaphone className="w-5 h-5 text-yellow-500 mt-1" />

                        <div className="flex-1">
                          <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {announcement.title}
                          </h3>

                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {announcement.message}
                          </p>

                          <p className="text-xs mt-3 text-gray-400">
                            {formatDate(announcement.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Minimized View */}
            {!showAnnouncements && (
              <div className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <Megaphone className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Pengumuman disembunyikan. Klik tombol "Tampilkan" untuk melihat {announcements.length} pengumuman.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            className={`p-4 rounded-xl shadow-sm border
              ${darkMode
                ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700'
                : 'bg-white/20 backdrop-blur-sm border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total File
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalFiles}
                </p>
              </div>
              <Folder className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </div>

          <div className={`p-4 rounded-xl shadow-sm border ${darkMode ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700' : 'bg-white/20 backdrop-blur-sm border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your Files</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.sharedFilesCount}
                </p>
              </div>
              <Share2 className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
          </div>

          <div className={`p-4 rounded-xl shadow-sm border ${darkMode ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700' : 'bg-white/20 backdrop-blur-sm border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Public Files</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.publicFilesCount}
                </p>
              </div>
              <Globe className={`w-8 h-8 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
          </div>
        </div>

        {/* FILTERS AND SEARCH */}
        <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-800/30 border-gray-700' : 'bg-white/20 border-gray-200'} backdrop-blur-sm mb-8`}>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab("shared-with-me")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === "shared-with-me"
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : darkMode
                    ? 'bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              <Share2 className="w-4 h-4" />
              Your files
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === "shared-with-me"
                ? 'bg-blue-700 text-white'
                : darkMode
                  ? 'bg-gray-600 text-gray-300'
                  : 'bg-gray-200 text-gray-700'
                }`}>
                {stats.sharedFilesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("public-files")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === "public-files"
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : darkMode
                    ? 'bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              <Globe className="w-4 h-4" />
              Public Files
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === "public-files"
                ? 'bg-blue-700 text-white'
                : darkMode
                  ? 'bg-gray-600 text-gray-300'
                  : 'bg-gray-200 text-gray-700'
                }`}>
                {stats.publicFilesCount}
              </span>
            </button>
          </div>

          <div className="relative">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari file atau pemilik..."
              className={`w-full pl-12 pr-4 py-3 rounded-lg border-0 ${darkMode
                ? 'bg-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-50 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} focus:outline-none transition-all`}
            />
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${darkMode
            ? 'bg-red-900/30 border border-red-800'
            : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-auto p-1 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* FILE LIST */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Memuat file...</p>
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${darkMode ? 'bg-gray-800/30 backdrop-blur-sm' : 'bg-white/10 backdrop-blur-sm'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <FileText className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Klik Your Files atau Public Files untuk melihat file
            </h3>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {searchTerm
                ? `Tidak ditemukan file dengan kata kunci "${searchTerm}"`
                : activeTab === "my-files"
                  ? ""
                  : activeTab === "shared-with-me"
                    ? "Belum ada file yang dibagikan kepada Anda"
                    : "Belum ada file publik"
              }
            </p>
          </div>
        ) : (
          <>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Menampilkan {filteredFiles.length} file
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`rounded-xl overflow-hidden border transition-all hover:shadow-lg relative ${darkMode
                    ? 'bg-gray-800/30 backdrop-blur-sm border-gray-700 hover:border-gray-600'
                    : 'bg-white/10 backdrop-blur-sm border-gray-200 hover:border-gray-300'}`}
                >
                  {(file.isMine || file.isShared) && (
                    <button
                      onClick={() => handleDeleteFile(file)}
                      disabled={deletingFiles.includes(file.id)}
                      className={`absolute top-2 right-2 p-2 rounded-lg transition-all z-10
                        ${darkMode
                          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                        } ${deletingFiles.includes(file.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Hapus file"
                    >
                      {deletingFiles.includes(file.id) ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg text-2xl`}>
                          {getFileIcon(file.fileType)}
                        </div>
                        <div>
                          <h3 className={`font-semibold truncate max-w-[180px] ${darkMode ? 'text-white' : 'text-gray-900'}`}
                            title={file.title || "Tanpa Judul"}>
                            {file.title || "Tanpa Judul"}
                          </h3>
                          {/* Menampilkan nama file asli */}
                          
                          <p className={`text-xs uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {file.extension}
                          </p>
                        </div>
                      </div>
                      {file.isPublic ? (
                        <Unlock className="w-5 h-5 text-green-500" title="File Publik" />
                      ) : file.isShared ? (
                        <Share2 className="w-5 h-5 text-purple-500" title="Dibagikan" />
                      ) : (
                        <Lock className="w-5 h-5 text-blue-500" title="File Pribadi" />
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {file.owner?.full_name || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {formatDate(file.created_at)}
                        </span>
                      </div>
                      {file.file_size && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {formatFileSize(file.file_size)}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDownload(file)}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all hover:scale-[1.02] ${darkMode
                        ? 'bg-blue-600 hover:bg-blue-500'
                        : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}