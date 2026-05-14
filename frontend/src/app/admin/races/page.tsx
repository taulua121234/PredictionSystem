'use client';

import { useEffect, useState } from 'react';
import { Plus, Play, Lock, CheckCircle, Loader2, Edit3, X, Trash2, Ban } from 'lucide-react';
import { raceApi, adminApi, umaApi } from '@/services/api';
import { AxiosError } from 'axios';
import type { Race, Uma } from '@/types';

function getErrorMessage(e: unknown): string {
  if (e instanceof AxiosError) return e.response?.data?.message || e.message;
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

const TRANSITIONS: Record<string, { next: string; label: string; icon: React.ReactNode; color: string }> = {
  UPCOMING: { next: 'BETTING_OPEN', label: 'Mở cược', icon: <Play size={14} />, color: 'bg-accent-green' },
  BETTING_OPEN: { next: 'LOCKED', label: 'Khóa cược', icon: <Lock size={14} />, color: 'bg-accent-yellow text-black' },
  LOCKED: { next: 'FINISHED', label: 'Kết thúc', icon: <CheckCircle size={14} />, color: 'bg-accent-orange' },
};

const STATE_COLORS: Record<string, string> = {
  UPCOMING: 'text-accent-blue',
  BETTING_OPEN: 'text-accent-green',
  LOCKED: 'text-accent-yellow',
  FINISHED: 'text-accent-orange',
  SETTLED: 'text-text-muted',
  CANCELLED: 'text-accent-red',
};

export default function AdminRacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [umas, setUmas] = useState<Uma[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({ 
    raceName: '', 
    description: '', 
    startTime: '', 
    closeBetTime: '',
    entries: [] as { umaId: string, odd: number }[]
  });
  
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [racesRes, umasRes] = await Promise.all([
        raceApi.list(),
        umaApi.list()
      ]);
      setRaces(racesRes.data?.data || []);
      setUmas(umasRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    const init = async () => {
      await load();
    };
    init();
  }, []);
  const openCreate = () => {
    setEditingId(null);
    setForm({ raceName: '', description: '', startTime: '', closeBetTime: '', entries: [] });
    setShowForm(true);
  };

  const openEdit = (race: Race) => {
    setEditingId(race._id);
    setForm({
      raceName: race.raceName,
      description: race.description || '',
      startTime: new Date(race.startTime).toISOString().slice(0, 16),
      closeBetTime: new Date(race.closeBetTime).toISOString().slice(0, 16),
      entries: race.entries.map(e => ({
        umaId: typeof e.umaId === 'string' ? e.umaId : e.umaId._id,
        odd: e.odd
      }))
    });
    setShowForm(true);
  };

  const addEntry = () => {
    setForm(f => ({ ...f, entries: [...f.entries, { umaId: '', odd: 1.0 }] }));
  };

  const updateEntry = (index: number, field: string, value: string | number) => {
    const newEntries = [...form.entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setForm(f => ({ ...f, entries: newEntries }));
  };

  const removeEntry = (index: number) => {
    setForm(f => ({ ...f, entries: f.entries.filter((_, i) => i !== index) }));
  };

  const save = async () => {
    if (!form.raceName || !form.startTime || !form.closeBetTime) {
      alert("Vui lòng nhập đủ thông tin.");
      return;
    }
    
    // validate entries
    if (form.entries.some(e => !e.umaId || e.odd <= 0)) {
      alert("Vui lòng điền đủ thông tin cho các Uma tham gia (Odd phải > 0).");
      return;
    }
    
    // check duplicate umas
    const umaIds = form.entries.map(e => e.umaId);
    if (new Set(umaIds).size !== umaIds.length) {
      alert("Không được chọn trùng Uma trong cùng 1 Race.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        closeBetTime: new Date(form.closeBetTime).toISOString(),
      };

      if (editingId) {
        await adminApi.updateRace(editingId, payload);
      } else {
        await adminApi.createRace(payload);
      }
      
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const transition = async (id: string, state: string) => {
    if (!confirm(`Xác nhận chuyển trạng thái sang ${state}?`)) return;
    try { await adminApi.changeRaceState(id, state); load(); }
    catch (e: unknown) { alert(getErrorMessage(e)); }
  };

  const handleDeleteRace = async (id: string, name: string) => {
    if (!confirm(`Xác nhận XÓA race "${name}"?\n\nLưu ý: Chỉ xóa được race chưa có ai đặt cược.`)) return;
    try {
      await adminApi.deleteRace(id);
      load();
    } catch (e: unknown) { alert(getErrorMessage(e)); }
  };

  const handleCancelRace = async (id: string, name: string) => {
    if (!confirm(`Xác nhận HỦY race "${name}"?\n\nTất cả người chơi đã đặt cược sẽ được hoàn lại điểm.`)) return;
    try {
      const res = await adminApi.cancelRace(id);
      alert(res.data?.data?.message || 'Đã hủy race thành công');
      load();
    } catch (e: unknown) { alert(getErrorMessage(e)); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">🏁 Race Management</h1>
        <button onClick={showForm ? () => setShowForm(false) : openCreate} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg text-sm font-semibold transition-colors touch-target">
          {showForm ? <><X size={16} /> Đóng</> : <><Plus size={16} /> Tạo Race</>}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-5 mb-6 space-y-4">
          <h2 className="text-lg font-bold border-b border-border/50 pb-2 mb-4">
            {editingId ? 'Sửa Race' : 'Tạo Race Mới'}
          </h2>
          
          <div className="space-y-3">
            <input placeholder="Tên race" value={form.raceName} onChange={e => setForm(f => ({ ...f, raceName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-sm" />
            <input placeholder="Mô tả" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:border-accent-blue focus:outline-none text-sm" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Start Time</label>
                <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Close Bet Time</label>
                <input type="datetime-local" value={form.closeBetTime} onChange={e => setForm(f => ({ ...f, closeBetTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border focus:outline-none text-sm" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold">Danh sách Uma tham gia (Entries)</h3>
              <button onClick={addEntry} className="px-3 py-1.5 text-xs font-semibold bg-bg-tertiary border border-border rounded-lg hover:bg-white/5 flex items-center justify-center gap-1 touch-target sm:min-h-0">
                <Plus size={14} /> Thêm Uma
              </button>
            </div>
            
            <div className="space-y-2">
              {form.entries.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-[auto_1fr_auto] sm:flex gap-2 items-center bg-bg-tertiary/50 p-2 rounded-lg border border-border/50">
                  <span className="text-xs font-mono w-6 text-center text-text-muted">{idx + 1}</span>
                  <select 
                    value={entry.umaId} 
                    onChange={e => updateEntry(idx, 'umaId', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border focus:outline-none text-sm"
                  >
                    <option value="">-- Chọn Uma --</option>
                    {umas.map(u => {
                      const trainerName = u.trainerId ? (typeof u.trainerId === 'object' && u.trainerId !== null && 'name' in u.trainerId ? (u.trainerId as { name: string }).name : 'Có Trainer') : '';
                      return <option key={u._id} value={u._id}>{u.name} {trainerName ? `(${trainerName})` : ''}</option>;
                    })}
                  </select>
                  <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                    <label className="text-xs text-text-muted">Odd:</label>
                    <input 
                      type="number" step="0.1" min="1" value={entry.odd} 
                      onChange={e => updateEntry(idx, 'odd', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1.5 rounded-lg bg-bg-tertiary border border-border focus:outline-none text-sm" 
                    />
                  </div>
                  <button onClick={() => removeEntry(idx)} className="p-1.5 text-accent-red/60 hover:text-accent-red hover:bg-accent-red/10 rounded-md touch-target sm:min-h-0 sm:min-w-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.entries.length === 0 && (
                <p className="text-center text-xs text-text-muted py-4 italic">Chưa có Uma nào được thêm</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={save} disabled={saving} className="w-full sm:w-auto px-5 py-2.5 bg-accent-green text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 touch-target">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Lưu Race
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {races.map(race => {
          const trans = TRANSITIONS[race.state];
          const stateColor = STATE_COLORS[race.state] || 'text-text-muted';
          const canCancel = !['SETTLED', 'CANCELLED'].includes(race.state);
          return (
            <div key={race._id} className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-lg">{race.raceName}</p>
                <p className="text-xs text-text-muted mt-1">
                  Bắt đầu: {new Date(race.startTime).toLocaleString('vi-VN')} • Đóng cược: {new Date(race.closeBetTime).toLocaleString('vi-VN')}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-bg-tertiary uppercase border border-border ${stateColor}`}>
                    {race.state}
                  </span>
                  <span className="text-xs text-text-muted">{race.entries?.length || 0} Umas tham gia</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <button onClick={() => openEdit(race)} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-bg-tertiary border border-border hover:bg-white/5 transition-colors touch-target sm:min-h-0">
                    <Edit3 size={14} /> Sửa
                  </button>
                  <button onClick={() => handleDeleteRace(race._id, race.raceName)} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-accent-red border border-accent-red/30 hover:bg-accent-red/10 transition-colors touch-target sm:min-h-0">
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:flex gap-2">
                  {trans && (
                    <button onClick={() => transition(race._id, trans.next)}
                      className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white touch-target sm:min-h-0 ${trans.color}`}>
                      {trans.icon} {trans.label}
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => handleCancelRace(race._id, race.raceName)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent-red hover:bg-accent-red/80 transition-colors touch-target sm:min-h-0">
                      <Ban size={14} /> Hủy Race
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {races.length === 0 && <p className="text-text-muted text-center py-10">Chưa có race</p>}
      </div>
    </div>
  );
}
