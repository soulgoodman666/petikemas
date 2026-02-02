import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import { getAllFiles, getMyFiles } from "../../services/fileService";
import { FileText } from "lucide-react";

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p>Loading files...</p>;

    return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 dark:text-white">Daftar File</h1>

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
