import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { supabase } from "../../supabase";
import {
  User, Mail, Calendar, Phone, Building, MapPin,
  Edit2, Save, X, Shield, CheckCircle,
  Briefcase, Globe, UserCircle, Key, Users
} from "lucide-react";
import DashboardSidebar from '../../components/DashboardSidebar';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { darkMode } = useDarkMode();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    memberSince: '',
    lastLogin: 'Baru saja',
    accountStatus: 'Aktif'
  });
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at, full_name, email")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetch profile:", error);
        return;
      }

      setProfile(data);
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile?.full_name || user.full_name || "",
        email: profile?.email || user.email || "",
        phone: user.phone || "",
        department: user.department || "",
        position: user.position || "",
        address: user.address || "",
        bio: user.bio || "",
        company: user.company || ""
      });

      // Set stats
      if (profile?.created_at) {
        const joinDate = new Date(profile.created_at);
        const now = new Date();
        const diffTime = Math.abs(now - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setStats(prev => ({
          ...prev,
          memberSince: `${diffDays} hari`,
          joinDate: joinDate.toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short",
          })
        }));
      }
    }
  }, [profile, user]);

  // Format date function
  const formatJoinDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    return new Date(dateString).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      department: profile?.department || "",
      position: profile?.position || "",
      address: profile?.address || "",
      bio: profile?.bio || "",
      company: profile?.company || ""
    });
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validasi form
      if (!editForm.full_name?.trim()) {
        throw new Error("Nama lengkap harus diisi");
      }

      const result = await updateProfile(editForm);
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Profil berhasil diperbarui!'
        });
        setIsEditing(false);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Gagal memperbarui profil'
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat memperbarui profil'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <DashboardSidebar />

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

        <div className="w-full max-w-6xl mx-auto px-4">
          {/* Profile Card - Modern & Clean */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            {/* Cover with Gradient */}
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500">
              
              {/* Role Badge - Modern */}
              <div className="absolute top-4 right-4">
                <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-sm bg-white/10 border border-white/20 text-white`}>
                  <Shield size={14} />
                  <span className="font-medium text-sm">
                    {user.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </div>
              </div>

              {/* Profile Picture - Modern Circle */}
              <div className="absolute -bottom-12 left-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-full overflow-hidden">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <UserCircle size={48} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Online Status Indicator */}
                  <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="pt-16 px-6 pb-6">
              {/* Header with Edit Button */}
              <div className="flex justify-between items-start gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">
                    {user.full_name || user.email.split('@')[0]}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                </div>
              </div>

              {/* Stats Grid - Minimal */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">Bergabung</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {profile?.created_at
                      ? formatJoinDate(profile.created_at)
                      : '-'}
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
                  <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">Role</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </p>
                </div>
              </div>

              {/* Profile Details */}
              {!isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg border-b pb-2 dark:text-white dark:border-gray-600">Kontak</h3>
                      <div className="space-y-3">
                        {user.phone && (
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Telepon</p>
                              <p className="font-medium text-gray-900 dark:text-white">{user.phone}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                          <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                            <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Work Info */}
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {user.company && (
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                            <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Perusahaan</p>
                              <p className="font-medium text-gray-900 dark:text-white">{user.company}</p>
                            </div>
                          </div>
                        )}

                        {user.department && (
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                            <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Departemen</p>
                              <p className="font-medium text-gray-900 dark:text-white">{user.department}</p>
                            </div>
                          </div>
                        )}

                        {user.position && (
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-700/50">
                            <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Posisi</p>
                              <p className="font-medium text-gray-900 dark:text-white">{user.position}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address & Bio */}
                  <div className="space-y-4">
                    {user.address && (
                      <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">Alamat</h3>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed dark:text-gray-300">
                          {user.address}
                        </p>
                      </div>
                    )}

                    {user.bio && (
                      <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">Tentang Saya</h3>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line dark:text-gray-300">
                          {user.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Edit Form - Modern */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Informasi Dasar</h3>
                      
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                          Telepon
                        </label>
                        <input
                          type="tel"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="0812-3456-7890"
                        />
                      </div>
                    </div>

                    {/* Work Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Informasi Pekerjaan</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                          Perusahaan
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={editForm.company}
                          onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                          placeholder="Nama perusahaan"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                          Departemen
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                          placeholder="IT, HRD, Marketing"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                          Posisi
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          placeholder="Manager, Staff"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                        Alamat
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={3}
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Masukkan alamat lengkap"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                        Tentang Saya
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={4}
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        placeholder="Ceritakan sedikit tentang diri Anda..."
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-600">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
