'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import NextImage from 'next/image';

interface UmaInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  umaName: string;
  infoImageUrl?: string;
  galleryImages?: string[];
}

function resolveImageSrc(url: string): string {
  return url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3005'}${url}`;
}

export default function UmaInfoPopup({
  isOpen,
  onClose,
  umaName,
  infoImageUrl,
  galleryImages,
}: UmaInfoPopupProps) {
  // Build the full list of images: infoImageUrl first, then galleryImages
  const allImages: string[] = [];
  if (infoImageUrl) allImages.push(infoImageUrl);
  if (galleryImages) {
    galleryImages.forEach((url) => {
      if (!allImages.includes(url)) allImages.push(url);
    });
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when popup opens or images change
  useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  const totalImages = allImages.length;

  const goNext = useCallback(() => {
    if (totalImages > 1) {
      setCurrentIndex((prev) => (prev + 1) % totalImages);
    }
  }, [totalImages]);

  const goPrev = useCallback(() => {
    if (totalImages > 1) {
      setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
    }
  }, [totalImages]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  if (totalImages === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-2xl w-full max-h-[85vh] rounded-xl overflow-hidden glass border border-border-light shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with indicator */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">{umaName}</h3>
                {totalImages > 1 && (
                  <span className="text-xs text-text-muted bg-bg-tertiary px-2.5 py-1 rounded-full font-medium">
                    {currentIndex + 1} / {totalImages}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image slider */}
            <div className="relative overflow-hidden max-h-[calc(85vh-56px)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-auto max-h-[calc(85vh-56px)]"
                >
                  <NextImage
                    src={resolveImageSrc(allImages[currentIndex])}
                    alt={`${umaName} - ảnh ${currentIndex + 1}`}
                    width={800}
                    height={600}
                    className="w-full h-auto object-contain"
                    unoptimized
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation arrows */}
              {totalImages > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all backdrop-blur-sm border border-white/10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all backdrop-blur-sm border border-white/10"
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Dot indicators */}
            {totalImages > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-2.5 bg-bg-tertiary/50 border-t border-border/50">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      idx === currentIndex
                        ? 'bg-accent-blue w-5'
                        : 'bg-text-muted/40 hover:bg-text-muted/60'
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
