'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { leaderboardApi } from '@/services/api';
import type { LeaderboardEntry } from '@/types';

type TabKey = 'income' | 'roi' | 'points';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('income');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = activeTab === 'income' ? await leaderboardApi.income(50)
          : activeTab === 'roi' ? await leaderboardApi.roi(50)
          : await leaderboardApi.points(50);
        setData(res.data.data || []);
      } catch { /* */ } finally { setLoading(false); }
    }
    fetch();
  }, [activeTab]);

  const getValue = (p: LeaderboardEntry) => {
    if (activeTab === 'income') return `${(p.income ?? 0) >= 0 ? '+' : ''}${p.income?.toLocaleString()}`;
    if (activeTab === 'roi') return `${((p.roi ?? 0) * 100).toFixed(1)}%`;
    return p.currentPoints?.toLocaleString();
  };

  const getColor = (p: LeaderboardEntry) => {
    if (activeTab === 'income') return (p.income ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red';
    if (activeTab === 'roi') return 'text-accent-blue';
    return 'text-accent-yellow';
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 pb-24 md:pb-6">
        <h1 className="text-2xl font-bold mb-6">🏆 Bảng xếp hạng</h1>

        <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 mb-6">
          {(['income', 'roi', 'points'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-accent-blue text-white' : 'text-text-secondary hover:bg-bg-hover'}`}>
              {tab === 'income' ? 'Income' : tab === 'roi' ? 'ROI' : 'Points'}
            </button>
          ))}
        </div>

        {data.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {[1, 0, 2].map(i => {
              const p = data[i]; if (!p) return null;
              const medals = ['👑', '🥈', '🥉'];
              const heights = ['h-28', 'h-36', 'h-24'];
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="flex flex-col items-center">
                  <span className="text-2xl mb-2">{medals[i]}</span>
                  <p className="text-sm font-semibold mb-1 max-w-[100px] truncate">{p.username}</p>
                  <div className={`${heights[i]} w-20 rounded-t-xl flex items-start justify-center pt-3 ${i === 0 ? 'bg-gradient-to-t from-accent-yellow/20 to-transparent border border-gold/30' : 'bg-bg-tertiary border border-border'}`}>
                    <span className={`text-sm font-bold tabular-nums ${getColor(p)}`}>{getValue(p)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="glass rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center"><div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : data.length === 0 ? (
            <p className="py-10 text-center text-text-muted">Chưa có dữ liệu</p>
          ) : data.map((p, i) => (
            <div key={p.id} className="flex items-center px-4 py-3 border-t border-border hover:bg-bg-hover transition-colors first:border-0">
              <span className={`w-10 text-sm font-bold ${i < 3 ? 'text-accent-yellow' : 'text-text-muted'}`}>#{i+1}</span>
              <span className="flex-1 font-medium text-sm truncate">{p.username}</span>
              <span className="text-xs text-text-muted w-16 text-center">{p.tier}</span>
              <span className={`text-sm font-bold tabular-nums w-24 text-right ${getColor(p)}`}>{getValue(p)}</span>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
