'use client';
import { useState } from 'react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/types';
import { Loader2 } from 'lucide-react';

interface Props {
  onClose?: () => void;
  isOpen: boolean;
}

export default function RenameModal({ onClose, isOpen }: Props) {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('Tên phải có ít nhất 3 ký tự');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.rename(name);
      // Call onClose before updateUser so the tour can start before
      // hasChangedName=true unmounts this component
      if (onClose) onClose();
      if (user) {
        updateUser({ username: res.username, hasChangedName: res.hasChangedName });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-elevated border border-border p-6 rounded-xl w-full max-w-sm shadow-2xl animate-scale-in relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
            ✕
          </button>
        )}
        <h2 className="text-xl font-bold text-gradient mb-2">
          {onClose ? 'Đổi tên hiển thị' : 'Chào mừng bạn!'}
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          {onClose ? 'Nhập tên mới của bạn.' : 'Đây là lần đầu bạn đăng nhập, vui lòng chọn một tên hiển thị để bắt đầu.'}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg focus:outline-none focus:border-accent-blue"
            placeholder="Tên của bạn"
            maxLength={20}
          />
          {error && <p className="text-xs text-accent-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Xác nhận'}
          </button>
        </form>
      </div>
    </div>
  );
}
