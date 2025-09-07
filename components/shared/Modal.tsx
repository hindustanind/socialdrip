import React, { useEffect } from 'react';

declare global {
  interface Window {
    scrollLockCount?: number;
  }
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  closeOnBackdropClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, closeOnBackdropClick = true }) => {
  useEffect(() => {
    if (isOpen) {
      window.scrollLockCount = (window.scrollLockCount || 0) + 1;
      if (window.scrollLockCount === 1) {
        document.body.classList.add('no-scroll');
      }
    }

    return () => {
      if (isOpen) {
        window.scrollLockCount = Math.max(0, (window.scrollLockCount || 0) - 1);
        if (window.scrollLockCount === 0) {
          document.body.classList.remove('no-scroll');
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a0a37]/90 backdrop-blur-md backdrop-fade-in"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-[#1a0a37]/80 border border-[#00f2ff]/30 rounded-lg shadow-2xl shadow-[#00f2ff]/10 w-full max-w-4xl max-h-[90vh] flex flex-col relative page-transition-enter"
        style={{ animationDelay: '100ms', opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#00f2ff]/20">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">{title}</h2>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-transform duration-500 hover:rotate-90"
                aria-label="Close modal"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;