import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getAllUsers, uploadFileToStorageAndDB } from "../../services/fileService";
import { Upload as UploadIcon, FileText, User, X, Check, Trash2, FolderOpen } from "lucide-react";

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
  const [completedUploads, setCompletedUploads] = useState([]);

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

  // Form state - sekarang menggunakan array files
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    targetUserId: "",
    files: [] // Array untuk multiple files
  });

  // Load users untuk dropdown
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await getAllUsers();
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load users saat component dimuat
  useEffect(() => {
    loadUsers();
  }, []);

  // Handle multiple file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    // Validasi jumlah file
    if (selectedFiles.length > 10) {
      setError("Maksimal 10 file per upload");
      return;
    }

    // Validasi ukuran total
    const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (totalSize > maxSize) {
      setError("Total ukuran file melebihi 100MB");
      return;
    }

    // Tambahkan file ke array dengan metadata
    const newFiles = selectedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Math.random().toString(36).substr(2, 9), // ID unik untuk setiap file
      status: 'pending'
    }));

    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));

    // Reset error jika ada
    setError("");
  };

  // Handle remove individual file
  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
  };

  // Handle remove all files
  const handleRemoveAllFiles = () => {
    setFormData(prev => ({
      ...prev,
      files: []
    }));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle form submit untuk multiple files
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setUploadProgress({});
    setCompletedUploads([]);

    try {
      // Validasi files
      if (formData.files.length === 0) {
        throw new Error("Pilih minimal satu file");
      }

      if (!formData.category) {
        throw new Error("Kategori wajib dipilih");
      }

      // Upload files secara sequential
      const uploadedFiles = [];
      const errors = [];

      for (let i = 0; i < formData.files.length; i++) {
        const fileData = formData.files[i];
        
        try {
          // Update progress untuk file ini
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: {
              status: 'uploading',
              progress: 0,
              currentFile: i + 1,
              totalFiles: formData.files.length
            }
          }));

          // Buat file_path yang unik
          const timestamp = Date.now();
          const sanitizedFileName = fileData.name.replace(/\s+/g, '_');
          const file_path = `uploads/${timestamp}-${sanitizedFileName}`;

          // Buat payload untuk upload
          const payload = {
            file: fileData.file,
            file_path: file_path,
            title: formData.title || fileData.name, // Gunakan custom title atau nama file
            category: formData.category,
            description: formData.description || "",
            file_name: fileData.name,
            size: fileData.size,
            uploaded_by: user.id,
            target_user_id: formData.targetUserId === "public" || formData.targetUserId === "" ? null : formData.targetUserId,
          };

          // Simulasi progress (untuk UI feedback)
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const currentProgress = prev[fileData.id]?.progress || 0;
              if (currentProgress < 90) {
                return {
                  ...prev,
                  [fileData.id]: {
                    ...prev[fileData.id],
                    progress: currentProgress + 10
                  }
                };
              }
              return prev;
            });
          }, 100);

          // Upload file
          const result = await uploadFileToStorageAndDB(payload);

          clearInterval(progressInterval);

          if (result.error) {
            throw new Error(`Upload gagal: ${result.error.message || result.error}`);
          }

          // Update progress menjadi completed
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: {
              status: 'completed',
              progress: 100,
              currentFile: i + 1,
              totalFiles: formData.files.length
            }
          }));

          uploadedFiles.push({
            name: fileData.name,
            title: payload.title,
            success: true
          });

          setCompletedUploads(prev => [...prev, {
            id: fileData.id,
            name: fileData.name,
            success: true
          }]);

        } catch (fileError) {
          console.error(`❌ Error uploading ${fileData.name}:`, fileError);
          
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: {
              status: 'failed',
              progress: 0,
              currentFile: i + 1,
              totalFiles: formData.files.length,
              error: fileError.message
            }
          }));

          errors.push({
            name: fileData.name,
            error: fileError.message
          });
        }
      }

      // Tampilkan hasil upload
      if (errors.length > 0) {
        const errorMessages = errors.map(e => `${e.name}: ${e.error}`).join('\n');
        setError(`Beberapa file gagal diupload:\n${errorMessages}`);
      }

      if (uploadedFiles.length > 0) {
        const successMessage = uploadedFiles.length === 1 
          ? "File berhasil diupload!" 
          : `${uploadedFiles.length} file berhasil diupload!`;
        
        setSuccess(successMessage);
        
        // Reset form setelah beberapa detik
        setTimeout(() => {
          if (errors.length === 0) {
            setFormData({
              title: "",
              category: "",
              description: "",
              targetUserId: "",
              files: []
            });
          }
          
          if (uploadedFiles.length > 0) {
            // Navigate setelah 2 detik
            setTimeout(() => {
              navigate("/my-files");
            }, 2000);
          }
        }, 1500);
      }

    } catch (err) {
      console.error("❌ Error in handleSubmit:", err);
      setError(err.message || "Terjadi kesalahan saat upload file");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      title: "",
      category: "",
      description: "",
      targetUserId: "",
      files: []
    });
    setError("");
    setSuccess("");
    setUploadProgress({});
    setCompletedUploads([]);
  };

  // Hitung total size
  const totalSize = formData.files.reduce((total, file) => total + file.size, 0);

  // Show loading while checking auth
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
              <p className="text-gray-500 dark:text-gray-400">Upload dan bagikan file ke pengguna</p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 dark:bg-green-900/20 dark:border-green-800">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-green-700 font-medium dark:text-green-300">Berhasil!</p>
                <p className="text-green-600 text-sm mt-1 dark:text-green-400">{success}</p>
                
                {completedUploads.length > 0 && (
                  <div className="mt-2">
                    <p className="text-green-500 text-xs font-medium mb-1 dark:text-green-500">File yang berhasil diupload:</p>
                    <ul className="text-green-600 text-xs space-y-1 dark:text-green-400">
                      {completedUploads.slice(0, 5).map((file, idx) => (
                        <li key={file.id} className="flex items-center gap-2">
                          <Check className="w-3 h-3" />
                          <span className="truncate">{file.name}</span>
                        </li>
                      ))}
                      {completedUploads.length > 5 && (
                        <li className="text-green-500 italic">... dan {completedUploads.length - 5} file lainnya</li>
                      )}
                    </ul>
                  </div>
                )}
                
                <p className="text-green-500 text-xs mt-3 dark:text-green-500">
                  {completedUploads.length === formData.files.length && formData.files.length > 0 
                    ? "Mengalihkan ke halaman files..." 
                    : "Beberapa file masih diproses..."}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 dark:bg-red-900/20 dark:border-red-800">
              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-red-700 font-medium dark:text-red-300">Error!</p>
                <p className="text-red-600 text-sm mt-1 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Multiple File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Files * (Multiple files supported)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors dark:border-gray-600 dark:hover:border-gray-500">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  multiple
                  required={formData.files.length === 0}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UploadIcon className="w-4 h-4" />
                  {formData.files.length > 0 ? "Tambah File Lain" : "Pilih Files"}
                </label>
                
                {/* File summary */}
                {formData.files.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formData.files.length} file dipilih • {formatFileSize(totalSize)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Maksimal 10 file • Total maksimal 100MB
                        </p>
                      </div>
                      {formData.files.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRemoveAllFiles}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus Semua
                        </button>
                      )}
                    </div>

                    {/* Files list */}
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {formData.files.map((file) => (
                        <div 
                          key={file.id} 
                          className={`p-3 rounded-lg flex items-center justify-between ${
                            uploadProgress[file.id]?.status === 'uploading' 
                              ? 'bg-blue-50 dark:bg-blue-900/20' 
                              : uploadProgress[file.id]?.status === 'completed'
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : uploadProgress[file.id]?.status === 'failed'
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-xs dark:text-gray-300">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)}
                              </p>
                              
                              {/* Upload progress */}
                              {uploadProgress[file.id] && (
                                <div className="mt-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-600">
                                      <div 
                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 dark:bg-blue-400"
                                        style={{ width: `${uploadProgress[file.id].progress}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {uploadProgress[file.id].status === 'uploading' ? 'Uploading...' :
                                       uploadProgress[file.id].status === 'completed' ? '✓ Selesai' :
                                       uploadProgress[file.id].status === 'failed' ? '✗ Gagal' : ''}
                                    </span>
                                  </div>
                                  {uploadProgress[file.id].error && (
                                    <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                                      {uploadProgress[file.id].error}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-gray-400 hover:text-red-600 p-1 dark:hover:text-red-400"
                            disabled={uploadProgress[file.id]?.status === 'uploading'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {formData.files.length === 0 && (
                  <div className="mt-4">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-2 dark:text-gray-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Drag & drop files atau klik untuk memilih
                    </p>
                    <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                      Support multiple files (maks. 10 files, total 100MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Title (optional for bulk upload) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Title (Opsional untuk semua file)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Judul untuk semua file (kosongkan untuk gunakan nama file masing-masing)"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Jika dikosongkan, setiap file akan menggunakan nama file aslinya sebagai judul
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Category * (Akan diterapkan ke semua file)
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

            {/* Target User */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Target User (Opsional - Akan diterapkan ke semua file)
              </label>
              <select
                value={formData.targetUserId}
                onChange={(e) => setFormData(prev => ({ ...prev, targetUserId: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Pilih User Penerima --</option>

                {loadingUsers ? (
                  <option disabled>Loading users...</option>
                ) : users.length === 0 ? (
                  <option disabled>Klik untuk memuat daftar user</option>
                ) : (
                  <>
                    <option value="public">🌐 Semua User (Public)</option>
                    <optgroup label="👥 User Terdaftar">
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.email} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                💡 Pilih "Semua User" untuk file publik, atau pilih user tertentu
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Description (Opsional - Akan diterapkan ke semua file)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={4}
                placeholder="Masukkan deskripsi untuk semua file (opsional)"
              />
            </div>

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
                disabled={loading || formData.files.length === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading ({Object.values(uploadProgress).filter(p => p.status === 'uploading').length} files)...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4" />
                    Upload {formData.files.length > 0 ? `${formData.files.length} Files` : 'Files'}
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