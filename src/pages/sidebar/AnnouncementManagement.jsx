import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { supabase } from "../../supabase";
import { 
  Megaphone, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Users, 
  Image as ImageIcon,
  Eye  // Added missing import
} from "lucide-react";

export default function AnnouncementManagement() {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "general",
    is_active: true,
    target_user_id: "", // Empty string for public by default
    image: null, // For image upload
    image_url: "", // For existing image URL
  });

  // Image modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, message, type, is_active, target_user_id, image_url, created_at, created_by")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for target selection
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchUsers();
  }, []);

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

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        image_url: URL.createObjectURL(file) // For preview
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      let imageUrl = formData.image_url;

      // Upload image if selected
      if (formData.image) {
        const timestamp = Date.now();
        const fileName = `announcement-${timestamp}-${formData.image.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(fileName, formData.image);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('announcements')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const announcementData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        is_active: formData.is_active,
        target_user_id: formData.target_user_id === "" ? null : formData.target_user_id,
        image_url: imageUrl,
        created_by: user.id
      };

      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from("announcements")
          .update(announcementData)
          .eq("id", editingAnnouncement.id);

        if (error) throw error;
        setSuccess("Announcement berhasil diperbarui!");
      } else {
        // Create new announcement
        const { error } = await supabase.from("announcements").insert(announcementData);

        if (error) throw error;
        setSuccess("Announcement berhasil ditambahkan!");
      }

      // Reset form and close modal
      setFormData({
        title: "",
        message: "",
        type: "general",
        is_active: true,
        target_user_id: "",
        image: null,
        image_url: "",
      });
      setEditingAnnouncement(null);
      setShowModal(false);

      // Refresh announcements
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle edit
  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type || "general",
      is_active: announcement.is_active,
      target_user_id: announcement.target_user_id || "", // Empty string for public
      image: null, // Reset image for new upload
      image_url: announcement.image_url || "", // Keep existing image URL
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (announcement) => {
    if (!confirm("Apakah Anda yakin ingin menghapus announcement ini?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcement.id);

      if (error) throw error;
      setSuccess("Announcement berhasil dihapus!");
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (announcement) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: !announcement.is_active })
        .eq("id", announcement.id);

      if (error) throw error;
      setSuccess(
        `Announcement berhasil ${
          announcement.is_active ? "dinonaktifkan" : "diaktifkan"
        }!`
      );
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="ml-30 p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="ml-30 p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 rounded-xl border bg-green-50 border-green-200 text-green-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          {/* Header with Add Button */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daftar Announcement</h2>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                  {announcements.filter(a => a.is_active).length} aktif dari {announcements.length} total
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus size={16} />
                Tambah Announcement
              </button>
            </div>
          </div>

          {/* Announcements List */}
          <div className="p-6">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada announcement</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                      announcement.is_active
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {announcement.title}
                          </h3>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            announcement.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {announcement.is_active ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </div>

                        {/* Display Image */}
                        {announcement.image_url && (
                          <div className="mb-3">
                            <img
                              src={announcement.image_url}
                              alt={announcement.title}
                              className="max-w-xs rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleImageClick(announcement.image_url, announcement.title)}
                            />
                          </div>
                        )}

                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {announcement.message}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Type: {announcement.type || 'general'}</span>
                          <span>
                            {announcement.target_user_id ? (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {users.find(u => u.id === announcement.target_user_id)?.full_name || 'User Spesifik'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Megaphone className="w-3 h-3" />
                                Public
                              </span>
                            )}
                          </span>
                          <span>
                            {new Date(announcement.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(announcement)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            announcement.is_active
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {announcement.is_active ? 'Non-aktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => handleDelete(announcement)}
                          className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingAnnouncement ? "Edit Announcement" : "Tambah Announcement"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingAnnouncement(null);
                      setFormData({
                        title: "",
                        message: "",
                        type: "general",
                        is_active: true,
                        target_user_id: "", // Empty string for public
                        image: null,
                        image_url: "",
                      });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Judul
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Masukkan judul announcement"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Foto Announcement (Opsional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors dark:border-gray-600 dark:hover:border-gray-500">
                      <input
                        type="file"
                        onChange={handleImageChange}
                        className="hidden"
                        id="announcement-image"
                        accept="image/*"
                      />
                      <label
                        htmlFor="announcement-image"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {formData.image ? "Ganti Foto" : "Pilih Foto"}
                      </label>
                      
                      {formData.image && (
                        <div className="mt-4">
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="mx-auto max-h-40 rounded-lg shadow-sm"
                          />
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {formData.image.name}
                          </p>
                        </div>
                      )}
                      
                      {!formData.image && formData.image_url && (
                        <div className="mt-4">
                          <img
                            src={formData.image_url}
                            alt="Current"
                            className="mx-auto max-h-40 rounded-lg shadow-sm"
                          />
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Foto saat ini
                          </p>
                        </div>
                      )}
                      
                      {!formData.image && !formData.image_url && (
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                          Belum ada foto yang dipilih
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Pesan
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Masukkan pesan announcement"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Tipe
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="general">General *biru</option>
                      <option value="urgent">Urgent *merah</option>
                      <option value="important">Important *kuning</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Target User
                    </label>
                    <select
                      value={formData.target_user_id}
                      onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">🌐 Public (Semua User)</option>
                      {loadingUsers ? (
                        <option disabled>Loading users...</option>
                      ) : users.length === 0 ? (
                        <option disabled>Tidak ada user tersedia</option>
                      ) : (
                        users.map((user) => (
                          <option key={user.id} value={user.id}>
                            👤 {user.full_name || user.email}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      💡 Pilih "Public" untuk mengirim ke semua user, atau pilih user tertentu
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Aktif
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAnnouncement(null);
                      setFormData({
                        title: "",
                        message: "",
                        type: "general",
                        is_active: true,
                        target_user_id: "", // Empty string for public
                        image: null,
                        image_url: "",
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingAnnouncement ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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