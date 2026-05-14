'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Timer, Users, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { raceApi, leaderboardApi } from '@/services/api';
import type { LeaderboardEntry } from '@/types';

interface Race {
  _id: string;
  raceName: string;
  description?: string;
  state: string;
  startTime: string;
  closeBetTime: string;
  entries: { umaId: string }[];
}

const STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: 'Sắp diễn ra', color: 'text-text-secondary', bg: 'bg-bg-hover' },
  BETTING_OPEN: { label: '🔥 Đang mở cược', color: 'text-accent-green', bg: 'bg-accent-green/10' },
  LOCKED: { label: '🔒 Đã khóa', color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
  FINISHED: { label: 'Đã kết thúc', color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
  SETTLED: { label: '✅ Đã thanh toán', color: 'text-text-muted', bg: 'bg-bg-tertiary' },
};

export default function HomePage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [racesRes, leaderboardRes] = await Promise.all([
          raceApi.list(),
          leaderboardApi.income(5),
        ]);
        setRaces(racesRes.data.data || []);
        setTopPlayers(leaderboardRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeRaces = races.filter(r => r.state === 'BETTING_OPEN' || r.state === 'LOCKED');
  const upcomingRaces = races.filter(r => r.state === 'UPCOMING');
  const pastRaces = races.filter(r => r.state === 'FINISHED' || r.state === 'SETTLED');

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6 pb-24 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Hero Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl p-6 md:p-8"
              style={{
                background: 'linear-gradient(135deg, #0f3460 0%, #1a1a2e 50%, #16213e 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-blue/10 rounded-full blur-3xl" />
              <div className="relative">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  🏇 Umamusume <span className="text-gradient">Prediction</span>
                </h1>
                <p className="text-text-secondary max-w-md mb-4">
                  Dự đoán kết quả đua, tích lũy điểm và cạnh tranh trên bảng xếp hạng realtime
                </p>
                <div className="flex gap-3">
                  <StatBadge icon={<Zap size={14} />} label="Live Races" value={activeRaces.length.toString()} color="text-accent-green" />
                  <StatBadge icon={<Timer size={14} />} label="Upcoming" value={upcomingRaces.length.toString()} color="text-accent-blue" />
                  <StatBadge icon={<Users size={14} />} label="Players" value={topPlayers.length > 0 ? '...' : '0'} color="text-accent-yellow" />
                </div>
              </div>
            </motion.div>

            {/* Live Races */}
            {activeRaces.length > 0 && (
              <Section title="🔥 Đang diễn ra" count={activeRaces.length}>
                <div className="grid gap-3">
                  {activeRaces.map((race, i) => (
                    <RaceCard key={race._id} race={race} index={i} highlight />
                  ))}
                </div>
              </Section>
            )}

            {/* Upcoming */}
            {upcomingRaces.length > 0 && (
              <Section title="📅 Sắp diễn ra" count={upcomingRaces.length}>
                <div className="grid gap-3">
                  {upcomingRaces.map((race, i) => (
                    <RaceCard key={race._id} race={race} index={i} />
                  ))}
                </div>
              </Section>
            )}

            {/* Past Races */}
            {pastRaces.length > 0 && (
              <Section title="📊 Đã kết thúc" count={pastRaces.length}>
                <div className="grid gap-3">
                  {pastRaces.slice(0, 5).map((race, i) => (
                    <RaceCard key={race._id} race={race} index={i} />
                  ))}
                </div>
              </Section>
            )}

            {loading && (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-secondary">Đang tải dữ liệu...</p>
              </div>
            )}

            {!loading && races.length === 0 && (
              <div className="text-center py-20 glass rounded-2xl">
                <span className="text-5xl block mb-4">🏇</span>
                <p className="text-text-secondary text-lg">Chưa có race nào</p>
                <p className="text-text-muted text-sm mt-1">Admin sẽ tạo race sớm thôi!</p>
              </div>
            )}
          </div>

          {/* Sidebar — Leaderboard Preview */}
          <aside className="space-y-4">
            <div className="glass rounded-2xl p-4 sticky top-20">
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-accent-yellow" />
                Top Players
              </h2>

              {topPlayers.length > 0 ? (
                <div className="space-y-2">
                  {topPlayers.map((player, i) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors"
                    >
                      <span className={`w-6 text-center font-bold text-sm ${
                        i === 0 ? 'text-gold' : i === 1 ? 'text-silver' : i === 2 ? 'text-bronze' : 'text-text-muted'
                      }`}>
                        {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{player.username}</p>
                        <p className="text-xs text-text-muted">{player.tier}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${
                        (player.income ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'
                      }`}>
                        {(player.income ?? 0) >= 0 ? '+' : ''}{(player.income ?? 0).toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-4">Chưa có dữ liệu</p>
              )}

              <Link
                href="/leaderboard"
                className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-sm text-accent-blue hover:text-accent-blue-hover transition-colors"
              >
                Xem bảng xếp hạng <ChevronRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ==================== Sub Components ====================

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        {title}
        <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full">{count}</span>
      </h2>
      {children}
    </div>
  );
}

function RaceCard({ race, index, highlight }: { race: Race; index: number; highlight?: boolean }) {
  const config = STATE_CONFIG[race.state] || STATE_CONFIG.UPCOMING;
  const startDate = new Date(race.startTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/race/${race._id}`}
        className={`block p-4 rounded-xl border transition-all hover:border-accent-blue/50 group ${
          highlight
            ? 'glass border-accent-green/30 glow-green'
            : 'bg-bg-secondary border-border hover:bg-bg-tertiary'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-accent-blue transition-colors truncate">
              {race.raceName}
            </h3>
            {race.description && (
              <p className="text-sm text-text-secondary mt-0.5 truncate">{race.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              <span>📅 {startDate.toLocaleDateString('vi-VN')} {startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>🏇 {race.entries.length} Uma</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            <ChevronRight size={16} className="text-text-muted group-hover:text-accent-blue transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <span className={color}>{icon}</span>
      <span className="text-xs text-text-secondary">{label}:</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
