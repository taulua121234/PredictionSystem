'use client';

import { useEffect, useState } from 'react';
import { Edit3, Loader2, Lock, Trash2, Unlock } from 'lucide-react';
import { adminApi } from '@/services/api';
import type { BettingUser } from '@/types';
import { getErrorMessage } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<BettingUser[]>([]);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustAmt, setAdjustAmt] = useState(0);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const load = () => adminApi.listUsers().then(r => setUsers(r.data.data || []));
  useEffect(() => { load(); }, []);

  const adjust = async (id: string) => {
    if (!adjustAmt) return;
    setLoadingAction(`adjust-${id}`);
    try {
      await adminApi.adjustPoints(id, adjustAmt);
      setAdjustId(null);
      setAdjustAmt(0);
      load();
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const toggleLock = async (user: BettingUser) => {
    const actionStr = user.isLocked ? 'Mở khóa' : 'Khóa';
    if (!confirm(`Xác nhận ${actionStr} tài khoản ${user.username}?`)) return;

    setLoadingAction(`lock-${user._id}`);
    try {
      await adminApi.toggleLockUser(user._id);
      load();
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteUser = async (user: BettingUser) => {
    if (!confirm(`Xác nhận XÓA VĨNH VIỄN tài khoản ${user.username} và toàn bộ giao dịch liên quan?`)) return;

    setLoadingAction(`delete-${user._id}`);
    try {
      await adminApi.deleteUser(user._id);
      load();
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-6">User Management</h1>

      <div className="hidden md:block glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_100px_100px_200px] gap-0 text-xs font-semibold text-text-muted uppercase bg-bg-tertiary px-4 py-3">
          <span>Username</span>
          <span className="text-center">Tier</span>
          <span className="text-right">Points</span>
          <span className="text-right">Income</span>
          <span className="text-right">Hành động</span>
        </div>
        {users.map(u => (
          <UserDesktopRow
            key={u._id}
            user={u}
            adjustId={adjustId}
            adjustAmt={adjustAmt}
            loadingAction={loadingAction}
            onToggleAdjust={() => setAdjustId(adjustId === u._id ? null : u._id)}
            onAdjustAmount={setAdjustAmt}
            onAdjust={() => adjust(u._id)}
            onToggleLock={() => toggleLock(u)}
            onDelete={() => deleteUser(u)}
          />
        ))}
        {users.length === 0 && <p className="text-text-muted text-center py-10">Chưa có user</p>}
      </div>

      <div className="md:hidden space-y-3">
        {users.map(u => (
          <UserMobileCard
            key={u._id}
            user={u}
            adjustId={adjustId}
            adjustAmt={adjustAmt}
            loadingAction={loadingAction}
            onToggleAdjust={() => setAdjustId(adjustId === u._id ? null : u._id)}
            onAdjustAmount={setAdjustAmt}
            onAdjust={() => adjust(u._id)}
            onToggleLock={() => toggleLock(u)}
            onDelete={() => deleteUser(u)}
          />
        ))}
        {users.length === 0 && (
          <div className="glass rounded-xl p-6 text-center text-sm text-text-muted">Chưa có user</div>
        )}
      </div>
    </div>
  );
}

function UserDesktopRow({
  user,
  adjustId,
  adjustAmt,
  loadingAction,
  onToggleAdjust,
  onAdjustAmount,
  onAdjust,
  onToggleLock,
  onDelete,
}: UserRowProps) {
  const income = user.currentPoints - user.startingPoints;
  const isLocked = user.isLocked;

  return (
    <div className="border-t border-border">
      <div className={`grid grid-cols-[1fr_80px_100px_100px_200px] gap-0 items-center px-4 py-3 hover:bg-bg-hover transition-colors ${isLocked ? 'opacity-60 grayscale' : ''}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{user.username}</span>
          {isLocked && <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-red/20 text-accent-red font-bold">LOCKED</span>}
        </div>
        <span className="text-xs text-center text-text-muted">{user.tier}</span>
        <span className="text-sm text-right font-bold tabular-nums text-accent-yellow">{user.currentPoints?.toLocaleString()}</span>
        <span className={`text-sm text-right font-bold tabular-nums ${income >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {income >= 0 ? '+' : ''}{income.toLocaleString()}
        </span>
        <ActionButtons
          user={user}
          loadingAction={loadingAction}
          onToggleAdjust={onToggleAdjust}
          onToggleLock={onToggleLock}
          onDelete={onDelete}
        />
      </div>
      {adjustId === user._id && (
        <AdjustPanel
          userId={user._id}
          adjustAmt={adjustAmt}
          loadingAction={loadingAction}
          onAdjustAmount={onAdjustAmount}
          onAdjust={onAdjust}
          desktop
        />
      )}
    </div>
  );
}

function UserMobileCard(props: UserRowProps) {
  const { user, adjustId, adjustAmt, loadingAction, onAdjustAmount, onAdjust } = props;
  const income = user.currentPoints - user.startingPoints;
  const isLocked = user.isLocked;

  return (
    <div className={`glass rounded-xl p-4 ${isLocked ? 'opacity-70 grayscale' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm truncate">{user.username}</h2>
            {isLocked && <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-red/20 text-accent-red font-bold">LOCKED</span>}
          </div>
          <p className="text-xs text-text-muted mt-0.5">Tier: {user.tier}</p>
        </div>
        <ActionButtons {...props} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="rounded-lg bg-bg-tertiary border border-border p-3">
          <p className="text-[11px] text-text-muted">Points</p>
          <p className="text-base font-bold text-accent-yellow tabular-nums">{user.currentPoints?.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-bg-tertiary border border-border p-3">
          <p className="text-[11px] text-text-muted">Income</p>
          <p className={`text-base font-bold tabular-nums ${income >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {income >= 0 ? '+' : ''}{income.toLocaleString()}
          </p>
        </div>
      </div>

      {adjustId === user._id && (
        <AdjustPanel
          userId={user._id}
          adjustAmt={adjustAmt}
          loadingAction={loadingAction}
          onAdjustAmount={onAdjustAmount}
          onAdjust={onAdjust}
        />
      )}
    </div>
  );
}

function ActionButtons({ user, loadingAction, onToggleAdjust, onToggleLock, onDelete }: Pick<UserRowProps, 'user' | 'loadingAction' | 'onToggleAdjust' | 'onToggleLock' | 'onDelete'>) {
  const isLocked = user.isLocked;

  return (
    <div className="flex gap-1.5 justify-end">
      <button
        onClick={onToggleAdjust}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover border border-border touch-target md:min-h-0 md:min-w-0"
        title="Chỉnh điểm"
      >
        <Edit3 size={12} />
        <span className="hidden lg:inline">Chỉnh điểm</span>
      </button>
      <button
        onClick={onToggleLock}
        disabled={loadingAction === `lock-${user._id}`}
        className={`flex items-center justify-center w-10 h-10 md:w-7 md:h-7 rounded border ${isLocked ? 'bg-accent-green/10 text-accent-green border-accent-green/30 hover:bg-accent-green/20' : 'bg-accent-orange/10 text-accent-orange border-accent-orange/30 hover:bg-accent-orange/20'}`}
        title={isLocked ? 'Mở khóa user' : 'Khóa user'}
      >
        {loadingAction === `lock-${user._id}` ? <Loader2 size={12} className="animate-spin" /> : (isLocked ? <Unlock size={12} /> : <Lock size={12} />)}
      </button>
      <button
        onClick={onDelete}
        disabled={loadingAction === `delete-${user._id}`}
        className="flex items-center justify-center w-10 h-10 md:w-7 md:h-7 rounded border bg-accent-red/10 text-accent-red border-accent-red/30 hover:bg-accent-red/20"
        title="Xóa user"
      >
        {loadingAction === `delete-${user._id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      </button>
    </div>
  );
}

function AdjustPanel({ userId, adjustAmt, loadingAction, onAdjustAmount, onAdjust, desktop = false }: AdjustPanelProps) {
  return (
    <div className={`${desktop ? 'flex items-center justify-end' : 'grid grid-cols-[1fr_auto]'} gap-2 px-0 md:px-4 pt-3 md:pt-0 md:pb-3`}>
      <span className={`text-xs text-text-muted ${desktop ? '' : 'col-span-2'}`}>Nhập điểm +/-:</span>
      <input
        type="number"
        value={adjustAmt}
        onChange={e => onAdjustAmount(parseInt(e.target.value) || 0)}
        className="px-2 py-2 md:py-1 rounded bg-bg-tertiary border border-border text-sm w-full md:w-24 focus:outline-none focus:border-accent-blue"
        placeholder="+/-100"
      />
      <button
        onClick={onAdjust}
        disabled={loadingAction === `adjust-${userId}`}
        className="px-3 py-2 md:py-1.5 rounded bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold flex items-center gap-1 justify-center touch-target md:min-h-0"
      >
        {loadingAction === `adjust-${userId}` ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
      </button>
    </div>
  );
}

interface UserRowProps {
  user: BettingUser;
  adjustId: string | null;
  adjustAmt: number;
  loadingAction: string | null;
  onToggleAdjust: () => void;
  onAdjustAmount: (amount: number) => void;
  onAdjust: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

interface AdjustPanelProps {
  userId: string;
  adjustAmt: number;
  loadingAction: string | null;
  onAdjustAmount: (amount: number) => void;
  onAdjust: () => void;
  desktop?: boolean;
}
