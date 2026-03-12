import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getAllFiles, getMyFiles, deleteFile } from "../../services/fileService";
import { 
  FileText, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Trash,
  Search,
  X
} from "lucide-react";
import { supabase } from "../../supabase";

export default function FilesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // State untuk search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState("all"); // all, name, title, user, category
  
  // State untuk multiple selection
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Debug: cek role user
  useEffect(() => {
    console.log("Current role:", role);
    console.log("Is Admin:", role === "admin");
  }, [role]);

  // Setup realtime subscription untuk mendengarkan perubahan
  useEffect(() => {
    if (authLoading) return;

    // Buat subscription untuk tabel files
    const subscription = supabase
      .channel('files-changes-admin')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          console.log('File deleted:', payload);
          // Hapus file dari state ketika ada penghapusan
          setFiles(prevFiles => prevFiles.filter(file => file.id !== payload.old.id));
          // Hapus juga dari selected files jika ada
          setSelectedFiles(prev => prev.filter(id => id !== payload.old.id));
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
          console.log('File inserted:', payload);
          // Refresh files ketika ada penambahan
          fetchFiles();
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
          console.log('File updated:', payload);
          // Update file di state ketika ada perubahan
          setFiles(prevFiles => 
            prevFiles.map(file => 
              file.id === payload.new.id ? { ...file, ...payload.new } : file
            )
          );
        }
      )
      .subscribe();

    // Cleanup subscription ketika component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [authLoading]);

  const fetchFiles = async () => {
    setLoading(true);

    try {
      if (!user?.id) {
        setFiles([]);
        return;
      }

      let result;

      // Gunakan role dari context
      if (role === "admin") {
        console.log("Fetching all files as admin");
        result = await getAllFiles();
      } else {
        console.log("Fetching user files as:", role);
        result = await getMyFiles(user.id);
      }

      if (result.error) {
        console.error(result.error);
        setFiles([]);
      } else {
        console.log("Files fetched:", result.data);
        setFiles(Array.isArray(result.data) ? result.data : []);
        // Reset selection ketika fetch ulang
        setSelectedFiles([]);
        setSelectAll(false);
      }
    } catch (err) {
      console.error(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk filter files berdasarkan search
  useEffect(() => {
    if (!files.length) {
      setFilteredFiles([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredFiles(files);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    const filtered = files.filter(file => {
      switch (searchBy) {
        case "name":
          return file.file_name?.toLowerCase().includes(term);
        
        case "title":
          return file.title?.toLowerCase().includes(term);
        
        case "user":
          return (
            file.target_user?.full_name?.toLowerCase().includes(term) ||
            file.target_user?.email?.toLowerCase().includes(term)
          );
        
        case "category":
          return file.category?.toLowerCase().includes(term);
        
        case "all":
        default:
          return (
            file.file_name?.toLowerCase().includes(term) ||
            file.title?.toLowerCase().includes(term) ||
            file.category?.toLowerCase().includes(term) ||
            file.target_user?.full_name?.toLowerCase().includes(term) ||
            file.target_user?.email?.toLowerCase().includes(term) ||
            (file.target_user === null && "untuk semua".includes(term))
          );
      }
    });

    setFilteredFiles(filtered);
    
    // Reset selection jika file yang dipilih tidak ada di hasil filter
    setSelectedFiles(prev => prev.filter(id => filtered.some(f => f.id === id)));
    setSelectAll(false);
    
  }, [searchTerm, searchBy, files]);

  // Fungsi untuk refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [user, role, authLoading]);

  // Handle single file delete
  const handleDeleteFile = async (fileId, filePath) => {
    setDeleting(true);

    try {
      const result = await deleteFile(fileId, filePath);

      if (result.error) {
        console.error("Error deleting file:", result.error);
        alert("Gagal menghapus file: " + result.error);
      } else {
        console.log("✅ File deleted successfully");
        setDeleteConfirm(null);
        // Hapus dari selected files jika ada
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
      }
    } catch (error) {
      console.error("Error in handleDeleteFile:", error);
      alert("Terjadi kesalahan saat menghapus file");
    } finally {
      setDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    setDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId);
      if (!file) continue;

      try {
        const result = await deleteFile(fileId, file.file_path);
        if (result.error) {
          console.error(`Error deleting file ${fileId}:`, result.error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error in handleDeleteFile for ${fileId}:`, error);
        errorCount++;
      }
    }

    setBulkDeleteConfirm(false);
    setSelectedFiles([]);
    setSelectAll(false);
    setDeleting(false);

    // Tampilkan ringkasan hasil
    if (errorCount > 0) {
      alert(`${successCount} file berhasil dihapus, ${errorCount} file gagal dihapus`);
    } else {
      alert(`${successCount} file berhasil dihapus`);
    }
  };

  // Handle select/deselect all files
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle select/deselect single file
  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        const newSelected = prev.filter(id => id !== fileId);
        setSelectAll(newSelected.length === filteredFiles.length);
        return newSelected;
      } else {
        const newSelected = [...prev, fileId];
        setSelectAll(newSelected.length === filteredFiles.length);
        return newSelected;
      }
    });
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchBy("all");
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Memuat file...</p>
      </div>
    </div>
  );

  const handleViewFile = (filePath) => {
    if (!filePath) return;

    const { data } = supabase
      .storage
      .from("files")
      .getPublicUrl(filePath);

    window.open(data.publicUrl, "_blank");
  };

  // Tentukan apakah user adalah admin
  const isAdmin = role === "admin";

  return (
    <div className="p-4 w-full">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Daftar File
            </h1>
            
            <div className="flex items-center gap-2">
              {/* Bulk Delete Button - hanya muncul jika ada file yang dipilih */}
              {isAdmin && selectedFiles.length > 0 && (
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  title={`Hapus ${selectedFiles.length} file terpilih`}
                >
                  <Trash className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">
                    Hapus ({selectedFiles.length})
                  </span>
                </button>
              )}

              {/* Tombol Refresh */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Refresh daftar file"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm hidden sm:inline">
                  {refreshing ? 'Menyegarkan...' : 'Refresh'}
                </span>
              </button>

              {/* Info role - bisa dihapus jika tidak diperlukan */}
              {isAdmin && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs dark:bg-blue-900/30 dark:text-blue-400">
                  Admin Mode
                </span>
              )}
            </div>
          </div>

          {/* SEARCH SECTION - DITAMBAHKAN DI SINI */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari file..."
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Info */}
            {searchTerm && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  Menampilkan {filteredFiles.length} dari {files.length} file
                  {searchTerm && ` untuk pencarian "${searchTerm}"`}
                  {searchBy !== "all" && ` pada kolom ${
                    searchBy === "name" ? "Nama File" :
                    searchBy === "title" ? "Judul" :
                    searchBy === "user" ? "Target User" :
                    searchBy === "category" ? "Kategori" : ""
                  }`}
                </p>
                {filteredFiles.length === 0 && files.length > 0 && (
                  <button
                    onClick={handleClearSearch}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Reset pencarian
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Single Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Konfirmasi Hapus File
                  </h3>
                </div>

                <p className="text-gray-600 mb-6 dark:text-gray-300">
                  Apakah Anda yakin ingin menghapus file "<strong>{deleteConfirm.file_name}</strong>"?
                  File ini akan dihapus secara permanen dan akan langsung hilang dari tampilan semua user.
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
                    onClick={() => handleDeleteFile(deleteConfirm.id, deleteConfirm.file_path)}
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

          {/* Bulk Delete Confirmation Modal */}
          {bulkDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Konfirmasi Hapus Multiple File
                  </h3>
                </div>

                <p className="text-gray-600 mb-4 dark:text-gray-300">
                  Apakah Anda yakin ingin menghapus <strong>{selectedFiles.length} file</strong> yang dipilih?
                </p>
                
                <div className="max-h-40 overflow-y-auto mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  {files
                    .filter(file => selectedFiles.includes(file.id))
                    .map(file => (
                      <div key={file.id} className="text-sm text-gray-600 dark:text-gray-400 py-1 border-b last:border-0 border-gray-200 dark:border-gray-600">
                        • {file.file_name}
                      </div>
                    ))
                  }
                </div>

                <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                  File-file ini akan dihapus secara permanen dan akan langsung hilang dari tampilan semua user.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setBulkDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Menghapus {selectedFiles.length} file...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Hapus {selectedFiles.length} File
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Tidak ada file</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    {/* Checkbox column untuk admin */}
                    {isAdmin && (
                      <th className="text-left py-3 px-2 w-10">
                        <button
                          onClick={handleSelectAll}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title={selectAll ? "Unselect all" : "Select all"}
                        >
                          {selectAll ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 w-64">Nama File</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 w-48">Judul</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 w-32">Kategori</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 w-48">Target User</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 w-40">Tanggal Dikirim</th>
                    {isAdmin && (
                      <th className="text-center py-3 px-4 text-gray-700 dark:text-gray-300 w-20">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Tidak ada file yang sesuai dengan pencarian "{searchTerm}"
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => (
                      <tr 
                        key={file.id} 
                        className={`border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 transition-colors
                          ${selectedFiles.includes(file.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        {/* Checkbox untuk setiap baris (hanya untuk admin) */}
                        {isAdmin && (
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleSelectFile(file.id)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              {selectedFiles.includes(file.id) ? (
                                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            <button
                              onClick={() => handleViewFile(file.file_path)}
                              className="font-medium text-blue-600 hover:underline dark:text-blue-400 truncate max-w-[200px]"
                              title={file.file_name}
                            >
                              {file.file_name}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white truncate max-w-[150px]" title={file.title}>
                          {file.title || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs dark:bg-blue-900/30 dark:text-blue-400">
                            {file.category || "Umum"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {file.target_user ? (
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]" title={file.target_user.full_name}>
                                {file.target_user.full_name}
                              </div>
                              <div className="text-gray-500 text-xs dark:text-gray-400 truncate max-w-[150px]" title={file.target_user.email}>
                                {file.target_user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs dark:bg-gray-700 dark:text-gray-300">
                              Untuk Semua
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white text-sm">
                          {new Date(file.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setDeleteConfirm(file)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                              title="Hapus File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Informasi jumlah file terpilih */}
              {isAdmin && selectedFiles.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    {selectedFiles.length} file terpilih
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFiles([]);
                      setSelectAll(false);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Hapus pilihan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}