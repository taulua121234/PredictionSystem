'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Ticket, Loader2, Shield } from 'lucide-react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/types';

export default function LoginPage() {
  const [ticketCode, setTicketCode] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const handleTicketLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.loginWithTicket(ticketCode.trim());
      login(res.data.data.token, res.data.data.user);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !adminPass) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.loginAdmin(adminUser, adminPass);
      login(res.data.data.token, res.data.data.user);
      router.push('/admin');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🏇</span>
          <h1 className="text-3xl font-bold text-gradient mb-2">Uma Betting</h1>
          <p className="text-text-secondary text-sm">Umamusume Prediction Platform</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-6 shadow-2xl">
          {!adminMode ? (
            <>
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Ticket size={20} className="text-accent-blue" />
                Đăng nhập bằng mã vé
              </h2>
              <p className="text-text-secondary text-sm mb-5">
                Nhập mã vé từ hệ thống bán vé để tham gia dự đoán
              </p>

              <form onSubmit={handleTicketLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Ticket Code
                  </label>
                  <input
                    type="text"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    placeholder="VD: TKT-XXXXXX"
                    className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/50 text-text-primary placeholder:text-text-muted transition-all"
                    disabled={loading}
                    id="ticket-code-input"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-accent-red text-sm bg-accent-red/10 px-3 py-2 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading || !ticketCode.trim()}
                  className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
                  id="login-button"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Ticket size={18} />
                      Đăng nhập
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-accent-orange" />
                Admin Login
              </h2>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent-orange focus:outline-none text-text-primary placeholder:text-text-muted"
                  id="admin-username-input"
                />
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent-orange focus:outline-none text-text-primary placeholder:text-text-muted"
                  id="admin-password-input"
                />

                {error && (
                  <p className="text-accent-red text-sm bg-accent-red/10 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-accent-orange hover:brightness-110 disabled:opacity-50 text-white font-semibold transition-all flex items-center justify-center gap-2"
                  id="admin-login-button"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Login'}
                </button>
              </form>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-border text-center">
            <button
              onClick={() => { setAdminMode(!adminMode); setError(''); }}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              {adminMode ? '← Đăng nhập bằng mã vé' : 'Admin Login →'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
