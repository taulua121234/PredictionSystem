'use client';

import { useEffect, useState } from 'react';
import { Users, Flag, Target, Coins } from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { DashboardStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || user?.role !== 'admin') return;
    adminApi.stats().then(res => setStats(res.data.data)).catch((err) => {
      if (err.response?.status !== 401) {
        console.error(err);
      }
    });
  }, [_hasHydrated, isAuthenticated, user]);

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: <Users size={20} />, color: 'text-accent-blue' },
    { label: 'Total Races', value: stats?.totalRaces || 0, icon: <Flag size={20} />, color: 'text-accent-green' },
    { label: 'Total Bets', value: stats?.totalBets || 0, icon: <Target size={20} />, color: 'text-accent-orange' },
    { label: 'Points Bet', value: stats?.totalPointsBet?.toLocaleString() || 0, icon: <Coins size={20} />, color: 'text-accent-yellow' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="glass rounded-xl p-5">
            <div className={`mb-3 ${c.color}`}>{c.icon}</div>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-sm text-text-secondary mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
