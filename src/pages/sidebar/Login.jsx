import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  UserPlus,
  ChevronRight,
  Building2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function Login() {
  const { login, register, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [formMode, setFormMode] = useState('login');

  const validateEmail = (email) => {
    const isValid = email.toLowerCase().endsWith('@tps.co.id');
    setEmailValid(isValid);
    return isValid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLocalLoading(true);

    if (!email || !password) {
      setError("Email dan password harus diisi");
      setLocalLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Hanya email dengan domain @tps.co.id yang diperbolehkan");
      setLocalLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate("/files", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login gagal. Periksa kredensial Anda.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLocalLoading(true);

    if (!email || !password || !fullName) {
      setError("Semua field harus diisi");
      setLocalLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Hanya email dengan domain @tps.co.id yang diperbolehkan");
      setLocalLoading(false);
      return;
    }

    try {
      await register(email, password, fullName);
      setSuccess("Registrasi berhasil! Silakan login.");
      setTimeout(() => {
        setIsLogin(true);
        setFormMode('login');
        setEmail("");
        setPassword("");
        setFullName("");
      }, 2000);
    } catch (err) {
      console.error("Register error:", err);
      setError(err.response?.data?.message || "Registrasi gagal. Silakan coba lagi.");
    } finally {
      setLocalLoading(false);
    }
  };

  const toggleMode = () => {
    setError("");
    setSuccess("");
    setIsLogin(!isLogin);
    setFormMode(isLogin ? 'register' : 'login');
  };

  const isLoading = localLoading || authLoading;

  useEffect(() => {
    if (user) {
      navigate("/files", { replace: true });
    }
  }, [user, navigate]);


  // Effect untuk animasi form transisi
  useEffect(() => {
    const timer = setTimeout(() => {
      // Force re-render untuk transisi CSS
    }, 10);
    return () => clearTimeout(timer);
  }, [isLogin]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-blue-20 to-indigo-50" ref={containerRef}>
      {/* Left Panel - Enhanced Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-cover bg-center bg-no-repeat items-center justify-center relative overflow-hidden animate-fadeIn"
        style={{
          backgroundImage: "url('/images/pelindo2.png')"
        }}
      >

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
        linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)
      `,
            backgroundSize: '60px 60px'
          }}
        ></div>

        {/* Soft light glow */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gray-200 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gray-300 rounded-full blur-3xl opacity-30"></div>

        {/* Content */}
        <div className="relative z-10 text-center p-12 max-w-2xl">
          <div className="mb-8 animate-scaleIn">
            <div className="inline-flex items-center justify-center p-2 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 hover:scale-105 transition-all duration-500">
              <img
                src="/images/ptpss.png"
                alt="Pelindo Logo"
                className="w-72 md:w-80 lg:w-96 h-auto drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </div>


      {/* Right Panel - Enhanced Form */}
      <div className="hidden lg:flex lg:w-1/2 bg-cover bg-center bg-no-repeat items-center justify-center relative overflow-hidden animate-fadeIn"
        style={{
          backgroundImage: "url('/images/fotopelindo.jpeg')"
        }}
      >
        <div className="w-full max-w-sm sm:max-w-md animate-slideUp">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">Pelindo File Manager</h2>
            </div>
          </div>
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-1.5 flex border border-gray-200">
            <button
              onClick={() => { setIsLogin(true); setFormMode('login'); }}
              className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${isLogin
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </div>
            </button>
            <button
              onClick={() => { setIsLogin(false); setFormMode('register'); }}
              className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${!isLogin
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </div>
            </button>
          </div>

          {/* Form Container */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-fadeIn">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-fadeIn">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-green-600 text-sm">{success}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <div key={formMode} className="animate-formSwitch">
              {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-6">

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (e.target.value) validateEmail(e.target.value);
                        }}
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                        placeholder="nama@tps.co.id"
                        required
                      />
                      {email && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          {emailValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {email && !emailValid && (
                      <p className="mt-2 text-sm text-red-500 animate-fadeIn">Domain harus @tps.co.id</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        {showPassword ? 'Hide password' : 'Show password'}
                      </button>
                    </div>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-4 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold">Memproses...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">Sign In</span>
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </div>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (e.target.value) validateEmail(e.target.value);
                        }}
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                        placeholder="nama@tps.co.id"
                        required
                      />
                      {email && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          {emailValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {email && !emailValid && (
                      <p className="mt-2 text-sm text-red-500 animate-fadeIn">Domain harus @tps.co.id</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        {showPassword ? 'Hide password' : 'Show password'}
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                        placeholder="Minimal 8 karakter"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold">Membuat Akun...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">Create Account</span>
                          <UserPlus className="w-5 h-5" />
                        </>
                      )}
                    </div>
                  </button>
                </form>
              )}
            </div>

            {/* Divider */}
            <div className="my-8 flex items-center">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-sm text-gray-500">atau</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Toggle Mode */}
            <button
              onClick={toggleMode}
              className="w-full text-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
            >
              {isLogin
                ? "Belum punya akun? Daftar di sini"
                : "Sudah punya akun? Masuk di sini"
              }
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center animate-fadeIn">
            <p className="text-sm font-bold text-white">
              © {new Date().getFullYear()} Petikemas. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}