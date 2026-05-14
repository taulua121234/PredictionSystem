'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import NextImage from 'next/image';

interface UmaInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  umaName: string;
  infoImageUrl?: string;
}

export default function UmaInfoPopup({ isOpen, onClose, umaName, infoImageUrl }: UmaInfoPopupProps) {
  if (!infoImageUrl) return null;

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
            className="relative max-w-2xl max-h-[85vh] rounded-xl overflow-hidden glass border border-border-light shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/50">
              <h3 className="font-bold text-lg">{umaName}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image */}
            <div className="overflow-auto max-h-[calc(85vh-56px)]">
              <NextImage
                src={infoImageUrl.startsWith('http') ? infoImageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3005'}${infoImageUrl}`}
                alt={`${umaName} info`}
                width={800}
                height={600}
                className="w-full h-auto object-contain"
                unoptimized
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
