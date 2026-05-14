'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Award, Flag, Home, LayoutDashboard, LogOut, Menu, Shield, Swords, Users, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/races', label: 'Races', icon: <Flag size={18} /> },
  { href: '/admin/trainers', label: 'Trainers', icon: <Swords size={18} /> },
  { href: '/admin/umas', label: 'Umas', icon: <Zap size={18} /> },
  { href: '/admin/settlement', label: 'Settlement', icon: <Award size={18} /> },
  { href: '/admin/users', label: 'Users', icon: <Users size={18} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  if (!_hasHydrated || !isAuthenticated || user?.role !== 'admin') {
    return <div className="min-h-screen bg-bg-primary" />;
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-bg-primary">
      <aside
        className={`fixed left-0 top-0 z-[70] h-full w-64 bg-bg-secondary border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 border-b border-border flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2" onClick={closeSidebar}>
            <span className="text-xl">🏇</span>
            <span className="font-bold text-gradient text-sm">Admin Panel</span>
          </Link>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover touch-target"
            aria-label="Close admin menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-target ${
                pathname === item.href ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}

          <Link
            href="/"
            onClick={closeSidebar}
            className="mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors touch-target border-t border-border pt-4"
          >
            <Home size={18} /> Back to site
          </Link>
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-accent-red hover:bg-bg-hover transition-colors touch-target"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 h-16 glass border-b border-border">
          <div className="h-full px-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover touch-target"
                aria-label="Open admin menu"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-accent-blue" />
                <span className="font-semibold text-sm sm:text-base">Admin</span>
              </div>
            </div>
            <span className="hidden sm:block text-sm text-text-secondary">{user.username}</span>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
