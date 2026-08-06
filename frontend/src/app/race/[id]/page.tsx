'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Timer, Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import UmaInfoPopup from '@/components/uma/UmaInfoPopup';
import { raceApi, betApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/socket/socketClient';
import type { BetStats, BetPrediction, RaceBetStat } from '@/types';
import { getErrorMessage } from '@/types';

interface RaceData {
  _id: string;
  raceName: string;
  description?: string;
  state: string;
  startTime: string;
  closeBetTime: string;
  entries: PopulatedRaceEntry[];
  result?: { first?: { name: string }; second?: { name: string }; third?: { name: string } };
}

interface PopulatedRaceEntry {
  umaId: {
    _id: string;
    name: string;
    imageUrl?: string;
    infoImageUrl?: string;
    galleryImages?: string[];
    stats?: {
      speed?: number;
      stamina?: number;
      power?: number;
      guts?: number;
      wisdom?: number;
    };
  };
  trainerId?: { _id: string; name: string };
  baseOdd?: number;
  currentOdd?: number;
  odd: number;
}

interface OddUpdate {
  umaId: string;
  baseOdd: number;
  currentOdd: number;
  odd: number;
}

interface BetUpdatePayload {
  raceId: string;
  entries?: OddUpdate[];
  stats?: BetStats;
}

const TRIFECTA_HOUSE_EDGE_MULTIPLIER = 0.9;

export default function RaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const raceId = params.id as string;
  const { isAuthenticated, user, updatePoints } = useAuthStore();

  const [race, setRace] = useState<RaceData | null>(null);
  const [betStats, setBetStats] = useState<BetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Betting form state
  const [selectedCategory, setSelectedCategory] = useState<'UMA_WIN' | 'TRAINER_WIN' | 'TRIFECTA'>('UMA_WIN');
  const [selectedUma, setSelectedUma] = useState<string>('');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [trifecta, setTrifecta] = useState<{ first: string; second: string; third: string }>({ first: '', second: '', third: '' });
  const [betAmount, setBetAmount] = useState<number>(100);
  const [placing, setPlacing] = useState(false);
  const [betResult, setBetResult] = useState<{ success: boolean; message: string } | null>(null);

  // Uma info popup
  const [popupUma, setPopupUma] = useState<{ name: string; infoImageUrl?: string; galleryImages?: string[] } | null>(null);
  const maxBetAmount = Math.floor((user?.currentPoints ?? 0) * 0.7);
  const clampBetAmount = (amount: number) => Math.min(Math.max(amount, 0), maxBetAmount);

  useEffect(() => {
    if (!user) return;
    // Only update if current amount exceeds new max. Defer update to avoid
    // synchronous setState inside effect which can trigger cascading renders.
    if (betAmount > maxBetAmount) {
      const id = setTimeout(() => setBetAmount(maxBetAmount), 0);
      return () => clearTimeout(id);
    }
  }, [maxBetAmount, user, betAmount]);

  const applyOddUpdates = useCallback((updatedEntries: OddUpdate[]) => {
    const updatesByUma = new Map(updatedEntries.map(entry => [entry.umaId, entry]));

    setRace(prev => prev ? {
      ...prev,
      entries: prev.entries.map(entry => {
        const update = updatesByUma.get(entry.umaId._id);
        return update ? {
          ...entry,
          baseOdd: update.baseOdd,
          currentOdd: update.currentOdd,
          odd: update.odd,
        } : entry;
      }),
    } : prev);
  }, []);

  useEffect(() => {
    async function fetch() {
      try {
        const [raceRes, statsRes] = await Promise.all([
          raceApi.getById(raceId),
          betApi.raceStats(raceId),
        ]);
        setRace(raceRes.data.data);
        setBetStats(statsRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [raceId]);

  const raceIdToListen = race?._id;

  useEffect(() => {
    if (!raceIdToListen) return;
    const socket = getSocket();
    socket.emit('race:join', raceIdToListen);

    const handleRaceUpdate = (data: { raceId: string; state: string }) => {
      if (data.raceId === raceIdToListen) {
        setRace(prev => prev ? { ...prev, state: data.state } : prev);
      }
    };

    const handleBetUpdate = (data: BetUpdatePayload) => {
      if (data.raceId !== raceIdToListen) return;
      if (data.entries) applyOddUpdates(data.entries);
      if (data.stats) setBetStats(data.stats);
    };

    socket.on('race:update', handleRaceUpdate);
    socket.on('bet:update', handleBetUpdate);

    return () => {
      socket.off('race:update', handleRaceUpdate);
      socket.off('bet:update', handleBetUpdate);
      socket.emit('race:leave', raceIdToListen);
    };
  }, [raceIdToListen, applyOddUpdates]);

  useEffect(() => {
    if (!race || race.state !== 'BETTING_OPEN' || !race.closeBetTime) {
      return;
    }

    const targetTime = new Date(race.closeBetTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [race]);

  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (betAmount > maxBetAmount) {
      setBetResult({ success: false, message: `Số điểm dự đoán tối đa là ${maxBetAmount.toLocaleString()} pts (70% số điểm hiện có).` });
      return;
    }

    let prediction: BetPrediction = {};
    if (selectedCategory === 'UMA_WIN') {
      if (!selectedUma) return;
      prediction = { umaId: selectedUma };
    } else if (selectedCategory === 'TRAINER_WIN') {
      if (!selectedTrainer) return;
      prediction = { trainerId: selectedTrainer };
    } else {
      if (!trifecta.first || !trifecta.second || !trifecta.third) {
        setBetResult({ success: false, message: 'Vui lòng chọn đủ 3 hạng!' });
        return;
      }
      if (trifecta.first === trifecta.second || trifecta.first === trifecta.third || trifecta.second === trifecta.third) {
        setBetResult({ success: false, message: 'Vui lòng chọn 3 Uma khác nhau!' });
        return;
      }
      prediction = trifecta;
    }

    setPlacing(true);
    setBetResult(null);
    try {
      const res = await betApi.place({ raceId, category: selectedCategory, prediction, amount: betAmount });
      const data = res.data.data;
      updatePoints(data.currentPoints);
      setBetResult({ success: true, message: `Dự đoán thành công! Còn lại: ${data.currentPoints.toLocaleString()} pts` });

      if (data.race?.entries) applyOddUpdates(data.race.entries);
      if (data.stats) {
        setBetStats(data.stats);
      } else {
        const statsRes = await betApi.raceStats(raceId);
        setBetStats(statsRes.data.data);
      }
    } catch (err: unknown) {
      setBetResult({ success: false, message: getErrorMessage(err) });
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="text-center py-20 text-text-secondary">Race not found</div>
      </div>
    );
  }

  const isBettingOpen = race.state === 'BETTING_OPEN';
  const entries: PopulatedRaceEntry[] = race.entries || [];

  // Build prediction percentage map
  const predictionMap: Record<string, number> = {};
  betStats?.predictions?.forEach((p: RaceBetStat) => {
    predictionMap[p.umaId] = p.percentage;
  });

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6 pb-24 md:pb-6">
        {/* Back button */}
        <button onClick={() => router.back()} className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Quay lại
        </button>

        {/* Race header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{race.raceName}</h1>
              {race.description && <p className="text-text-secondary mt-1">{race.description}</p>}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-text-muted">
                <span className="flex items-center gap-1"><Timer size={14} /> {new Date(race.startTime).toLocaleString('vi-VN')}</span>
                <span>🏇 {entries.length} Uma</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {isBettingOpen && timeLeft && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-yellow/10 text-accent-yellow font-bold text-sm border border-accent-yellow/20">
                  <Timer size={16} className="animate-pulse" />
                  <span className="hidden sm:inline">Đóng dự đoán sau:</span> <span className="tabular-nums font-mono">{timeLeft}</span>
                </div>
              )}
              <div className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                isBettingOpen ? 'bg-accent-green/10 text-accent-green glow-green' : 'bg-bg-tertiary text-text-secondary'
              }`}>
                {isBettingOpen ? '🔥 ĐANG MỞ DỰ ĐOÁN' : race.state.replace('_', ' ')}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Odds Board */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">📊 Bảng tỷ lệ dự đoán</h2>

            <div className="hidden sm:block glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_80px_120px] gap-0 text-xs font-semibold text-text-muted uppercase tracking-wider bg-bg-tertiary px-4 py-3">
                <span className="w-8">#</span>
                <div className="flex items-center justify-between pr-4">
                  <span>Uma</span>
                  <span>Trainer</span>
                </div>
                <span className="text-center">Odds</span>
                <span className="text-right">Dự đoán</span>
              </div>

              {entries.map((entry, i) => {
                const pct = predictionMap[entry.umaId._id] || 0;
                const isSelected = selectedUma === entry.umaId._id;

                return (
                  <motion.div
                    key={`${entry.umaId._id}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { if (isBettingOpen) { setSelectedUma(entry.umaId._id); setSelectedCategory('UMA_WIN'); } }}
                    className={`grid grid-cols-[auto_1fr_80px_120px] gap-0 items-center px-4 py-3 border-t border-border cursor-pointer transition-all group ${
                      isSelected ? 'bg-accent-blue/10 border-l-2 border-l-accent-blue' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <span className="w-8 text-sm font-bold text-text-muted">{i + 1}</span>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold group-hover:text-accent-blue transition-colors">
                            {entry.umaId.name}
                          </span>
                          {(entry.umaId.infoImageUrl || (entry.umaId.galleryImages && entry.umaId.galleryImages.length > 0)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPopupUma({ name: entry.umaId.name, infoImageUrl: entry.umaId.infoImageUrl, galleryImages: entry.umaId.galleryImages }); }}
                              className="p-0.5 rounded text-accent-blue/70 hover:text-accent-blue hover:bg-accent-blue/10 transition-all"
                              title="Xem thông tin Uma"
                            >
                              <Info size={14} />
                            </button>
                          )}
                        </div>
                        {entry.umaId.stats && (
                          <div className="flex items-center gap-2.5 mt-1 text-[11px] font-mono text-text-muted">
                            <span>SPD:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.speed || 0}</strong></span>
                            <span>STA:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.stamina || 0}</strong></span>
                            <span>PWR:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.power || 0}</strong></span>
                            <span>GUT:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.guts || 0}</strong></span>
                            <span>WIT:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.wisdom || 0}</strong></span>
                          </div>
                        )}
                      </div>
                      {entry.trainerId && (
                        <span className="text-[15px] font-semibold text-text-secondary text-right">
                          {entry.trainerId.name}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <span className="odds-badge">{entry.odd.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green"
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-text-secondary w-8 text-right">{pct}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="sm:hidden space-y-3">
              {entries.map((entry, i) => {
                const pct = predictionMap[entry.umaId._id] || 0;
                const isSelected = selectedUma === entry.umaId._id;

                return (
                  <motion.button
                    type="button"
                    key={`${entry.umaId._id}-${i}-mobile`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => { if (isBettingOpen) { setSelectedUma(entry.umaId._id); setSelectedCategory('UMA_WIN'); } }}
                    className={`w-full text-left rounded-xl border p-4 transition-all touch-target ${
                      isSelected
                        ? 'bg-accent-blue/10 border-accent-blue/60'
                        : 'glass border-border hover:border-accent-blue/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-muted">#{i + 1}</span>
                          <span className="font-semibold truncate">{entry.umaId.name}</span>
                          {(entry.umaId.infoImageUrl || (entry.umaId.galleryImages && entry.umaId.galleryImages.length > 0)) && (
                            <span
                              onClick={(e) => { e.stopPropagation(); setPopupUma({ name: entry.umaId.name, infoImageUrl: entry.umaId.infoImageUrl, galleryImages: entry.umaId.galleryImages }); }}
                              className="p-1 rounded text-accent-blue/70 hover:text-accent-blue hover:bg-accent-blue/10"
                              title="Xem thông tin Uma"
                            >
                              <Info size={14} />
                            </span>
                          )}
                        </div>
                        {entry.trainerId && (
                          <p className="text-[15px] font-semibold text-text-secondary mt-0.5 truncate">{entry.trainerId.name}</p>
                        )}
                        {entry.umaId.stats && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] font-mono text-text-muted bg-bg-tertiary/60 px-2 py-1 rounded border border-border/40">
                            <span>SPD:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.speed || 0}</strong></span>
                            <span>STA:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.stamina || 0}</strong></span>
                            <span>PWR:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.power || 0}</strong></span>
                            <span>GUT:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.guts || 0}</strong></span>
                            <span>WIT:<strong className="text-text-secondary font-semibold ml-0.5">{entry.umaId.stats.wisdom || 0}</strong></span>
                          </div>
                        )}
                      </div>
                      <span className="odds-badge shrink-0">{entry.odd.toFixed(2)}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-bg-tertiary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green"
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-text-secondary w-9 text-right">{pct}%</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Race Result (if finished/settled) */}
            {race.result?.first && (
              <div className="glass rounded-xl p-4">
                <h3 className="font-bold mb-3">🏆 Kết quả</h3>
                <div className="space-y-2">
                  {[
                    { place: '🥇 1st', uma: race.result.first },
                    { place: '🥈 2nd', uma: race.result.second },
                    { place: '🥉 3rd', uma: race.result.third },
                  ].filter(r => r.uma).map(r => (
                    <div key={r.place} className="flex items-center gap-3 text-sm">
                      <span className="font-bold w-16">{r.place}</span>
                      <span>{r.uma?.name || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bet Slip (Right Panel) */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-lg font-bold mb-4">🎯 Dự đoán</h2>

              {!isBettingOpen ? (
                <p className="text-text-secondary text-sm text-center py-8">
                  {race.state === 'UPCOMING' ? 'Chưa mở dự đoán' : 'Đã đóng dự đoán'}
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Category tabs */}
                  <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
                    {(['UMA_WIN', 'TRAINER_WIN', 'TRIFECTA'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                          selectedCategory === cat
                            ? 'bg-accent-blue text-white'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {cat === 'UMA_WIN' ? 'Uma Win' : cat === 'TRAINER_WIN' ? 'Trainer' : 'Trifecta'}
                      </button>
                    ))}
                  </div>

                  {/* Selection display */}
                  <div className="bg-bg-tertiary rounded-lg p-3">
                    {selectedCategory === 'UMA_WIN' && (
                      <p className="text-sm">
                        {selectedUma ? (
                          <>
                            Chọn: <span className="font-semibold">{entries.find(e => e.umaId._id === selectedUma)?.umaId.name}</span>
                            {entries.find(e => e.umaId._id === selectedUma)?.trainerId?.name && (
                              <span className="text-text-muted text-xs ml-1 font-normal">
                                ({entries.find(e => e.umaId._id === selectedUma)?.trainerId?.name})
                              </span>
                            )}
                          </>
                        ) : 'Click uma ở bảng bên trái'}
                      </p>
                    )}
                    {selectedCategory === 'TRAINER_WIN' && (
                      <select
                        value={selectedTrainer}
                        onChange={e => setSelectedTrainer(e.target.value)}
                        className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
                      >
                        <option value="">Chọn Trainer...</option>
                        {Array.from(new Map(entries.filter(e => e.trainerId).map(e => [e.trainerId!._id, e.trainerId])).values()).map(t => (
                          <option key={t!._id} value={t!._id}>{t!.name}</option>
                        ))}
                      </select>
                    )}
                    {selectedCategory === 'TRIFECTA' && (
                      <div className="space-y-2">
                        {(['first', 'second', 'third'] as const).map((pos, i) => (
                          <select
                            key={pos}
                            value={trifecta[pos]}
                            onChange={e => setTrifecta(prev => ({ ...prev, [pos]: e.target.value }))}
                            className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
                          >
                            <option value="">{['🥇 Top 1', '🥈 Top 2', '🥉 Top 3'][i]}</option>
                            {entries.map(e => (
                              <option key={e.umaId._id} value={e.umaId._id}>
                                {e.umaId.name}{e.trainerId?.name ? ` — ${e.trainerId.name}` : ''}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs text-text-secondary font-medium block mb-1.5">Số điểm dự đoán</label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={e => setBetAmount(clampBetAmount(parseInt(e.target.value) || 0))}
                      min={0}
                      max={maxBetAmount}
                      className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-lg font-bold tabular-nums"
                      id="bet-amount-input"
                    />
                    <div className="flex gap-1 mt-2">
                      {[50, 100, 200, 500, 1000].map(v => (
                        <button
                          key={v}
                          onClick={() => setBetAmount(clampBetAmount(v))}
                          className="flex-1 py-1 text-xs font-medium rounded bg-bg-tertiary hover:bg-bg-hover border border-border transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Potential win */}
                  {(() => {
                    let currentOdd = 0;
                    if (selectedCategory === 'UMA_WIN' && selectedUma) {
                      currentOdd = entries.find(e => e.umaId._id === selectedUma)?.odd || 0;
                    } else if (selectedCategory === 'TRAINER_WIN' && selectedTrainer) {
                      const trainerEntries = entries.filter(e => e.trainerId?._id === selectedTrainer);
                      if (trainerEntries.length > 0) {
                        const totalUmaProb = entries.reduce((sum, e) => sum + (1 / e.odd), 0);
                        const trainerTrueProb = trainerEntries.reduce((sum, e) => sum + ((1 / e.odd) / totalUmaProb), 0);
                        currentOdd = parseFloat((1 / trainerTrueProb).toFixed(2));
                      }
                    } else if (selectedCategory === 'TRIFECTA' && trifecta.first && trifecta.second && trifecta.third) {
                      const firstEntry = entries.find(e => e.umaId._id === trifecta.first);
                      const secondEntry = entries.find(e => e.umaId._id === trifecta.second);
                      const thirdEntry = entries.find(e => e.umaId._id === trifecta.third);

                      if (firstEntry && secondEntry && thirdEntry) {
                        const totalUmaProb = entries.reduce((sum, e) => sum + (1 / e.odd), 0);
                        const prob1 = (1 / firstEntry.odd) / totalUmaProb;
                        const prob2 = (1 / secondEntry.odd) / totalUmaProb;
                        const prob3 = (1 / thirdEntry.odd) / totalUmaProb;
                        const secondDenominator = 1 - prob1;
                        const thirdDenominator = 1 - prob1 - prob2;

                        if (secondDenominator > 0 && thirdDenominator > 0) {
                          const trifectaProb = prob1 * (prob2 / secondDenominator) * (prob3 / thirdDenominator);
                          currentOdd = trifectaProb > 0
                            ? parseFloat(((1 / trifectaProb) * TRIFECTA_HOUSE_EDGE_MULTIPLIER).toFixed(2))
                            : 0;
                        }
                      }
                    }

                    if (currentOdd > 0) {
                      return (
                        <div className="flex justify-between text-sm p-3 rounded-lg bg-accent-green/5 border border-accent-green/20">
                          <span className="text-text-secondary">Tiềm năng (Odd: {currentOdd.toFixed(2)}):</span>
                          <span className="font-bold text-accent-green">
                            +{(betAmount * currentOdd).toLocaleString('en-US', { maximumFractionDigits: 0 })} pts
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Result message */}
                  {betResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                        betResult.success ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
                      }`}
                    >
                      {betResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {betResult.message}
                    </motion.div>
                  )}

                  {/* Place bet button */}
                  <button
                    onClick={handlePlaceBet}
                    disabled={placing}
                    className="w-full py-3 rounded-xl bg-accent-green hover:brightness-110 disabled:opacity-50 text-white font-bold text-base transition-all flex items-center justify-center gap-2"
                    id="place-bet-button"
                  >
                    {placing ? <Loader2 size={18} className="animate-spin" /> : '🎯 Dự đoán'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Uma Info Popup */}
      <UmaInfoPopup
        isOpen={!!popupUma}
        onClose={() => setPopupUma(null)}
        umaName={popupUma?.name || ''}
        infoImageUrl={popupUma?.infoImageUrl}
        galleryImages={popupUma?.galleryImages}
      />
    </div>
  );
}
