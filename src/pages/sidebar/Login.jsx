import { useState, useEffect } from "react";
import { ShieldCheck, User, Lock, Mail, UserPlus, ChevronRight, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, IS_SUPABASE_READY } from "../../supabase";

export default function Login() {
  const { login, register, loading: authLoading } = useAuth(); // Gunakan loading dari auth

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);

  // HAPUS useEffect redirect! Biarkan App.jsx/routing yang handle

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLocalLoading(true);

    // Validasi
    if (!email || !password) {
      setError("Email dan password harus diisi");
      setLocalLoading(false);
      return;
    }

    // Validasi domain
    if (!email.toLowerCase().endsWith('@tps.co.id')) {
      setError("Hanya email dengan domain @tps.co.id yang diperbolehkan");
      setLocalLoading(false);
      return;
    }

    try {
      await login(email, password);
      // Redirect akan dihandle oleh App.jsx/routing
      // JANGAN navigate di sini!
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLocalLoading(true);

    // Validasi form
    if (!email || !password || !fullName) {
      setError("Semua field harus diisi");
      setLocalLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      setLocalLoading(false);
      return;
    }

    // Validasi domain
    if (!email.toLowerCase().endsWith('@tps.co.id')) {
      setError("Hanya email dengan domain @tps.co.id yang diperbolehkan");
      setLocalLoading(false);
      return;
    }

    try {
      // Register ke Supabase
      await register(email, password, fullName);

      setSuccess(
        "Registrasi berhasil. Silakan cek email untuk verifikasi sebelum login."
      );

      // Kembali ke mode login
      setIsLogin(true);

      // Reset form
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setError(err?.message || "Registrasi gagal. Silakan coba lagi.");
    } finally {
      setLocalLoading(false);
    }
  };

  const toggleMode = () => {
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setFullName("");
    setIsLogin(!isLogin);
  };

  const isLoading = localLoading || authLoading;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* LEFT SIDE - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-emerald-500/5"></div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 p-12">
        </div>

        {/* Logo Section - Centered */}
        <div className="relative z-10 flex flex-col items-center justify-center mb-20">
          <div className="relative mb-8">
            {/* Outer Glow Effect */}
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>

            {/* Logo Container */}
            <div className="relative bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl shadow-blue-500/20 border border-white/20">
              <img
                src="https://vss.tps.co.id/assets/images/logo-tps.png"
                alt="PETIKEMAS Logo"
                className="w-72 h-72 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="relative z-10 p-12">
          <div className="border-t border-slate-200 pt-6">
            <p className="text-slate-500 text-sm">
              © 2026 PT Terminal Petikemas.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-500/5 border border-slate-100">
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
                {isLogin ? (
                  <ShieldCheck className="w-10 h-10 text-blue-600" />
                ) : (
                  <UserPlus className="w-10 h-10 text-emerald-600" />
                )}
              </div>
              <h2 className="text-3xl font-bold text-slate-900">
                {isLogin ? "Selamat Datang" : "Buat Akun Baru"}
              </h2>
              <p className="text-slate-500 mt-2">
                {isLogin
                  ? "Masuk untuk melanjutkan ke sistem"
                  : "Daftar untuk mengakses sistem"
                }
              </p>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
              {/* Messages */}
              {success && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                    <p className="text-sm text-emerald-700">{success}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-red-700">{error}</p>
                      {error?.includes("Email atau password salah") && (
                        <p className="text-xs text-red-600 mt-1">
                          Pastikan email sudah terdaftar dan password benar
                        </p>
                      )}
                      {error?.includes("belum diverifikasi") && (
                        <p className="text-xs text-red-600 mt-1">
                          Silakan cek folder spam/junk email Anda
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Name Field (Register Only) */}
              {!isLogin && (
                <div className="group">
                  <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                    Nama
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <User className={`w-5 h-5 transition-colors ${fullName ? 'text-blue-500' : 'text-slate-400'}`} />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                      placeholder="Nama profile "
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="group">
                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className={`w-5 h-5 transition-colors ${email ? 'text-blue-500' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="email"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder="nama@tps.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="mt-1 ml-1">
                  <p className="text-xs text-blue-600">
                    Hanya email dengan domain <span className="font-semibold">@tps.co.id</span>
                  </p>
                </div>
              </div>

              {/* Password Field */}
              <div className="group">
                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className={`w-5 h-5 transition-colors ${password ? 'text-blue-500' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="password"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder={isLogin ? "Masukkan password" : "Minimal 6 karakter"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {!isLogin && (
                  <p className="text-xs text-slate-500 mt-2 ml-1">
                    Gunakan kombinasi huruf, angka, dan simbol untuk keamanan
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isLogin ? "Memproses..." : "Mendaftarkan..."}</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? "LOGIN" : "CREATE ACCOUNT"}</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-10 pt-8 border-t border-slate-100">
              <div className="text-center">
                <p className="text-slate-600">
                  {isLogin ? "Belum memiliki akun?" : "Sudah memiliki akun?"}{" "}
                  <button
                    onClick={toggleMode}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {isLogin ? "create account" : "Login here"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}