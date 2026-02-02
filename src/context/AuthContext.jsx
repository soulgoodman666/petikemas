import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const authListenerRef = useRef(null);

  // HARDCODED ADMIN LIST
  const HARDCODED_ADMINS = [
    'adminpp1@tps.co.id',
    'admin@tps.co.id',
    'adminpp2@tps.co.id',
    'superadmin@tps.co.id'
  ];

  // ======================
  // BUILD USER + ROLE (USING useCallback)
  // ======================
  const buildUser = useCallback(async (authUser) => {
    console.log("🔄 buildUser called for:", authUser?.email || "null");
    
    if (!authUser) {
      console.log("No auth user, setting user to null");
      setUser(null);
      return;
    }

    try {
      console.log("🔍 Checking role for:", authUser.email);
      
      // CEK 1: Dari hardcoded admin list
      const isHardcodedAdmin = HARDCODED_ADMINS.includes(authUser.email.toLowerCase());
      
      // CEK 2: Dari profiles table
      let dbRole = 'user';
      let fullName = '';
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", authUser.id)
          .maybeSingle();

        if (!error && data) {
          dbRole = data.role || 'user';
          fullName = data.full_name || '';
          console.log("📊 User found:", { dbRole, fullName });
          console.log("📊 Profile found:", { dbRole, fullName });
        } else if (error) {
          console.log("⚠️ Profile not found:", error.message);
        }
      } catch (dbError) {
        console.log("❌ Failed to fetch from profiles:", dbError.message);
      }

      // TENTUKAN ROLE: Hardcoded > Database
      const isAdmin = isHardcodedAdmin || dbRole === 'admin';
      const finalRole = isAdmin ? 'admin' : 'user';

      console.log("🎯 Role determination:", {
        email: authUser.email,
        hardcodedAdmin: isHardcodedAdmin,
        dbRole: dbRole,
        isAdmin: isAdmin,
        finalRole: finalRole
      });

      const newUser = {
        id: authUser.id,
        email: authUser.email,
        full_name: fullName,
        role: finalRole,
        isAdmin: isAdmin,
        permissions: isAdmin ? 
          ['data', 'import', 'export', 'download', 'profile', 'settings', 'users'] : 
          ['download', 'profile']
      };

      // Prevent unnecessary state updates
      setUser(prev => {
        if (!prev) return newUser;
        
        // Check if anything actually changed
        const hasChanged = 
          prev.id !== newUser.id ||
          prev.email !== newUser.email ||
          prev.full_name !== newUser.full_name ||
          prev.role !== newUser.role ||
          prev.isAdmin !== newUser.isAdmin;
        
        if (hasChanged) {
          console.log("🔄 User state changed, updating");
          return newUser;
        }
        
        console.log("⏸️  User state unchanged, skipping update");
        return prev;
      });

    } catch (err) {
      console.error("❌ Error in buildUser:", err);
      // Fallback ke user biasa jika error
      setUser({
        id: authUser.id,
        email: authUser.email,
        role: "user",
        isAdmin: false,
        permissions: ['download', 'profile']
      });
    }
  }, []);

  // ======================
  // LOGIN EMAIL + PASSWORD
  // ======================
  const login = async (email, password) => {
    console.log("🔐 Login attempt for:", email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        console.error("❌ Login error:", {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        if (error.message?.includes("Email not confirmed")) {
          throw new Error("Email belum diverifikasi. Silakan cek email Anda.");
        } else if (error.message?.includes("Invalid login credentials")) {
          throw new Error("Email atau password salah");
        }
        throw new Error(error.message || "Login gagal");
      }

      console.log("✅ Login successful for:", data.user?.email);
      return data;
      
    } catch (err) {
      console.error("❌ Login catch error:", err);
      throw err;
    }
  };

  // ======================
  // LOGIN GOOGLE
  // ======================
  const loginWithGoogle = async () => {
    console.log("🌐 Starting Google OAuth login");
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error("❌ Google OAuth error:", error);
      throw new Error(error.message || "Google login gagal");
    }
  };

  // ======================
  // REGISTER USER
  // ======================
  const register = async (email, password, fullName) => {
    console.log("📝 Registering user:", { email, fullName });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
      });

      if (error) {
        console.error("❌ Register error:", error);
        throw new Error(error.message);
      }

      // Auto-create profile jika trigger tidak bekerja
      if (data.user) {
        try {
          console.log("🔍 Creating profile for user:", {
            id: data.user.id,
            email: email.toLowerCase(),
            full_name: fullName,
            role: HARDCODED_ADMINS.includes(email.toLowerCase()) ? 'admin' : 'user'
          });

          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .insert([
              {
                id: data.user.id,
                email: email.toLowerCase(),
                full_name: fullName,
                role: HARDCODED_ADMINS.includes(email.toLowerCase()) ? 'admin' : 'user',
                created_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (profileError) {
            console.error("❌ Profile creation failed:", profileError);
            throw profileError;
          }

          console.log("✅ Profile created successfully:", profileData);
        } catch (profileError) {
          console.error("❌ Profile creation error:", profileError);
          // Jangan throw error di sini agar registrasi tetap berhasil
          // User bisa dibuat manual oleh admin jika perlu
        }
      }

      console.log("✅ Register successful for:", email);
      return data;
      
    } catch (err) {
      console.error("❌ Register catch error:", err);
      throw err;
    }
  };

  // ======================
  // LOGOUT - Instant logout
  // ======================
  const logout = () => {
    console.log("🚪 Instant logout for user:", user?.email);
    
    // 1. Clear user state immediately
    setUser(null);
    
    // 2. Supabase logout in background (don't wait)
    supabase.auth.signOut().catch(error => {
      console.error("❌ Background logout error:", error);
    });
    
    console.log("✅ Instant logout successful");
  };

  // ======================
  // HAS PERMISSION FUNCTION
  // ======================
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    return user.permissions?.includes(permission);
  }, [user]);

  // ======================
  // UPDATE PROFILE
  // ======================
  const updateProfile = async (updates) => {
    if (!user) throw new Error("No user logged in");
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      // Update user state
      setUser(prev => ({ ...prev, ...updates }));
      
      console.log("✅ Profile updated successfully");
      return { success: true };
      
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      return { success: false, error };
    }
  };

  // ======================
  // INIT SESSION (FIXED - NO INFINITE LOOP)
  // ======================
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      console.log("⏩ Auth already initialized, skipping");
      return;
    }

    console.log("🚀 Initializing auth...");
    
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("❌ Session error:", sessionError);
          setLoading(false);
          return;
        }

        console.log("📋 Session check:", {
          hasSession: !!sessionData.session,
          userEmail: sessionData.session?.user?.email
        });

        if (sessionData.session?.user) {
          await buildUser(sessionData.session.user);
        } else {
          console.log("👤 No user in session");
          setUser(null);
        }
        
      } catch (err) {
        console.error("❌ Error initializing auth:", err);
        setUser(null);
      } finally {
        setLoading(false);
        initializedRef.current = true;
        console.log("✅ Auth initialization complete");
      }
    };

    initializeAuth();

    // Setup auth state change listener (ONLY ONCE)
    if (!authListenerRef.current) {
      console.log("🎧 Setting up auth state listener");
      
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("🔄 Auth state change:", event, session?.user?.email);
          
          // Only process significant events
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
            if (session?.user) {
              await buildUser(session.user);
            } else {
              console.log("👋 User signed out");
              setUser(null);
            }
          } else {
            console.log("⏭️  Skipping event:", event);
          }
        }
      );
      
      authListenerRef.current = listener;
    }

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up auth listener");
      if (authListenerRef.current) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, [buildUser]); // Only depends on buildUser which is memoized

  // ======================
  // PROVIDER VALUE (Memoized)
  // ======================
  const providerValue = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    hasPermission,
    updateProfile
  };

  console.log("🎯 AuthProvider render, loading:", loading, "user:", user?.email);

  return (
    <AuthContext.Provider value={providerValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}