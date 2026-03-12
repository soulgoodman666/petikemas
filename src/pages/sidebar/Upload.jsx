import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getAllUsers, uploadFileToStorageAndDB } from "../../services/fileService";
import { 
  Upload as UploadIcon, 
  FileText, 
  User, 
  X, 
  Check, 
  Trash2, 
  FolderOpen,
  Users,
  Mail,
  Search,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  Globe,
  UsersRound
} from "lucide-react";
import { supabase } from "../../supabase";

export default function Upload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  // State untuk menyimpan mapping file ke user
  const [assignments, setAssignments] = useState([]);
  
  // State untuk form assignment - LANGSUNG pilih user dulu
  const [selectedUserId, setSelectedUserId] = useState("");
  const [availableFiles, setAvailableFiles] = useState([]);

  // Form state untuk metadata umum
  const [formData, setFormData] = useState({
    category: "",
    description: "",
  });

  // Load users untuk dropdown
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    // Validasi jumlah file
    if (selectedFiles.length + availableFiles.length > 10) {
      setError("Maksimal 10 file per upload");
      return;
    }

    // Validasi ukuran total
    const newFilesTotal = selectedFiles.reduce((total, file) => total + file.size, 0);
    const existingTotal = availableFiles.reduce((total, file) => total + file.size, 0);
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (newFilesTotal + existingTotal > maxSize) {
      setError("Total ukuran file melebihi 100MB");
      return;
    }

    // Tambahkan file ke availableFiles
    const newFiles = selectedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.name.split('.').pop().toLowerCase(),
      id: Math.random().toString(36).substr(2, 9),
    }));

    setAvailableFiles(prev => [...prev, ...newFiles]);
    setError("");
  };

  // Handle assign file ke user - LANGSUNG dengan user yang sudah dipilih
  const handleAssignFile = (fileId) => {
    if (!selectedUserId) {
      setError("Pilih tujuan terlebih dahulu");
      return;
    }

    const file = availableFiles.find(f => f.id === fileId);
    
    // Tentukan nama user berdasarkan pilihan
    let userName = "";
    if (selectedUserId === "all-users") {
      userName = "Semua User";
    } else if (selectedUserId === "public") {
      userName = "Public";
    } else {
      const targetUser = users.find(u => u.id === selectedUserId);
      userName = targetUser?.full_name || targetUser?.email;
    }

    // Cek apakah file sudah diassign
    const existingAssignment = assignments.find(a => a.fileId === fileId);
    if (existingAssignment) {
      setError(`File "${file.name}" sudah diassign`);
      return;
    }

    setAssignments(prev => [...prev, {
      id: `${fileId}-${selectedUserId}-${Date.now()}`,
      fileId: fileId,
      userId: selectedUserId,
      fileName: file.name,
      userName: userName,
      file: file.file,
      fileSize: file.size,
      fileType: file.type,
      isPublic: selectedUserId === "public",
      isAllUsers: selectedUserId === "all-users"
    }]);

    // Hapus file dari availableFiles
    setAvailableFiles(prev => prev.filter(f => f.id !== fileId));
    setError("");
  };

  // Handle remove file dari available files
  const handleRemoveAvailableFile = (fileId) => {
    setAvailableFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Handle remove assignment
  const handleRemoveAssignment = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      // Kembalikan file ke availableFiles
      const file = {
        id: assignment.fileId,
        name: assignment.fileName,
        size: assignment.fileSize,
        file: assignment.file,
        type: assignment.fileType
      };
      setAvailableFiles(prev => [...prev, file]);
    }
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setUploadProgress({});

    try {
      // Validasi
      if (assignments.length === 0) {
        throw new Error("Assign minimal satu file ke user");
      }

      if (!formData.category) {
        throw new Error("Kategori wajib dipilih");
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Upload setiap assignment
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        
        try {
          setUploadProgress(prev => ({
            ...prev,
            [assignment.id]: {
              status: 'uploading',
              progress: 0,
              fileName: assignment.fileName,
              userName: assignment.userName,
              current: i + 1,
              total: assignments.length
            }
          }));

          // Simulasi progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const currentProgress = prev[assignment.id]?.progress || 0;
              if (currentProgress < 90) {
                return {
                  ...prev,
                  [assignment.id]: {
                    ...prev[assignment.id],
                    progress: currentProgress + 10
                  }
                };
              }
              return prev;
            });
          }, 200);

          // Buat file_path yang unik
          const timestamp = Date.now();
          const sanitizedFileName = assignment.fileName.replace(/\s+/g, '_');
          const file_path = `uploads/${timestamp}-${sanitizedFileName}`;

          // Tentukan target_user_id berdasarkan pilihan
          let targetUserId = null;
          if (assignment.userId === "all-users") {
            targetUserId = null; // null berarti semua user (Anda perlu menyesuaikan logika di service)
          } else if (assignment.userId === "public") {
            targetUserId = null; // null berarti public
          } else {
            targetUserId = assignment.userId;
          }

          // Buat payload untuk upload
          const payload = {
            file: assignment.file,
            file_path: file_path,
            title: assignment.fileName.replace(/\.[^/.]+$/, ""),
            category: formData.category,
            description: formData.description || "",
            file_name: assignment.fileName,
            size: assignment.fileSize,
            uploaded_by: user.id,
            target_user_id: targetUserId,
            // Tambahkan flag untuk tipe pengiriman
            is_for_all_users: assignment.userId === "all-users",
            is_public: assignment.userId === "public"
          };

          // Upload file
          const result = await uploadFileToStorageAndDB(payload);

          clearInterval(progressInterval);

          if (result.error) {
            throw new Error(result.error.message || result.error);
          }

          setUploadProgress(prev => ({
            ...prev,
            [assignment.id]: {
              ...prev[assignment.id],
              status: 'completed',
              progress: 100
            }
          }));

          successCount++;

        } catch (err) {
          console.error(`Error uploading ${assignment.fileName}:`, err);
          
          setUploadProgress(prev => ({
            ...prev,
            [assignment.id]: {
              ...prev[assignment.id],
              status: 'failed',
              progress: 0,
              error: err.message
            }
          }));

          errors.push(`${assignment.fileName} → ${assignment.userName}: ${err.message}`);
          errorCount++;
        }
      }

      // Tampilkan hasil
      if (errors.length > 0) {
        setError(`${successCount} berhasil, ${errorCount} gagal:\n${errors.slice(0, 5).join('\n')}`);
      } else {
        setSuccess(`✅ ${successCount} file berhasil diupload!`);
        
        // Reset form setelah sukses
        setTimeout(() => {
          setAssignments([]);
          setAvailableFiles([]);
          setFormData({
            category: "",
            description: ""
          });
          setSelectedUserId("");
        }, 2000);
      }

    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setAssignments([]);
    setAvailableFiles([]);
    setFormData({
      category: "",
      description: ""
    });
    setSelectedUserId("");
    setError("");
    setSuccess("");
    setUploadProgress({});
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900/30">
              <UploadIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Files</h1>
              <p className="text-gray-500 dark:text-gray-400">Upload file dan kirim ke user yang dituju</p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 dark:bg-green-900/20 dark:border-green-800">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-700 font-medium dark:text-green-300">Berhasil!</p>
                <p className="text-green-600 text-sm mt-1 dark:text-green-400">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 dark:bg-red-900/20 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium dark:text-red-300">Error!</p>
                <p className="text-red-600 text-sm mt-1 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection - LANGSUNG di atas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                1. Pilih Tujuan Pengiriman
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Pilih Tujuan --</option>
                
                {/* Opsi untuk Semua User */}
                <option value="all-users" className="font-semibold text-blue-600 dark:text-blue-400">
                  👥 Semua User (Untuk Semua User)
                </option>
                
                {/* Opsi untuk Public */}
                <option value="public" className="font-semibold text-green-600 dark:text-green-400">
                  🌐 Public (Untuk Semua Termasuk Pengunjung)
                </option>
                
                {/* Separator */}
                <option disabled className="bg-gray-100 dark:bg-gray-700">──────────</option>
                
                {/* User Individual */}
                <optgroup label="👤 User Individual">
                  {loadingUsers ? (
                    <option disabled>Loading users...</option>
                  ) : (
                    users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))
                  )}
                </optgroup>
              </select>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <UsersRound className="w-4 h-4" /> Semua User: Untuk semua user terdaftar
                </span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Globe className="w-4 h-4" /> Public: Untuk semua orang
                </span>
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                2. Upload File untuk Tujuan Tersebut
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors dark:border-gray-600 dark:hover:border-gray-500">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  multiple
                  disabled={!selectedUserId}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedUserId 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600'
                  }`}
                >
                  <UploadIcon className="w-4 h-4" />
                  {selectedUserId ? 'Pilih File' : 'Pilih Tujuan Dulu'}
                </label>
                <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">
                  Upload file untuk dikirim ke tujuan yang sudah dipilih
                </p>
              </div>
            </div>

            {/* Files to Assign - TAMPIL DENGAN TOMBOL ASSIGN */}
            {availableFiles.length > 0 && selectedUserId && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  3. File yang Siap Dikirim
                </h3>
                
                {availableFiles.map((file) => {
                  // Tentukan label tombol berdasarkan tujuan
                  let buttonLabel = "Kirim";
                  if (selectedUserId === "all-users") {
                    buttonLabel = "Kirim ke Semua User";
                  } else if (selectedUserId === "public") {
                    buttonLabel = "Publikasikan";
                  } else {
                    const targetUser = users.find(u => u.id === selectedUserId);
                    buttonLabel = `Kirim ke ${targetUser?.full_name?.split(' ')[0] || 'User'}`;
                  }

                  return (
                    <div key={file.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAssignFile(file.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                            {buttonLabel}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveAvailableFile(file.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Assigned Files List */}
            {assignments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  4. File Siap Dikirim ({assignments.length})
                </h3>
                
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 bg-green-50 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {assignment.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {assignment.userId === "all-users" ? (
                            <>
                              <UsersRound className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                Untuk Semua User
                              </span>
                            </>
                          ) : assignment.userId === "public" ? (
                            <>
                              <Globe className="w-4 h-4 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-semibold">
                                Public
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-300">
                                Dikirim ke: <span className="font-semibold">{assignment.userName}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Batalkan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                5. Kategori * (Akan diterapkan ke semua file)
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Pilih kategori</option>
                <option value="document">Document</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="archive">Archive</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                6. Deskripsi (Opsional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={4}
                placeholder="Masukkan deskripsi untuk semua file (opsional)"
              />
            </div>

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                {Object.entries(uploadProgress).map(([id, progress]) => (
                  <div key={id} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-700 dark:text-gray-300">
                        📄 {progress.fileName} → 👤 {progress.userName}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {progress.status === 'uploading' ? `${progress.progress}%` : 
                         progress.status === 'completed' ? '✓ Selesai' : '✗ Gagal'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-600">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          progress.status === 'completed' ? 'bg-green-500' :
                          progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress.progress}%` }}
                      ></div>
                    </div>
                    {progress.error && (
                      <p className="text-xs text-red-600 mt-1 dark:text-red-400">{progress.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading || assignments.length === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading {assignments.length} file...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4" />
                    Upload {assignments.length} File
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}