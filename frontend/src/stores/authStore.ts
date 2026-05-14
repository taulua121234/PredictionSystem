import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  tier: string;
  currentPoints: number;
  startingPoints: number;
  totalBet: number;
  totalPayout: number;
  role: 'user' | 'admin';
  hasChangedName?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updatePoints: (points: number) => void;
  updateUser: (data: Partial<User>) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (token, user) => set({
        token,
        user,
        isAuthenticated: true,
      }),

      logout: () => set({
        token: null,
        user: null,
        isAuthenticated: false,
      }),

      updatePoints: (points) => set((state) => ({
        user: state.user ? { ...state.user, currentPoints: points } : null,
      })),

      updateUser: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null,
      })),

      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'betting-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
