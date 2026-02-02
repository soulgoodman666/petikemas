import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { supabase } from "../../supabase";
import { useNavigate } from "react-router-dom";
import { getAllUsers, getMyFiles, getUserById } from "../../services/fileService";
import { User, Mail, ShieldCheck, Search, FileText, X, Calendar, Image as ImageIcon, Eye } from "lucide-react";
import DashboardSidebar from '../../components/DashboardSidebar';

export default function Users() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { darkMode } = useDarkMode();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [loadingUserFiles, setLoadingUserFiles] = useState(false);
  const [showUserFilesModal, setShowUserFilesModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      if (!user.isAdmin) {
        navigate("/download", { replace: true });
        return;
      }
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
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

  // Load files for specific user
  const loadUserFiles = async (userId) => {
    setLoadingUserFiles(true);
    try {
      const { data: filesData, error: filesError } = await getMyFiles(userId);
      if (filesError) throw filesError;

      // Filter files that are specifically sent to this user
      const userSpecificFiles = filesData?.filter(file => file.target_user_id === userId) || [];

      // Enrich files with owner details
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

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users
  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent">
      <DashboardSidebar />
      
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
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 hover:text-blue-800 text-sm font-medium dark:text-blue-400 dark:hover:text-blue-300">
                                Lihat Files
                              </span>
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
