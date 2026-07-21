'use client';

import { useEffect, useState, useRef } from 'react';
import NextImage from 'next/image';
import { Plus, Upload, Trash2, Loader2, X } from 'lucide-react';
import { adminApi, umaApi } from '@/services/api';
import type { Uma } from '@/types';
import { getErrorMessage } from '@/types';

// Assuming we have a Trainer interface in types or defining it here
interface Trainer {
  _id: string;
  name: string;
  imageUrl?: string;
}

type UmaTrainerRef = string | { _id: string };

function getUmaTrainerId(uma: Uma): string | null {
  const trainerId = uma.trainerId as UmaTrainerRef | undefined;
  if (!trainerId) return null;
  return typeof trainerId === 'string' ? trainerId : trainerId._id;
}

import { useAuthStore } from '@/stores/authStore';

export default function AdminTrainersPage() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [umas, setUmas] = useState<Uma[]>([]);
  
  // Trainer form state
  const [showCreateTrainer, setShowCreateTrainer] = useState(false);
  const [trainerForm, setTrainerForm] = useState({ name: '' });
  const [creatingTrainer, setCreatingTrainer] = useState(false);
  
  // Uma form state
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [umaForm, setUmaForm] = useState({ name: '', stats: { speed: 50, stamina: 50, power: 50, guts: 50, wisdom: 50 } });
  const [creatingUma, setCreatingUma] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ type: 'uma' | 'trainer', id: string } | null>(null);

  const loadData = async () => {
    try {
      const [trainersRes, umasRes] = await Promise.all([
        adminApi.getTrainers(),
        umaApi.list()
      ]);
      setTrainers(trainersRes.data || []);
      setUmas(umasRes.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || user?.role !== 'admin') return;
    loadData();
  }, [_hasHydrated, isAuthenticated, user]);

  const createTrainer = async () => {
    if (!trainerForm.name) return;
    setCreatingTrainer(true);
    try { 
      await adminApi.createTrainer(trainerForm); 
      setShowCreateTrainer(false); 
      setTrainerForm({ name: '' }); 
      loadData(); 
    }
    catch (e: unknown) { alert(getErrorMessage(e)); }
    finally { setCreatingTrainer(false); }
  };

  const createUma = async () => {
    if (!umaForm.name || !selectedTrainerId) return;
    setCreatingUma(true);
    try { 
      // check limit before request to give immediate feedback or rely on backend
      const count = umas.filter(u => getUmaTrainerId(u) === selectedTrainerId).length;
      if (count >= 4) {
        alert("Trainer này đã có tối đa 4 Umas.");
        return;
      }
      await adminApi.createUma({ ...umaForm, trainerId: selectedTrainerId }); 
      setSelectedTrainerId(null); 
      setUmaForm({ name: '', stats: { speed: 50, stamina: 50, power: 50, guts: 50, wisdom: 50 } }); 
      loadData(); 
    }
    catch (e: unknown) { alert(getErrorMessage(e)); }
    finally { setCreatingUma(false); }
  };

  const delTrainer = async (id: string) => {
    if (!confirm('Xóa Trainer này? (Các Umas có thể sẽ không còn trainer)')) return;
    try { await adminApi.deleteTrainer(id); loadData(); } catch (e) { alert(getErrorMessage(e)); }
  };

  const delUma = async (id: string) => {
    if (!confirm('Xóa Uma này?')) return;
    try { await adminApi.deleteUma(id); loadData(); } catch (e) { alert(getErrorMessage(e)); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(uploadTarget.id);
    try { 
      if (uploadTarget.type === 'uma') {
        await adminApi.uploadUmaInfoImage(uploadTarget.id, file); 
      }
      loadData(); 
    }
    catch (err: unknown) { alert(getErrorMessage(err)); }
    finally { setUploading(null); setUploadTarget(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">🏇 Trainer Management</h1>
        <button onClick={() => setShowCreateTrainer(!showCreateTrainer)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-semibold touch-target">
          <Plus size={16} /> Thêm Trainer
        </button>
      </div>

      {showCreateTrainer && (
        <div className="glass rounded-xl p-5 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <input placeholder="Tên Trainer" value={trainerForm.name} onChange={e => setTrainerForm({ name: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-sm" />
          <button onClick={createTrainer} disabled={creatingTrainer} className="px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-semibold touch-target">
            {creatingTrainer ? <Loader2 size={14} className="animate-spin" /> : 'Tạo'}
          </button>
        </div>
      )}

      {/* Uma Form Modal - embedded for simplicity when selectedTrainerId is set */}
      {selectedTrainerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Thêm Uma cho Trainer</h3>
              <button onClick={() => setSelectedTrainerId(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Tên Uma" value={umaForm.name} onChange={e => setUmaForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-sm" />
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(umaForm.stats).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-xs text-text-muted capitalize block text-center mb-1">{key}</label>
                    <input type="number" min={0} max={100} value={val}
                      onChange={e => setUmaForm(f => ({ ...f, stats: { ...f.stats, [key]: parseInt(e.target.value) || 0 } }))}
                      className="w-full px-2 py-1.5 rounded bg-bg-tertiary border border-border text-sm text-center" />
                  </div>
                ))}
              </div>
              <button onClick={createUma} disabled={creatingUma} className="w-full px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-semibold flex justify-center">
                {creatingUma ? <Loader2 size={16} className="animate-spin" /> : 'Tạo Uma'}
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {trainers.map(trainer => {
          const trainerUmas = umas.filter(u => getUmaTrainerId(u) === trainer._id);
          const isFull = trainerUmas.length >= 4;

          return (
            <div key={trainer._id} className="glass rounded-xl p-5 border border-border/50 shadow-sm flex flex-col">
              {/* Trainer Header */}
              <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-xl overflow-hidden relative">
                    {trainer.imageUrl ? (
                      <NextImage src={trainer.imageUrl.startsWith('http') ? trainer.imageUrl : `http://localhost:3005${trainer.imageUrl}`} alt={trainer.name} fill className="object-cover" unoptimized />
                    ) : '👤'}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{trainer.name}</h2>
                    <p className="text-xs text-text-muted">{trainerUmas.length}/4 Umas</p>
                  </div>
                </div>
                  <div className="flex gap-2">
                  <button onClick={() => delTrainer(trainer._id)} className="p-2 rounded-lg text-accent-red/70 hover:text-accent-red hover:bg-accent-red/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Umas List */}
              <div className="flex-1 space-y-3">
                {trainerUmas.length === 0 ? (
                  <div className="text-center py-6 text-text-muted text-sm italic bg-bg-tertiary/50 rounded-lg border border-dashed border-border">
                    Chưa có Uma nào
                  </div>
                ) : (
                  trainerUmas.map(uma => (
                    <div key={uma._id} className="flex items-center justify-between gap-3 p-3 bg-bg-tertiary/50 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-lg overflow-hidden relative">
                          {uma.infoImageUrl ? (
                            <NextImage src={uma.infoImageUrl.startsWith('http') ? uma.infoImageUrl : `http://localhost:3005${uma.infoImageUrl}`} alt={uma.name} fill className="object-cover" unoptimized />
                          ) : '🐴'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{uma.name}</p>
                          <p className="text-[10px] text-text-muted font-mono mt-0.5">
                            SPD:{uma.stats?.speed} STA:{uma.stats?.stamina} PWR:{uma.stats?.power} GUT:{uma.stats?.guts} WIS:{uma.stats?.wisdom}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setUploadTarget({ type: 'uma', id: uma._id }); fileRef.current?.click(); }}
                          disabled={uploading === uma._id}
                          className="p-1.5 rounded-lg text-accent-purple/80 hover:bg-accent-purple/20 transition-colors" title="Đổi ảnh">
                          {uploading === uma._id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        </button>
                        <button onClick={() => delUma(uma._id)} className="p-1.5 rounded-lg text-accent-red/80 hover:bg-accent-red/20 transition-colors" title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Uma Button */}
              <button 
                onClick={() => !isFull && setSelectedTrainerId(trainer._id)}
                disabled={isFull}
                className={`mt-4 w-full py-2.5 rounded-lg border border-dashed text-sm font-semibold flex items-center justify-center gap-2 transition-colors
                  ${isFull ? 'bg-bg-tertiary/50 border-border text-text-muted cursor-not-allowed' : 'border-accent-blue/50 text-accent-blue hover:bg-accent-blue/10 hover:border-accent-blue'}`}
              >
                {isFull ? 'Đã đạt giới hạn 4 Umas' : <><Plus size={16} /> Thêm Uma</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
