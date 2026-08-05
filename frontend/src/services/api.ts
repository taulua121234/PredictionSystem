import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { BetPrediction, CreateRacePayload, CreateUmaPayload, CreateTrainerPayload, RaceResultPayload } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ==================== Auth API ====================

export const authApi = {
  loginWithTicket: (ticketCode: string) =>
    api.post('/auth/login-ticket', { ticketCode }),
  loginAdmin: (username: string, password: string) =>
    api.post('/auth/login-admin', { username, password }),
  getMe: () => api.get('/auth/me'),
  rename: (name: string) => api.put('/auth/me/rename', { name }).then((res) => res.data.data),
};

// ==================== Race API ====================

export const raceApi = {
  list: (state?: string) =>
    api.get('/races', { params: state ? { state } : {} }),
  getById: (id: string) => api.get(`/races/${id}`),
};

// ==================== Bet API ====================

export const betApi = {
  place: (data: { raceId: string; category: string; prediction: BetPrediction; amount: number }) =>
    api.post('/bets/place', data),
  history: (page = 1, limit = 20) =>
    api.get('/bets/history', { params: { page, limit } }),
  raceStats: (raceId: string) =>
    api.get(`/bets/race/${raceId}/stats`),
};

// ==================== Leaderboard API ====================

export const leaderboardApi = {
  income: (limit = 20) => api.get('/leaderboard/income', { params: { limit } }),
  roi: (limit = 20) => api.get('/leaderboard/roi', { params: { limit } }),
  points: (limit = 20) => api.get('/leaderboard/points', { params: { limit } }),
  stats: () => api.get('/leaderboard/stats'),
};

// ==================== Uma API ====================

export const umaApi = {
  list: (params?: { page?: number; limit?: number; search?: string; trainerId?: string }) =>
    api.get('/umas', { params }),
  getById: (id: string) => api.get(`/umas/${id}`),
};

// ==================== Admin API ====================

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  // Races
  createRace: (data: CreateRacePayload) => api.post('/admin/races', data),
  updateRace: (id: string, data: Partial<CreateRacePayload>) => api.put(`/admin/races/${id}`, data),
  changeRaceState: (id: string, state: string) =>
    api.patch(`/admin/races/${id}/state`, { state }),
  setRaceResult: (id: string, result: RaceResultPayload) =>
    api.patch(`/admin/races/${id}/result`, result),
  settleRace: (id: string) => api.post(`/admin/races/${id}/settle`),
  deleteRace: (id: string) => api.delete(`/admin/races/${id}`),
  cancelRace: (id: string) => api.post(`/admin/races/${id}/cancel`),
  // Umas
  createUma: (data: CreateUmaPayload) => api.post('/admin/umas', data),
  updateUma: (id: string, data: Partial<CreateUmaPayload>) => api.put(`/admin/umas/${id}`, data),
  deleteUma: (id: string) => api.delete(`/admin/umas/${id}`),
  uploadUmaInfoImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('infoImage', file);
    return api.post(`/admin/umas/${id}/info-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadUmaGallery: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('galleryImages', file));
    return api.post(`/admin/umas/${id}/gallery`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteUmaGalleryImage: (id: string, imageUrl: string) =>
    api.delete(`/admin/umas/${id}/gallery`, { data: { imageUrl } }),
  // Trainers
  getTrainers: () => api.get('/admin/trainers').then((res) => res.data),
  createTrainer: (data: CreateTrainerPayload) => api.post('/admin/trainers', data),
  updateTrainer: (id: string, data: Partial<CreateTrainerPayload>) => api.put(`/admin/trainers/${id}`, data),
  deleteTrainer: (id: string) => api.delete(`/admin/trainers/${id}`),
  // Users
  listUsers: (page = 1) => api.get('/admin/users', { params: { page } }),
  adjustPoints: (id: string, amount: number, description?: string) =>
    api.patch(`/admin/users/${id}/adjust-points`, { amount, description }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  toggleLockUser: (id: string) => api.patch(`/admin/users/${id}/lock`),
};
