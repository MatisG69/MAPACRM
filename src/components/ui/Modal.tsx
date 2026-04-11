import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative rounded-t-[1.75rem] md:rounded-[1.5rem] border border-ws-line bg-ws-panel/98 backdrop-blur-xl shadow-dock w-full ${sizeClasses[size]} max-md:max-w-none max-h-[min(92dvh,calc(100vh-0.5rem))] md:max-h-[90vh] flex flex-col mt-auto md:mt-0 pb-[env(safe-area-inset-bottom)] md:pb-0`}
      >
        <div className="h-1 w-12 md:w-16 rounded-full bg-ws-accent mx-auto mt-3 opacity-90 flex-shrink-0" />
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-ws-line gap-3">
          <h2 id="modal-title" className="font-display text-base sm:text-lg font-bold text-white tracking-tight min-w-0 pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl text-ws-mist hover:text-white hover:bg-white/[0.06] transition-colors touch-manipulation"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 overscroll-contain px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
