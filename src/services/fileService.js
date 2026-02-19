import { supabase} from "../supabase";

/* =========================
   ADMIN
========================= */

// Admin - Get all files dengan user info
export const getAllFiles = async () => {
  try {
    console.log("🔍 Admin fetching all files...");

    // Validate Supabase client
    if (!supabase) {
      const error = new Error("Supabase client not initialized");
      console.error("❌ Supabase client error:", error.message);
      return { data: null, error };
    }

    // Ambil semua files
    const { data: files, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching files:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status
      });
      throw new Error(`Failed to fetch files: ${error.message} (Code: ${error.code})`);
    }

    console.log("📊 Files fetched:", files?.length || 0, "files");

    if (!files || files.length === 0) {
      console.log("⚠️ No files found in database");
      return { data: [], error: null };
    }

    // Ambil semua user IDs dari files
    const userIds = new Set();
    files?.forEach(file => {
      if (file.uploaded_by) userIds.add(file.uploaded_by);
      if (file.target_user_id) userIds.add(file.target_user_id);
    });

    console.log("👥 User IDs to fetch:", Array.from(userIds));

    // Skip user fetching if no user IDs
    if (userIds.size === 0) {
      console.log("ℹ️ No user IDs to fetch, returning files without user info");
      const filesWithUsers = files?.map(file => ({
        ...file,
        owner: null,
        target_user: null
      })) || [];
      return { data: filesWithUsers, error: null };
    }

    // Ambil data user
    const { data: users, error: userError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", Array.from(userIds));

    if (userError) {
      console.error("❌ Error fetching users:", {
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code,
        status: userError.status
      });
      // Continue with files but without user info
      console.warn("⚠️ Continuing without user info due to profile fetch error");
    }

    console.log("👥 Users fetched:", users?.length || 0, "users");

    // Gabungkan data
    const filesWithUsers = files?.map(file => ({
      ...file,
      owner: users?.find(u => u.id === file.uploaded_by) || null,
      target_user: users?.find(u => u.id === file.target_user_id) || null
    })) || [];

    console.log("✅ Final files with users:", filesWithUsers.length, "files");

    return { data: filesWithUsers, error: null };
  } catch (error) {
    if (error?.name === "AbortError") {
      console.warn("⛔ getAllFiles aborted");
      return { data: [], error: null };
    }

    console.error("❌ Error in getAllFiles:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return {
      data: [], // 🔑 WAJIB array
      error: {
        message: error.message || "Unknown error",
        code: error.code || "UNKNOWN",
        status: error.status || 500
      }
    };
  }
};

// Storage bucket name - CONSISTENT ACROSS ALL FUNCTIONS
const STORAGE_BUCKET = 'files';

// Upload file ke storage saja (basic storage upload)
export const uploadFileToStorage = async (file, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in uploadFileToStorage:", error);
    return { data: null, error };
  }
};

  // Admin - Delete file (from database and storage)
export const deleteFile = async (fileId, filePath) => {
  try {
    // 1. Delete from storage if filePath provided
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue with database delete even if storage fails
      }
    }

    // 2. Delete from database
    const { error } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error in deleteFile:", error);
    return { error };
  }
};

  // User - Get files yang bisa dia lihat
export const getMyFiles = async (userId) => {
  try {
    if (!userId) throw new Error("User ID diperlukan");

    console.log("🔍 Fetching files for user:", userId);

    // Test query: Coba ambil semua file public dulu
    console.log("🧪 Testing public files query...");
    const { data: publicFilesTest, error: publicError } = await supabase
      .from("files")
      .select("*")
      .is("target_user_id", null)
      .order("created_at", { ascending: false });

    console.log("📊 Public files test:", {
      count: publicFilesTest?.length || 0,
      error: publicError,
      files: publicFilesTest?.map(f => ({
        id: f.id,
        title: f.title,
        target_user_id: f.target_user_id,
        uploaded_by: f.uploaded_by
      }))
    });

    // Query utama
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .or(`target_user_id.eq.${userId},target_user_id.is.null`)
      .order("created_at", { ascending: false });

    console.log("📊 Main query result:", { data: data?.length || 0, error });

    if (data) {
      console.log("📋 Files fetched:", data.map(f => ({
        id: f.id,
        title: f.title,
        target_user_id: f.target_user_id,
        uploaded_by: f.uploaded_by
      })));
    }

    if (error) {
      console.error("❌ Supabase error:", error);
      // Fallback: ambil semua lalu filter di client
      console.log("🔄 Using fallback method...");
      const { data: allFiles } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("📊 All files from fallback:", allFiles?.length || 0);

      const accessibleFiles = allFiles?.filter(file =>
        !file.target_user_id || file.target_user_id === userId
      ) || [];

      console.log("✅ Filtered accessible files:", accessibleFiles.map(f => ({
        id: f.id,
        title: f.title,
        target_user_id: f.target_user_id,
        uploaded_by: f.uploaded_by
      })));

      return { data: accessibleFiles, error: null };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("❌ Error in getMyFiles:", error);
    return { data: [], error: error.message };
  }
};

  // User - Get files dengan detail user
export const getMyFilesWithDetails = async (userId) => {
  try {
    // 1. Ambil files yang bisa diakses
    const { data: files, error: filesError } = await getMyFiles(userId);

    if (filesError) throw filesError;
    if (!files.data || files.data.length === 0) {
      return { data: [], error: null };
    }

    // 2. Ambil semua user yang terlibat
    const userIds = new Set();
    files.data.forEach(file => {
      if (file.uploaded_by) userIds.add(file.uploaded_by);
      if (file.target_user_id) userIds.add(file.target_user_id);
    });

    const { data: users } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", Array.from(userIds));

    // 3. Gabungkan data
    const filesWithDetails = files.data.map(file => ({
      ...file,
      owner: users?.find(u => u.id === file.uploaded_by) || null,
      target_user: users?.find(u => u.id === file.target_user_id) || null
    }));

    return { data: filesWithDetails, error: null };
  } catch (error) {
    console.error("Error in getMyFilesWithDetails:", error);
    return { data: [], error: error.message };
  }
};

  /* =========================
   STORAGE & DOWNLOAD
========================= */

// Get public URL untuk download (gunakan ini untuk download)
export const getDownloadUrl = (filePath) => {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
};

// Alternative: Get signed URL (lebih aman untuk private files)
export const getSignedUrl = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60); // URL berlaku 60 detik

    if (error) throw error;
    return { url: data.signedUrl, error: null };
  } catch (error) {
    return { url: null, error };
  }
};

  // Upload file dengan storage dan database (CONSOLIDATED VERSION)
export const uploadFileToStorageAndDB = async (payload) => {
  try {
    const {
      file,
      file_path,
      title,
      category,
      description,
      file_name,
      size,
      uploaded_by,
      target_user_id,
    } = payload;

    console.log("📤 Uploading file to storage...");

    // 1. Upload ke storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(file_path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError);
      throw uploadError;
    }

    console.log("✅ Storage upload success");
    console.log("📝 Inserting to database...");

    // 2. Simpan metadata ke database
    const { data, error: dbError } = await supabase
      .from("files")
      .insert({
        title,
        category,
        description,
        file_name,
        file_path, // 🔑 WAJIB path relatif
        size,
        uploaded_by,
        target_user_id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database insert error:", dbError);
      throw dbError;
    }

    console.log("✅ Database insert success:", data);
    return { data, error: null };

  } catch (error) {
    console.error("❌ Error in uploadFileToStorageAndDB:", error);
    return { data: null, error };
  }
};

  // Simple upload function (mirip upload.js style but konsisten)
export const uploadFile = async (file, metadata = {}) => {
  try {
    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Gagal mengupload file');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Store file metadata in database
    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .insert({
        title: metadata.title || file.name,
        category: metadata.category || 'other',
        description: metadata.description || '',
        file_name: file.name,
        file_path: filePath,
        size: file.size,
        uploaded_by: metadata.uploaded_by,
        target_user_id: metadata.target_user_id || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Gagal menyimpan metadata file');
    }

    return { data: fileData, error: null };

  } catch (error) {
    console.error('Upload service error:', error);
    return { data: null, error: error.message || 'Upload gagal' };
  }
};

  /* =========================
   USERS
========================= */

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("full_name", { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Cek apakah user adalah admin (untuk frontend validation)
export const checkIsAdmin = async (userId) => {
  try {
    if (!userId) return false;

    const { data, error } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Admin check error:", error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error("Admin check failed:", err);
    return false;
  }
};
