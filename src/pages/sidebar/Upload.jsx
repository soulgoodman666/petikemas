import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getAllUsers, uploadFileToStorageAndDB } from "../../services/fileService"; // PERUBAHAN DI SINI
import { Upload as UploadIcon, FileText, User, X, Check } from "lucide-react";

export default function Upload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    targetUserId: "",
    file: null
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

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }));
    }
  };

  // Handle form submit - FIXED VERSION
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validasi file
      if (!formData.file) {
        throw new Error("Pilih file terlebih dahulu");
      }

      if (!formData.title) {
        throw new Error("Judul file wajib diisi");
      }

      if (!formData.category) {
        throw new Error("Kategori wajib dipilih");
      }

      // Buat file_path yang unik
      const timestamp = Date.now();
      const sanitizedFileName = formData.file.name.replace(/\s+/g, '_');
      const file_path = `uploads/${timestamp}-${sanitizedFileName}`;

      console.log("📤 Starting upload process...");
      console.log("User ID:", user.id);
      console.log("File path:", file_path);

      // Buat payload untuk upload
      const payload = {
        file: formData.file,
        file_path: file_path,
        title: formData.title,
        category: formData.category,
        description: formData.description || "",
        file_name: formData.file.name,
        size: formData.file.size,
        uploaded_by: user.id, // Pastikan ini ada
        target_user_id: formData.targetUserId === "public" || formData.targetUserId === "" ? null : formData.targetUserId,
      };

      console.log("Upload payload:", payload);

      // Gunakan fungsi uploadFileToStorageAndDB yang melakukan keduanya
      const result = await uploadFileToStorageAndDB(payload);

      if (result.error) {
        console.error("Upload error details:", result.error);
        throw new Error(`Upload gagal: ${result.error.message || result.error}`);
      }

      console.log("✅ Upload successful:", result.data);

      // Reset form
      setFormData({
        title: "",
        category: "",
        description: "",
        targetUserId: "",
        file: null
      });

      setSuccess("File berhasil diupload!");
      
      // Navigate setelah 2 detik
      setTimeout(() => {
        navigate("/my-files");
      }, 2000);

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
      file: null
    });
    setError("");
    setSuccess("");
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900/30">
              <UploadIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload File</h1>
              <p className="text-gray-500 dark:text-gray-400">Upload dan bagikan file ke pengguna</p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 dark:bg-green-900/20 dark:border-green-800">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-green-700 font-medium dark:text-green-300">Berhasil!</p>
                <p className="text-green-600 text-sm mt-1 dark:text-green-400">{success}</p>
                <p className="text-green-500 text-xs mt-1 dark:text-green-500">Mengalihkan ke halaman files...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 dark:bg-red-900/20 dark:border-red-800">
              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-red-700 font-medium dark:text-red-300">Error!</p>
                <p className="text-red-600 text-sm mt-1 dark:text-red-400">{error}</p>
                {error.includes("row-level security") && (
                  <p className="text-red-500 text-xs mt-2 dark:text-red-500">
                    ⚠️ Error RLS: Perlu tambahkan policy INSERT di tabel files
                  </p>
                )}
                {error.includes("Bucket") && (
                  <p className="text-red-500 text-xs mt-2 dark:text-red-500">
                    ⚠️ Error Storage: Periksa bucket name dan policies
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                File *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors dark:border-gray-600 dark:hover:border-gray-500">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  required
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UploadIcon className="w-4 h-4" />
                  {formData.file ? "Ganti File" : "Pilih File"}
                </label>
                {formData.file && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{formData.file.name}</span>
                      <span className="text-gray-400">
                        ({(formData.file.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {!formData.file && "Belum ada file yang dipilih"}
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Masukkan judul file"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Category *
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
              </select>
            </div>

            {/* Target User */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                Target User (Opsional)
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
                Description (Opsional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={4}
                placeholder="Masukkan deskripsi file (opsional)"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading || !formData.file}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4" />
                    Upload File
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