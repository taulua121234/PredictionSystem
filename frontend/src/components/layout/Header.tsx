'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Coins, Edit2, History, Home, LogOut, Shield, Trophy } from 'lucide-react';
import RenameModal from '@/components/RenameModal';
import { getSocket } from '@/socket/socketClient';
import { useAuthStore } from '@/stores/authStore';

export default function Header() {
  const { user, isAuthenticated, logout, updatePoints } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    const handlePointUpdate = (data: { currentPoints: number }) => {
      updatePoints(data.currentPoints);
    };

    socket.on('user:point', handlePointUpdate);
    return () => {
      socket.off('user:point', handlePointUpdate);
    };
  }, [isAuthenticated, user, updatePoints]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🏇</span>
            <span className="text-lg font-bold text-gradient hidden sm:inline">Uma Betting</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="Races" />
            <NavLink href="/leaderboard" label="Leaderboard" icon={<Trophy size={16} />} />
            {isAuthenticated && <NavLink href="/history" label="History" icon={<History size={16} />} />}
            {user?.role === 'admin' && <NavLink href="/admin" label="Admin" icon={<Shield size={16} />} />}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border">
                  <Coins size={16} className="text-accent-yellow" />
                  <span className="font-bold text-accent-yellow tabular-nums text-sm sm:text-base">
                    {(user.currentPoints || 0).toLocaleString()}
                  </span>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors touch-target"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-sm font-bold text-accent-blue">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{user.username}</span>
                    <ChevronDown size={14} className="text-text-secondary" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-bg-elevated border border-border shadow-xl animate-fade-in">
                      <div className="p-3 border-b border-border">
                        <p className="text-sm font-medium truncate">{user.username}</p>
                        <p className="text-xs text-text-secondary">Tier: {user.tier}</p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setIsRenameOpen(true);
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover rounded-md transition-colors"
                        >
                          <Edit2 size={14} />
                          Đổi tên hiển thị
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent-red hover:bg-bg-hover rounded-md transition-colors"
                        >
                          <LogOut size={14} />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-medium text-sm transition-colors touch-target inline-flex items-center"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border safe-bottom">
        <div className="h-16 flex items-center justify-around">
          <MobileNavLink href="/" label="Races" icon={<Home size={20} />} active={pathname === '/'} />
          <MobileNavLink href="/leaderboard" label="Rank" icon={<Trophy size={20} />} active={pathname === '/leaderboard'} />
          {isAuthenticated && (
            <MobileNavLink href="/history" label="History" icon={<History size={20} />} active={pathname === '/history'} />
          )}
          {user?.role === 'admin' && (
            <MobileNavLink href="/admin" label="Admin" icon={<Shield size={20} />} active={pathname.startsWith('/admin')} />
          )}
        </div>
      </nav>

      <RenameModal isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} />
      {isAuthenticated && user && user.hasChangedName === false && <RenameModal isOpen={true} />}
    </>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileNavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors touch-target ${
        active ? 'text-accent-blue' : 'text-text-secondary'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
