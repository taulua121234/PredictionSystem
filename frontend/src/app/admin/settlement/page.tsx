'use client';

import { useEffect, useState } from 'react';
import { Loader2, Award } from 'lucide-react';
import { raceApi, adminApi } from '@/services/api';
import type { Race, RaceEntry, RaceResultPayload } from '@/types';
import { getErrorMessage } from '@/types';

export default function SettlementPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [settling, setSettling] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState<Record<string, RaceResultPayload>>({});

  const loadRaces = () => {
    raceApi.list().then(r =>
      setRaces((r.data.data || []).filter((race: Race) => ['LOCKED', 'FINISHED'].includes(race.state)))
    );
  };

  useEffect(() => { loadRaces(); }, []);

  const setResult = async (id: string) => {
    const form = resultForm[id];
    if (!form?.first) { alert('Chọn Uma hạng 1'); return; }
    
    if (
      (form.second && form.first === form.second) || 
      (form.third && form.first === form.third) || 
      (form.second && form.third && form.second === form.third)
    ) {
      alert('Không được chọn trùng Uma trong Top 3!');
      return;
    }
    
    try { await adminApi.setRaceResult(id, form); loadRaces(); }
    catch (e: unknown) { alert(getErrorMessage(e)); }
  };

  const settle = async (id: string) => {
    setSettling(id);
    try {
      const res = await adminApi.settleRace(id);
      alert(`Settled! Winners: ${res.data.data.winnersCount}, Paid: ${res.data.data.totalPaidOut} pts`);
      loadRaces();
    } catch (e: unknown) { alert(getErrorMessage(e)); }
    finally { setSettling(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🏆 Settlement</h1>
      {races.length === 0 ? (
        <p className="text-text-muted text-center py-10">Không có race cần settle</p>
      ) : races.map(race => (
        <div key={race._id} className="glass rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold">{race.raceName}</p>
              <p className="text-xs text-text-muted">{race.state} • {race.entries?.length || 0} Uma</p>
            </div>
          </div>

          {race.state === 'LOCKED' && (
            <div className="space-y-2 mb-3">
              <p className="text-sm font-medium">Nhập kết quả:</p>
              {(['first', 'second', 'third'] as const).map((pos, i) => (
                <select key={pos} value={resultForm[race._id]?.[pos] || ''}
                  onChange={e => setResultForm(f => ({ ...f, [race._id]: { ...f[race._id], [pos]: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-sm">
                  <option value="">{['🥇 Top 1', '🥈 Top 2', '🥉 Top 3'][i]}</option>
                  {race.entries?.map((entry: RaceEntry, entryIndex: number) => {
                    const uma = typeof entry.umaId === 'string' ? entry.umaId : entry.umaId;
                    const id = typeof uma === 'string' ? uma : uma._id;
                    const name = typeof uma === 'string' ? uma : uma.name;
                    const trainerName = entry.trainerId ? (typeof entry.trainerId === 'object' && entry.trainerId !== null && 'name' in entry.trainerId ? (entry.trainerId as { name: string }).name : 'Có Trainer') : '';
                    return <option key={`${id}-${entryIndex}`} value={id}>{name} {trainerName ? `(${trainerName})` : ''}</option>;
                  })}
                </select>
              ))}
              <button onClick={() => setResult(race._id)} className="px-4 py-2 bg-accent-orange text-white rounded-lg text-sm font-semibold">
                Xác nhận kết quả
              </button>
            </div>
          )}

          {race.state === 'FINISHED' && (
            <button onClick={() => settle(race._id)} disabled={settling === race._id}
              className="w-full py-3 bg-accent-green text-white rounded-lg font-bold flex items-center justify-center gap-2">
              {settling === race._id ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
              Thanh toán (Settlement)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
