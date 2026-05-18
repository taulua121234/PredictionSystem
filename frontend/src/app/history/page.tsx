'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { betApi } from '@/services/api';
import type { Bet } from '@/types';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock size={14} />, color: 'text-accent-yellow', label: 'Đang chờ' },
  won: { icon: <CheckCircle size={14} />, color: 'text-accent-green', label: 'Thắng' },
  lost: { icon: <XCircle size={14} />, color: 'text-accent-red', label: 'Thua' },
  refunded: { icon: <RotateCcw size={14} />, color: 'text-accent-blue', label: 'Hoàn' },
};

const getPotentialPayout = (bet: Bet) =>
  bet.potentialPayout ?? Math.round(bet.amount * bet.oddAtBetTime);

const getPredictionName = (value: Bet['prediction'][keyof Bet['prediction']]) => {
  if (!value) return 'Chưa rõ';
  if (typeof value === 'string') return 'Chưa rõ';
  return value.name;
};

const getPredictionDetails = (bet: Bet) => {
  if (bet.category === 'UMA_WIN') {
    return [{ label: 'Uma', value: getPredictionName(bet.prediction.umaId) }];
  }

  if (bet.category === 'TRAINER_WIN') {
    return [{ label: 'Trainer', value: getPredictionName(bet.prediction.trainerId) }];
  }

  if (bet.category === 'TRIFECTA') {
    return [
      { label: 'Top 1', value: getPredictionName(bet.prediction.first) },
      { label: 'Top 2', value: getPredictionName(bet.prediction.second) },
      { label: 'Top 3', value: getPredictionName(bet.prediction.third) },
    ];
  }

  return [];
};

export default function HistoryPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    betApi.history(1, 50).then(res => { setBets(res.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 pb-24 md:pb-6">
        <h1 className="text-2xl font-bold mb-6">📜 Lịch sử cược</h1>

        {loading ? (
          <div className="py-10 text-center"><div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : bets.length === 0 ? (
          <div className="glass rounded-xl text-center py-16">
            <span className="text-4xl block mb-3">🎯</span>
            <p className="text-text-secondary">Chưa có lượt đặt cược nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet, i) => {
              const cfg = STATUS_CONFIG[bet.status] || STATUS_CONFIG.pending;
              const potentialPayout = getPotentialPayout(bet);
              const predictionDetails = getPredictionDetails(bet);
              return (
                <motion.div key={bet._id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="glass rounded-xl p-4 hover:border-border-light transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{typeof bet.raceId === 'object' ? bet.raceId.raceName : 'Race'}</p>
                      <p className="text-xs text-text-muted mt-0.5">{bet.category} • {new Date(bet.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </div>
                  </div>
                  {predictionDetails.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {predictionDetails.map(detail => (
                        <div key={detail.label} className="rounded-lg border border-border bg-bg-tertiary/60 px-2.5 py-1.5 text-xs">
                          <span className="text-text-muted">{detail.label}: </span>
                          <span className="font-semibold text-text-primary">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="text-sm">
                      <span className="text-text-muted">Cược: </span>
                      <span className="font-bold">{bet.amount.toLocaleString()} pts</span>
                      <span className="text-text-muted mx-2">×</span>
                      <span className="odds-badge">{bet.oddAtBetTime.toFixed(2)}</span>
                    </div>
                    {bet.status === 'won' && (
                      <span className="text-accent-green font-bold text-sm">+{bet.payout.toLocaleString()} pts</span>
                    )}
                    {bet.status === 'pending' && (
                      <div className="text-right">
                        <p className="text-[11px] text-text-muted">Tiềm năng</p>
                        <span className="text-accent-yellow font-bold text-sm">+{potentialPayout.toLocaleString()} pts</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
