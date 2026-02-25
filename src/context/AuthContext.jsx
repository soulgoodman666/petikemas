import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // 🔑 Ambil role user
  // src/context/AuthContext.jsx (tambahkan di fetchRole)
  const fetchRole = async (userId) => {
    try {
      console.log("Fetching role for user ID:", userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      console.log("Role data:", data, "Error:", error);

      if (!error && data?.role) {
        setRole(data.role)
        console.log("Role set to:", data.role);
      } else {
        setRole("user")
        console.log("Default role set to: user");
      }
    } catch (err) {
      console.error("Fetch role error:", err)
      setRole("user")
    }
  }

  useEffect(() => {
    // 1️⃣ INIT AUTH (cepat)
    const initAuth = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)

      if (user) {
        fetchRole(user.id)
      } else {
        setRole(null)
      }
    }

    initAuth()

    // 2️⃣ LISTEN LOGIN / LOGOUT
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        fetchRole(currentUser.id)
      } else {
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
  }

  const register = async (email, password, fullName, phoneNumber) => {
    try {
      // 1. Register user di auth.users
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
          }
        }
      });

      if (error) {
        // Kalau email sudah ada → coba login
        if (error.message.includes("already registered")) {
          const loginRes = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (loginRes.error) throw loginRes.error;

          const user = loginRes.data.user;

          await supabase.from("profiles").upsert({
            id: user.id,
            email: email,
            full_name: fullName,
            phone_number: phoneNumber,
            role: "user"
          });

          return loginRes.data;
        }

        throw error;
      }

      // user baru
      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          phone_number: phoneNumber,
          role: "user"
        });

        if (profileError) {
          console.error('Error saving to profiles:', profileError);
          throw profileError;
        }
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };


  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return ctx
}
