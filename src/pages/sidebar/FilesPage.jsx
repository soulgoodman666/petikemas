import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getAllFiles, getMyFiles, deleteFile } from "../../services/fileService";
import { FileText, Trash2, AlertTriangle } from "lucide-react";

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        let result;
        
        if (user?.isAdmin) {
          // Admin lihat semua file
          result = await getAllFiles();
        } else {
          // User lihat file yang bisa diakses (pribadi + dibagikan)
          result = await getMyFiles(user.id);
        }

        if (result.error) {
          console.error("Error fetch files:", result.error);
        } else {
          setFiles(result.data || []);
        }
      } catch (error) {
        console.error("Error in fetchFiles:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchFiles();
  }, [user]);

  // Handle delete file
  const handleDeleteFile = async (fileId, filePath) => {
    setDeleting(true);
    
    try {
      const result = await deleteFile(fileId, filePath);
      
      if (result.error) {
        console.error("Error deleting file:", result.error);
        alert("Gagal menghapus file: " + result.error);
      } else {
        // Remove file from state
        setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
        console.log("✅ File deleted successfully");
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Error in handleDeleteFile:", error);
      alert("Terjadi kesalahan saat menghapus file");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p>Loading files...</p>;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 dark:text-white">Daftar File</h1>

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Konfirmasi Hapus File
                  </h3>
                </div>
                
                <p className="text-gray-600 mb-6 dark:text-gray-300">
                  Apakah Anda yakin ingin menghapus file "<strong>{deleteConfirm.file_name}</strong>"? 
                  File ini akan dihapus secara permanen dan tidak dapat dikembalikan.
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

          {files.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Tidak ada file</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Nama File</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Judul</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Kategori</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Uploader</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Target User</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Tanggal</th>
                    {user?.isAdmin && (
                      <th className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">{file.file_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{file.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs dark:bg-blue-900/30 dark:text-blue-400">
                          {file.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {file.owner ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{file.owner.full_name}</div>
                            <div className="text-gray-500 text-xs dark:text-gray-400">{file.owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {file.target_user ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{file.target_user.full_name}</div>
                            <div className="text-gray-500 text-xs dark:text-gray-400">{file.target_user.email}</div>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs dark:bg-gray-700 dark:text-gray-300">
                            Untuk Semua
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {new Date(file.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      {user?.isAdmin && (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
