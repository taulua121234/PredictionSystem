'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { adminApi, umaApi } from '@/services/api';
import type { Uma, CreateUmaPayload } from '@/types';
import { getErrorMessage } from '@/types';
import { Edit3, Trash2, X, Loader2, Save } from 'lucide-react';

interface Trainer {
  _id: string;
  name: string;
}

export default function AdminUmasPage() {
  const [umas, setUmas] = useState<Uma[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  
  const [editingUma, setEditingUma] = useState<Uma | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [umasRes, trainersRes] = await Promise.all([
        umaApi.list(),
        adminApi.getTrainers()
      ]);
      setUmas(umasRes.data?.data || umasRes.data || []);
      setTrainers(trainersRes.data || trainersRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadData(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleEdit = (uma: Uma) => {
    setEditingUma(JSON.parse(JSON.stringify(uma)));
  };

  const handleSave = async () => {
    if (!editingUma) return;
    setSaving(true);
    try {
      const payload: Partial<CreateUmaPayload> = {
        name: editingUma.name,
        stats: editingUma.stats,
        trainerId: editingUma.trainerId || null
      };
      await adminApi.updateUma(editingUma._id, payload);
      setEditingUma(null);
      loadData();
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const delUma = async (id: string) => {
    if (!confirm('Xóa Uma này?')) return;
    try { await adminApi.deleteUma(id); loadData(); } catch (e) { alert(getErrorMessage(e)); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🐴 Uma Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {umas.map(uma => {
          const trainer = trainers.find(t => t._id === uma.trainerId);
          return (
            <div key={uma._id} className="glass rounded-xl p-5 border border-border/50 shadow-sm flex flex-col relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center text-2xl overflow-hidden relative border border-border">
                    {uma.infoImageUrl ? (
                      <NextImage src={uma.infoImageUrl.startsWith('http') ? uma.infoImageUrl : `http://localhost:3005${uma.infoImageUrl}`} alt={uma.name} fill className="object-cover" unoptimized />
                    ) : '🐴'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{uma.name}</h3>
                    <p className="text-xs text-text-muted">
                      {trainer ? `Thuộc: ${trainer.name}` : 'Chưa có Trainer'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleEdit(uma)} className="p-2 rounded-lg text-accent-blue/80 hover:bg-accent-blue/20 transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => delUma(uma._id)} className="p-2 rounded-lg text-accent-red/80 hover:bg-accent-red/20 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                <div className="bg-bg-tertiary/50 p-1.5 rounded border border-border/50">
                  <div className="text-[10px] text-text-muted mb-0.5">SPD</div>
                  <div className="text-sm font-semibold">{uma.stats?.speed || 0}</div>
                </div>
                <div className="bg-bg-tertiary/50 p-1.5 rounded border border-border/50">
                  <div className="text-[10px] text-text-muted mb-0.5">STA</div>
                  <div className="text-sm font-semibold">{uma.stats?.stamina || 0}</div>
                </div>
                <div className="bg-bg-tertiary/50 p-1.5 rounded border border-border/50">
                  <div className="text-[10px] text-text-muted mb-0.5">PWR</div>
                  <div className="text-sm font-semibold">{uma.stats?.power || 0}</div>
                </div>
                <div className="bg-bg-tertiary/50 p-1.5 rounded border border-border/50">
                  <div className="text-[10px] text-text-muted mb-0.5">GUT</div>
                  <div className="text-sm font-semibold">{uma.stats?.guts || 0}</div>
                </div>
                <div className="bg-bg-tertiary/50 p-1.5 rounded border border-border/50">
                  <div className="text-[10px] text-text-muted mb-0.5">WIS</div>
                  <div className="text-sm font-semibold">{uma.stats?.wisdom || 0}</div>
                </div>
              </div>
            </div>
          );
        })}
        {umas.length === 0 && (
          <div className="col-span-full text-center py-10 text-text-muted italic bg-bg-tertiary/50 rounded-lg border border-dashed border-border">
            Chưa có Uma nào được tạo trong hệ thống.
          </div>
        )}
      </div>

      {editingUma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-5 border-b border-border/50 pb-3">
              <h3 className="font-bold text-lg">Chỉnh sửa Uma</h3>
              <button onClick={() => setEditingUma(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-secondary">Tên Uma</label>
                <input 
                  value={editingUma.name} 
                  onChange={e => setEditingUma({ ...editingUma, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-sm" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-secondary">Trainer</label>
                <select 
                  value={editingUma.trainerId || ''} 
                  onChange={e => setEditingUma({ ...editingUma, trainerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-sm"
                >
                  <option value="">-- Không có Trainer --</option>
                  {trainers.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-text-muted mt-1.5 italic">* Lưu ý: Một trainer chỉ được chứa tối đa 3 Umas.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">Chỉ số</label>
                <div className="grid grid-cols-5 gap-2">
                  {['speed', 'stamina', 'power', 'guts', 'wisdom'].map((stat) => (
                    <div key={stat}>
                      <label className="text-[10px] text-text-muted uppercase block text-center mb-1 font-medium">{stat.substring(0,3)}</label>
                      <input type="number" min={0} max={100} 
                        value={(editingUma.stats as Record<string, number>)?.[stat] || 0}
                        onChange={e => setEditingUma({
                          ...editingUma, 
                          stats: { ...editingUma.stats, [stat]: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 rounded bg-bg-tertiary border border-border text-sm text-center focus:border-accent-blue focus:outline-none" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="w-full mt-4 px-4 py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
