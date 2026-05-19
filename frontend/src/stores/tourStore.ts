import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TourState {
  hasCompletedTour: boolean;
  isTourActive: boolean;
  currentStep: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
}

export const TOUR_STEPS = [
  {
    targetSelector: '[data-tour="nav-tabs"]',
    title: '📍 Điều hướng',
    description: 'Đây là thanh điều hướng chính. Bạn có thể di chuyển giữa các trang: Races (danh sách các cuộc đua), Leaderboard (bảng xếp hạng), và History (lịch sử cược của bạn).',
    position: 'bottom' as const,
  },
  {
    targetSelector: '[data-tour="leaderboard-preview"]',
    title: '🏆 Bảng xếp hạng',
    description: 'Đây là bảng xếp hạng Top Players. Có 3 tab xếp hạng:\n• Income — Xếp theo lợi nhuận ròng (điểm kiếm được trừ đi điểm đặt cược)\n• ROI — Xếp theo tỷ suất lợi nhuận (% hiệu quả đầu tư)\n• Points — Xếp theo tổng điểm hiện có',
    position: 'left' as const,
  },
  {
    targetSelector: '[data-tour="user-menu"]',
    title: '✏️ Đổi tên hiển thị',
    description: 'Click vào avatar/tên của bạn để mở menu. Tại đây bạn có thể đổi tên hiển thị bất cứ lúc nào. Tên sẽ hiển thị trên bảng xếp hạng cho mọi người thấy!',
    position: 'bottom' as const,
  },
  {
    targetSelector: '[data-tour="points-display"]',
    title: '💰 Điểm của bạn',
    description: 'Đây là số điểm hiện tại của bạn. Bạn sẽ sử dụng điểm này để đặt cược. Lưu ý: mỗi lần cược tối đa 70% số điểm hiện có.',
    position: 'bottom' as const,
  },
  {
    targetSelector: '[data-tour="active-races"]',
    title: '🎯 Cách đặt cược',
    description: 'Để đặt cược, click vào một cuộc đua đang mở (🔥 Đang mở cược). Trong trang chi tiết race:\n\n1. Chọn loại cược: Uma Win (dự đoán Uma chiến thắng), Trainer Win (dự đoán Trainer chiến thắng), hoặc Trifecta (dự đoán top 3)\n2. Chọn Uma/Trainer bạn muốn cược\n3. Nhập số điểm cược\n4. Bấm "Đặt cược" để xác nhận\n\nOdds càng cao = thắng càng nhiều nhưng xác suất thấp hơn!',
    position: 'bottom' as const,
  },
];

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      isTourActive: false,
      currentStep: 0,

      startTour: () => set({ isTourActive: true, currentStep: 0 }),

      nextStep: () =>
        set((state) => {
          const next = state.currentStep + 1;
          if (next >= TOUR_STEPS.length) {
            return { isTourActive: false, hasCompletedTour: true, currentStep: 0 };
          }
          return { currentStep: next };
        }),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        })),

      goToStep: (step) => set({ currentStep: step }),

      completeTour: () =>
        set({ isTourActive: false, hasCompletedTour: true, currentStep: 0 }),

      skipTour: () =>
        set({ isTourActive: false, hasCompletedTour: true, currentStep: 0 }),

      resetTour: () =>
        set({ hasCompletedTour: false, isTourActive: false, currentStep: 0 }),
    }),
    {
      name: 'betting-tour',
    }
  )
);
