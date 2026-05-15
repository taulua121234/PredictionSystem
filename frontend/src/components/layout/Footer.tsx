'use client';

import { ShieldAlert } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-bg-primary py-8 px-4 mt-auto mb-16 md:mb-0">
      <div className="max-w-[1600px] mx-auto">
        <div className="glass rounded-2xl p-6 md:p-8 flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Disclaimer</span>
          </div>
          
          <p className="text-sm md:text-base text-text-secondary max-w-3xl font-medium leading-relaxed italic">
            "Điểm trong trang web này chỉ phục vụ mục đích xếp hạng và không quy đổi thành tiền mặt dưới mọi hình thức"
          </p>
          
          <div className="pt-6 border-t border-border/50 w-full flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-text-muted uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏇</span>
              <span className="font-bold">Uma Betting Platform</span>
            </div>
            
            <div className="flex items-center gap-6">
              <span>© {new Date().getFullYear()} EViENT</span>
              <span className="hidden md:block">Real-time Prediction System</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
