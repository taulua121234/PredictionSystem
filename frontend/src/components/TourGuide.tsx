'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { useTourStore, TOUR_STEPS } from '@/stores/tourStore';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export default function TourGuide() {
  const { isTourActive, currentStep, nextStep, prevStep, skipTour } = useTourStore();
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  const calculatePosition = useCallback(() => {
    if (!isTourActive || currentStep >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[currentStep];
    const target = document.querySelector(step.targetSelector);

    if (!target) {
      // If target not found, try next step
      setIsReady(false);
      return;
    }

    const rect = target.getBoundingClientRect();
    setTargetRect(rect);

    const tooltipWidth = 380;
    const tooltipHeight = 280;
    const gap = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'top';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        arrowPosition = 'right';
        break;
    }

    // Clamp to viewport
    if (left < 12) left = 12;
    if (left + tooltipWidth > viewportWidth - 12) left = viewportWidth - tooltipWidth - 12;
    if (top < 12) top = 12;
    if (top + tooltipHeight > viewportHeight - 12) top = viewportHeight - tooltipHeight - 12;

    setTooltipPos({ top, left, arrowPosition });
    setIsReady(true);
  }, [isTourActive, currentStep]);

  useEffect(() => {
    if (!isTourActive) {
      return;
    }

    // Reset readiness asynchronously inside the timeout to avoid
    // synchronous setState within an effect body (React 19 lint rule).
    const timer = setTimeout(() => {
      setIsReady(false);
      // After a brief reset frame, recalculate position
      requestAnimationFrame(() => calculatePosition());
    }, 100);

    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isTourActive, currentStep, calculatePosition]);

  if (!isTourActive || !isReady || !tooltipPos || !targetRect) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200]" id="tour-overlay">
        {/* Dark overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#tour-mask)"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          />
        </svg>

        {/* Highlight ring around target */}
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 3px rgba(30, 144, 255, 0.6), 0 0 20px rgba(30, 144, 255, 0.3)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Pulsing ring animation */}
        <div
          className="absolute rounded-xl pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 10,
            left: targetRect.left - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
            border: '2px solid rgba(30, 144, 255, 0.3)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute z-[210] w-[380px] max-w-[calc(100vw-24px)]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {/* Arrow */}
          {tooltipPos.arrowPosition === 'top' && (
            <div
              className="absolute -top-2 w-4 h-4 rotate-45"
              style={{
                left: Math.min(
                  Math.max(targetRect.left + targetRect.width / 2 - tooltipPos.left - 8, 20),
                  350
                ),
                background: 'linear-gradient(135deg, #1c1c36, #22223d)',
                borderTop: '1px solid rgba(30, 144, 255, 0.4)',
                borderLeft: '1px solid rgba(30, 144, 255, 0.4)',
              }}
            />
          )}
          {tooltipPos.arrowPosition === 'right' && (
            <div
              className="absolute -right-2 w-4 h-4 rotate-45"
              style={{
                top: targetRect.top + targetRect.height / 2 - tooltipPos.top - 8,
                background: 'linear-gradient(135deg, #22223d, #1c1c36)',
                borderTop: '1px solid rgba(30, 144, 255, 0.4)',
                borderRight: '1px solid rgba(30, 144, 255, 0.4)',
              }}
            />
          )}

          <div
            className="rounded-2xl p-5 shadow-2xl"
            style={{
              background: 'linear-gradient(145deg, #1c1c36 0%, #22223d 100%)',
              border: '1px solid rgba(30, 144, 255, 0.35)',
              boxShadow: '0 0 30px rgba(30, 144, 255, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-accent-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">{step.title}</h3>
                  <span className="text-[11px] text-text-muted">
                    Bước {currentStep + 1} / {TOUR_STEPS.length}
                  </span>
                </div>
              </div>
              <button
                onClick={skipTour}
                className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                title="Bỏ qua hướng dẫn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mb-4">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i <= currentStep
                        ? 'linear-gradient(90deg, #1e90ff, #00e676)'
                        : 'rgba(42, 42, 74, 0.8)',
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line mb-5">
              {step.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={skipTour}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Bỏ qua
              </button>

              <div className="flex gap-2">
                {!isFirst && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:bg-bg-hover transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Trước
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-lg text-white transition-all"
                  style={{
                    background: isLast
                      ? 'linear-gradient(135deg, #00e676, #00c853)'
                      : 'linear-gradient(135deg, #1e90ff, #4da6ff)',
                    boxShadow: isLast
                      ? '0 4px 15px rgba(0, 230, 118, 0.3)'
                      : '0 4px 15px rgba(30, 144, 255, 0.3)',
                  }}
                >
                  {isLast ? (
                    <>
                      Hoàn tất! 🎉
                    </>
                  ) : (
                    <>
                      Tiếp theo
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
