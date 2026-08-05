'use client';

import { useEffect, useState, useRef } from 'react';
import NextImage from 'next/image';
import { adminApi, umaApi } from '@/services/api';
import type { Uma, CreateUmaPayload } from '@/types';
import { getErrorMessage } from '@/types';
import { Edit3, Trash2, X, Loader2, Save, ImagePlus, Trash, Images, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';

interface Trainer {
  _id: string;
  name: string;
}

function getUmaTrainerId(trainerId: any): string | null {
  if (!trainerId) return null;
  return typeof trainerId === 'string' ? trainerId : trainerId._id || null;
}

function getUmaTrainerName(trainerId: any, trainers: Trainer[]): string | null {
  if (!trainerId) return null;
  if (typeof trainerId === 'object' && trainerId.name) {
    return trainerId.name;
  }
  const id = typeof trainerId === 'string' ? trainerId : trainerId._id;
  const found = trainers.find(t => t._id === id);
  return found ? found.name : null;
}

export default function AdminUmasPage() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [umas, setUmas] = useState<Uma[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  
  const [editingUma, setEditingUma] = useState<Uma | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pagination & Filter state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Gallery management state
  const [galleryUma, setGalleryUma] = useState<Uma | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [umasRes, trainersRes] = await Promise.all([
        umaApi.list({ page, limit, search: searchTerm.trim() || undefined }),
        adminApi.getTrainers()
      ]);
      const resData = umasRes.data;
      if (resData?.pagination) {
        setUmas(resData.data || []);
        setTotal(resData.pagination.total);
        setTotalPages(resData.pagination.totalPages || 1);
      } else {
        const list = resData?.data || resData || [];
        setUmas(list);
        setTotal(list.length);
        setTotalPages(1);
      }
      setTrainers(trainersRes.data || trainersRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || user?.role !== 'admin') return;
    loadData();
  }, [_hasHydrated, isAuthenticated, user, page, limit, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(parseInt(e.target.value));
    setPage(1);
  };

  const handleEdit = (uma: Uma) => {
    const raw = JSON.parse(JSON.stringify(uma));
    raw.trainerId = getUmaTrainerId(uma.trainerId) || '';
    setEditingUma(raw);
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

  // Gallery handlers
  const openGallery = (uma: Uma) => {
    setGalleryUma(uma);
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !galleryUma) return;
    setUploadingGallery(true);
    try {
      const fileArray = Array.from(files);
      const res = await adminApi.uploadUmaGallery(galleryUma._id, fileArray);
      const updatedGallery = res.data?.data?.galleryImages || res.data?.galleryImages || [];
      setGalleryUma({ ...galleryUma, galleryImages: updatedGallery });
      loadData();
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryImage = async (imageUrl: string) => {
    if (!galleryUma) return;
    if (!confirm('Xóa ảnh này khỏi gallery?')) return;
    setDeletingImage(imageUrl);
    try {
      const res = await adminApi.deleteUmaGalleryImage(galleryUma._id, imageUrl);
      const updatedGallery = res.data?.data?.galleryImages || res.data?.galleryImages || [];
      setGalleryUma({ ...galleryUma, galleryImages: updatedGallery });
      loadData();
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setDeletingImage(null);
    }
  };

  const galleryCount = (uma: Uma) => (uma.galleryImages?.length || 0);

  // Pagination helper to build page numbers array
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🐴 Uma Management
            <span className="text-xs bg-accent-blue/10 text-accent-blue font-semibold px-2.5 py-1 rounded-full border border-accent-blue/20">
              Tổng: {total} Umas
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm theo tên Uma hoặc Trainer..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-bg-tertiary border border-border text-sm focus:border-accent-blue focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Limit Selector */}
          <select
            value={limit}
            onChange={handleLimitChange}
            className="px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-sm focus:border-accent-blue focus:outline-none cursor-pointer"
          >
            <option value={6}>6 / trang</option>
            <option value={9}>9 / trang</option>
            <option value={12}>12 / trang</option>
            <option value={18}>18 / trang</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent-blue" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {umas.map(uma => {
            const trainerName = getUmaTrainerName(uma.trainerId, trainers);
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
                        {trainerName ? `Thuộc: ${trainerName}` : 'Chưa có Trainer'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => openGallery(uma)} 
                      className="p-2 rounded-lg text-accent-green/80 hover:bg-accent-green/20 transition-colors relative"
                      title="Quản lý Gallery"
                    >
                      <Images size={16} />
                      {galleryCount(uma) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {galleryCount(uma)}
                        </span>
                      )}
                    </button>
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
            <div className="col-span-full text-center py-12 text-text-muted italic bg-bg-tertiary/50 rounded-lg border border-dashed border-border">
              {searchTerm ? `Không tìm thấy Uma hoặc Trainer nào khớp với từ khóa "${searchTerm}"` : 'Chưa có Uma nào được tạo trong hệ thống.'}
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {total > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 glass rounded-xl px-5 py-4 border border-border/50">
          <div className="text-xs text-text-muted">
            Hiển thị <span className="font-semibold text-text-primary">{total > 0 ? (page - 1) * limit + 1 : 0}</span> - <span className="font-semibold text-text-primary">{Math.min(page * limit, total)}</span> trên tổng số <span className="font-semibold text-text-primary">{total}</span> Umas
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev Button */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-lg bg-bg-tertiary border border-border hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-secondary"
              title="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Number Buttons */}
            {getPageNumbers().map((p, idx) => (
              typeof p === 'number' ? (
                <button
                  key={idx}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all ${
                    p === page
                      ? 'bg-accent-blue border-accent-blue text-white shadow-md'
                      : 'bg-bg-tertiary border-border text-text-secondary hover:bg-bg-hover hover:border-accent-blue/40'
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="px-1 text-xs text-text-muted">
                  ...
                </span>
              )
            ))}

            {/* Next Button */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg bg-bg-tertiary border border-border hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-secondary"
              title="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Uma Modal */}
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
                <p className="text-[11px] text-text-muted mt-1.5 italic">* Lưu ý: Một trainer chỉ được chứa tối đa 4 Umas.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">Chỉ số</label>
                <div className="grid grid-cols-5 gap-2">
                  {['speed', 'stamina', 'power', 'guts', 'wisdom'].map((stat) => (
                    <div key={stat}>
                      <label className="text-[10px] text-text-muted uppercase block text-center mb-1 font-medium">{stat.substring(0,3)}</label>
                      <input type="number" min={0} 
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

      {/* Gallery Management Modal */}
      {galleryUma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/50 shrink-0">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Images size={20} />
                  Gallery — {galleryUma.name}
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  {(galleryUma.galleryImages?.length || 0)} ảnh trong gallery
                </p>
              </div>
              <button onClick={() => setGalleryUma(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Upload section */}
            <div className="px-6 py-4 border-b border-border/30 shrink-0">
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleGalleryUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-accent-blue/50 bg-bg-tertiary/30 hover:bg-accent-blue/5 transition-all flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-accent-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploadingGallery ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang upload...
                  </>
                ) : (
                  <>
                    <ImagePlus size={16} />
                    Chọn ảnh để upload (có thể chọn nhiều ảnh)
                  </>
                )}
              </button>
              <p className="text-[10px] text-text-muted mt-1.5 text-center">
                Hỗ trợ: JPEG, PNG, WebP — Tối đa 5MB / ảnh
              </p>
            </div>

            {/* Gallery grid */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {(!galleryUma.galleryImages || galleryUma.galleryImages.length === 0) ? (
                <div className="text-center py-12 text-text-muted">
                  <Images size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm italic">Chưa có ảnh nào trong gallery</p>
                  <p className="text-xs mt-1">Nhấn nút phía trên để upload ảnh</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryUma.galleryImages.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-bg-tertiary">
                      <NextImage
                        src={url.startsWith('http') ? url : `http://localhost:3005${url}`}
                        alt={`${galleryUma.name} gallery ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {/* Delete overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleDeleteGalleryImage(url)}
                          disabled={deletingImage === url}
                          className="p-2.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white transition-colors shadow-lg disabled:opacity-60"
                          title="Xóa ảnh"
                        >
                          {deletingImage === url ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash size={16} />
                          )}
                        </button>
                      </div>
                      {/* Index badge */}
                      <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
