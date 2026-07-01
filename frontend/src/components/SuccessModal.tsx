import { useEffect, useRef } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function SuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    closeBtnRef.current?.focus();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-navy-light rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center"
        role="alertdialog"
        aria-modal="true"
        aria-label="Request received"
      >
        {/* Success Icon */}
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-white mb-3">Request received!</h3>

        <p className="text-sm text-brand-grey leading-relaxed mb-6">
          {message}
        </p>

        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-orange text-white hover:bg-orange-dark transition cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}
